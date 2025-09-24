import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface JoinResponse {
  ok: boolean;
  error?: string;
  participants?: number;
  role?: 'doctor' | 'patient';
}

export interface FaceScanData {
  type: 'face-scan-results';
  results: any;
  status: string;
}

export interface FaceScanStatus {
  type: 'face-scan-status';
  status: string;
  timestamp: number;
  prescriptionData?: any; // Optional prescription data
  diagnosisData?: any; // Optional diagnosis data
  labRequestData?: any; // Optional lab request data
  appointmentData?: any; // Optional appointment data
}

export interface FaceScanRequest {
  type: 'face-scan-request';
  roomId: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class WebRTCService {
  private socket?: Socket;
  private peer?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private currentRoomId?: string;
  private currentRole?: 'doctor' | 'patient';
  // Observable for remote stream changes
  private remoteStreamSubject = new BehaviorSubject<MediaStream | undefined>(undefined);
  public remoteStream$ = this.remoteStreamSubject.asObservable();
  
  // Data channel for face scan communication
  private dataChannel?: RTCDataChannel;
  private dataChannelSubject = new BehaviorSubject<FaceScanData | FaceScanStatus | FaceScanRequest | undefined>(undefined);
  public dataChannel$ = this.dataChannelSubject.asObservable();
  
  // Signaling state management
  private isNegotiating = false;
  private lastOffer?: RTCSessionDescriptionInit;
  private lastAnswer?: RTCSessionDescriptionInit;

  constructor(
    private zone: NgZone,
    private authService: AuthService
  ) {}

  private getSignalingUrl(): string {
    // Prefer explicit signaling URL overrides
    const anyEnv = environment as any;
    const explicit = anyEnv.webrtcSignalingUrl || anyEnv.signalingUrl || anyEnv.socketUrl;
    if (explicit && typeof explicit === 'string') {
      console.log('🔗 Using explicit signaling URL:', explicit);
      return explicit;
    }
    // Fallback: derive from backendApi by stripping trailing /api
    if (environment.backendApi) {
      const derivedUrl = environment.backendApi.replace(/\/?api\/?$/, '');
      console.log('🔗 Using derived signaling URL:', derivedUrl);
      return derivedUrl;
    }
    // Final fallback with environment detection
    const fallbackUrl = environment.production ? 'https://qhealth-backend-v2.onrender.com' : 'http://localhost:3000';
    console.log('🔗 Using fallback signaling URL:', fallbackUrl);
    return fallbackUrl;
  }

  initSocket(signalingUrl?: string): void {
    const url = signalingUrl || this.getSignalingUrl();
    console.log('🔌 Connecting to Socket.IO server:', url);
    
    // Get token from AuthService instead of localStorage
    const token = this.authService.accessToken;
    console.log('🔑 User token:', token ? 'Present' : 'Missing');
    console.log('👤 Current user:', this.authService.currentUserValue);
    
    if (!this.socket) {
      this.socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        timeout: 10000, // Increased timeout for production
        withCredentials: true,
        auth: token ? { token } : undefined,
        // Production-specific configuration
        forceNew: true,
        upgrade: true,
        rememberUpgrade: true,
        // Enhanced error handling for production
        autoConnect: true,
      });
    } else {
      // Update auth and attempt reconnection if not connected
      (this.socket as any).auth = token ? { token } : undefined;
      if (!this.socket.connected) {
        try { this.socket.connect(); } catch {}
      }
    }
    
    // Add connection event listeners for debugging
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      console.log('🌐 Connection URL:', url);
      console.log('🔧 Environment:', environment.production ? 'Production' : 'Development');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.error('🌐 Failed URL:', url);
      console.error('🔧 Environment:', environment.production ? 'Production' : 'Development');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });
    
    this.registerSocketHandlers();
  }

  private waitForSocketConnected(timeoutMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }
      let settled = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      const onConnect = () => {
        if (settled) return;
        settled = true;
        this.socket?.off('connect_error', onError);
        resolve();
      };
      
      const onError = (err: any) => {
        console.error('❌ Socket connect error (attempt', retryCount + 1, '):', err);
        retryCount++;
        
        // If we haven't exceeded max retries and haven't settled, try to reconnect
        if (retryCount < maxRetries && !settled) {
          console.log('🔄 Attempting to reconnect...');
          setTimeout(() => {
            if (this.socket && !this.socket.connected) {
              try {
                this.socket.connect();
              } catch (reconnectErr) {
                console.error('❌ Reconnection failed:', reconnectErr);
              }
            }
          }, 2000 * retryCount); // Exponential backoff
        }
      };
      
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        reject(new Error(`Socket connect timeout after ${timeoutMs}ms and ${retryCount} retries`));
      }, timeoutMs);
      
      this.socket?.once('connect', () => {
        clearTimeout(timer);
        onConnect();
      });
      this.socket?.on('connect_error', onError);
    });
  }

  async initPeer(config?: RTCConfiguration): Promise<void> {
    if (this.peer) return;
    
    // Enhanced ICE servers with TURN for NAT traversal
    const defaultIceServers: RTCIceServer[] = [
      // Google STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Additional STUN servers for better connectivity
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voiparound.com' },
      { urls: 'stun:stun.voipbuster.com' },
      { urls: 'stun:stun.voipstunt.com' },
      { urls: 'stun:stun.counterpath.com' },
      { urls: 'stun:stun.1und1.de' },
      // Free TURN servers (these may have limitations but help with NAT traversal)
      {
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
      },
      {
        urls: 'turn:192.158.29.39:3478?transport=udp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      },
      {
        urls: 'turn:192.158.29.39:3478?transport=tcp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      }
    ];
    
    // Allow optional TURN/STUN overrides via environment
    const envIceServers = (environment as any).webrtcIceServers as RTCIceServer[] | undefined;
    const defaultConfig: RTCConfiguration = config ?? {
      iceServers: envIceServers?.length ? envIceServers : defaultIceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      // Enhanced configuration for production and remote connections
      iceTransportPolicy: 'all'
    };
    this.peer = new RTCPeerConnection(defaultConfig);
    this.remoteStream = new MediaStream();

    // If we already have a local stream (from a previous session), attach its tracks to the new peer
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          try { this.peer?.addTrack(track, this.localStream!); } catch {}
        });
      }
    } catch {}

    // Create data channel for face scan communication
    this.createDataChannel();

    this.peer.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        console.log('🧊 ICE candidate found:', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
        
        this.socket?.emit('webrtc:ice-candidate', {
          roomId: this.currentRoomId,
          candidate: event.candidate,
        });
      } else if (event.candidate === null) {
        console.log('🧊 ICE gathering complete');
      }
    };

    this.peer.ontrack = (event) => {
      console.log('🎥 Track received:', event.track.kind, event.streams);
      console.log('📊 Track details:', {
        id: event.track.id,
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streamsCount: event.streams?.length || 0
      });
      
      this.zone.run(() => {
        // Always use the aggregate stream approach for better compatibility
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        
        try {
          // Add the track to our aggregate stream
          this.remoteStream.addTrack(event.track);
          console.log('➕ Added remote track to aggregate stream:', {
            trackId: event.track.id,
            kind: event.track.kind,
            enabled: event.track.enabled,
            readyState: event.track.readyState
          });
          
          // Update the stream state
          console.log('📹 Remote stream tracks now:', this.remoteStream.getTracks().map(t => ({
            id: t.id,
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState
          })));
          
          // Notify subscribers immediately
          this.remoteStreamSubject.next(this.remoteStream);
          
          // Log stream state for debugging
          console.log('🔍 Remote stream state after track addition:', {
            streamId: this.remoteStream.id,
            active: this.remoteStream.active,
            tracksCount: this.remoteStream.getTracks().length,
            hasAudio: this.remoteStream.getAudioTracks().length > 0,
            hasVideo: this.remoteStream.getVideoTracks().length > 0
          });
          
        } catch (e) {
          console.error('❌ Failed to add remote track to stream:', e);
        }
      });
    };

    // Add connection state change handler with enhanced monitoring
    this.peer.onconnectionstatechange = async () => {
      const state = this.peer?.connectionState;
      const iceState = this.peer?.iceConnectionState;
      console.log('🔗 Peer connection state changed:', state, 'ICE state:', iceState);
      
      if (state === 'failed') {
        console.warn('⚠️ Connection failed. Attempting ICE restart...');
        try {
          await this.attemptIceRestart();
        } catch (e) {
          console.error('❌ ICE restart failed:', e);
          // If ICE restart fails, try to reinitialize the connection
          setTimeout(async () => {
            console.log('🔄 Attempting connection recovery...');
            try {
              await this.triggerNegotiation();
            } catch (err) {
              console.error('❌ Connection recovery failed:', err);
              // Last resort: try to recreate the peer connection
              setTimeout(async () => {
                console.log('🔄 Attempting peer recreation...');
                try {
                  await this.recreatePeerConnection();
                } catch (recreateErr) {
                  console.error('❌ Peer recreation failed:', recreateErr);
                }
              }, 5000);
            }
          }, 2000);
        }
      } else if (state === 'disconnected') {
        console.warn('⚠️ Connection disconnected. Waiting for reconnection...');
        // Give some time for automatic reconnection before attempting ICE restart
        setTimeout(async () => {
          if (this.peer?.connectionState === 'disconnected') {
            console.log('🔄 Still disconnected, attempting ICE restart...');
            try {
              await this.attemptIceRestart();
            } catch (e) {
              console.error('❌ ICE restart failed:', e);
            }
          }
        }, 3000);
      } else if (state === 'connected') {
        console.log('✅ Connection established successfully');
        // Start connection quality monitoring
        this.startConnectionQualityMonitoring();
      } else if (state === 'connecting') {
        console.log('🔄 Connection in progress...');
      }
    };

    // Add ICE connection state change handler
    this.peer.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed:', this.peer?.iceConnectionState);
    };

    // Add data channel handler
    this.peer.ondatachannel = (event) => {
      console.log('📡 Data channel received:', event.channel.label);
      this.handleDataChannel(event.channel);
    };

    // Renegotiate when needed (e.g., after tracks are (re)added)
    this.peer.onnegotiationneeded = async () => {
      try {
        console.log('🧩 onnegotiationneeded fired, creating offer...');
        // Prevent multiple simultaneous negotiations
        if (this.isNegotiating) {
          console.log('⚠️ Already negotiating, skipping onnegotiationneeded');
          return;
        }
        await this.createAndSendOffer();
      } catch (e) {
        console.error('❌ Failed to renegotiate onnegotiationneeded:', e);
        this.isNegotiating = false;
      }
    };
  }

  private createDataChannel(): void {
    if (!this.peer) return;
    
    try {
      // Create data channel for face scan communication
      this.dataChannel = this.peer.createDataChannel('face-scan-channel', {
        ordered: true,
        maxRetransmits: 3
      });
      
      this.dataChannel.onopen = () => {
        console.log('📡 Data channel opened for face scan communication');
        console.log('📡 Data channel ready state:', this.dataChannel?.readyState);
        console.log('📡 Data channel label:', this.dataChannel?.label);
        
        // Notify that data channel is ready
        this.zone.run(() => {
          this.dataChannelSubject.next({
            type: 'face-scan-status',
            status: 'data-channel-ready',
            timestamp: Date.now()
          });
        });
        
        // Send initial handshake message to verify connectivity
        setTimeout(() => {
          if (this.dataChannel?.readyState === 'open') {
            console.log('📡 Sending data channel handshake...');
            try {
              this.dataChannel.send(JSON.stringify({
                type: 'handshake',
                timestamp: Date.now(),
                role: this.currentRole
              }));
              console.log('✅ Data channel handshake sent successfully');
            } catch (error) {
              console.error('❌ Failed to send data channel handshake:', error);
            }
          }
        }, 1000);
      };
      
      this.dataChannel.onclose = () => {
        console.log('📡 Data channel closed');
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('📡 Data channel error:', error);
        // Attempt to recreate data channel on error
        setTimeout(() => {
          if (this.peer && this.peer.connectionState === 'connected') {
            console.log('🔄 Attempting to recreate data channel...');
            this.createDataChannel();
          }
        }, 2000);
      };
      
      this.dataChannel.onmessage = (event) => {
        try {
          const data: FaceScanData | FaceScanStatus | FaceScanRequest = JSON.parse(event.data);
          console.log('📡 Data channel message received:', data);
          this.zone.run(() => {
            this.dataChannelSubject.next(data);
          });
        } catch (error) {
          console.error('📡 Error parsing data channel message:', error);
        }
      };
      
      console.log('📡 Data channel created successfully');
    } catch (error) {
      console.error('📡 Error creating data channel:', error);
    }
  }

  private handleDataChannel(datachannel: RTCDataChannel): void {
    datachannel.onopen = () => {
      console.log('📡 Remote data channel opened');
    };
    
    datachannel.onclose = () => {
      console.log('📡 Remote data channel closed');
    };
    
    datachannel.onerror = (error) => {
      console.error('📡 Remote data channel error:', error);
    };
    
    datachannel.onmessage = (event) => {
      try {
        const data: FaceScanData = JSON.parse(event.data);
        console.log('📡 Remote data channel message received:', data);
        this.zone.run(() => {
          this.dataChannelSubject.next(data);
        });
      } catch (error) {
        console.error('📡 Error parsing remote data channel message:', error);
      }
    };
  }

  async getUserMedia(constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream.getTracks().forEach((track) => this.peer?.addTrack(track, this.localStream!));
    return this.localStream;
  }

  getLocalStream(): MediaStream | undefined { return this.localStream; }
  getRemoteStream(): MediaStream | undefined { 
    // Emit current value when requested
    this.remoteStreamSubject.next(this.remoteStream);
    return this.remoteStream; 
  }
  getCurrentRoomId(): string | undefined { return this.currentRoomId; }
  getCurrentRole(): 'doctor' | 'patient' | undefined { return this.currentRole; }

  // Debug methods for connection status
  getSocketStatus(): string {
    return this.socket?.connected ? 'Connected' : 'Disconnected';
  }

  getPeerStatus(): string {
    return this.peer?.connectionState || 'Not Ready';
  }

  getDataChannelStatus(): string {
    return this.dataChannel?.readyState || 'Not Ready';
  }

  // Enhanced debug information for troubleshooting remote connections
  getConnectionDebugInfo(): any {
    return {
      socket: {
        connected: this.socket?.connected || false,
        id: this.socket?.id || 'N/A',
        url: this.getSignalingUrl()
      },
      peer: {
        connectionState: this.peer?.connectionState || 'Not Ready',
        iceConnectionState: this.peer?.iceConnectionState || 'Not Ready',
        iceGatheringState: this.peer?.iceGatheringState || 'Not Ready',
        signalingState: this.peer?.signalingState || 'Not Ready'
      },
      streams: {
        localStream: !!this.localStream,
        remoteStream: !!this.remoteStream,
        localTracks: this.localStream?.getTracks().length || 0,
        remoteTracks: this.remoteStream?.getTracks().length || 0
      },
      dataChannel: {
        readyState: this.dataChannel?.readyState || 'Not Ready',
        label: this.dataChannel?.label || 'N/A'
      },
      room: {
        roomId: this.currentRoomId || 'N/A',
        role: this.currentRole || 'N/A'
      },
      environment: {
        production: environment.production,
        signalingUrl: this.getSignalingUrl(),
        iceServersCount: (environment as any).webrtcIceServers?.length || 0
      }
    };
  }

  // Log comprehensive debug information
  logDebugInfo(): void {
    const debugInfo = this.getConnectionDebugInfo();
    console.log('🔍 WebRTC Debug Information:', debugInfo);
    
    // Additional peer connection stats if available
    if (this.peer) {
      this.peer.getStats().then((stats) => {
        console.log('📊 Peer Connection Stats:');
        stats.forEach((report) => {
          console.log(`  ${report.type}:`, report);
        });
      }).catch((error) => {
        console.error('❌ Error getting peer stats:', error);
      });
    }
  }

  // Send face scan results via data channel
  sendFaceScanResults(results: any, status: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const data: FaceScanData = {
        type: 'face-scan-results',
        results,
        status
      };
      
      try {
        this.dataChannel.send(JSON.stringify(data));
        console.log('📡 Face scan results sent via data channel:', data);
      } catch (error) {
        console.error('📡 Error sending face scan results:', error);
      }
    } else {
      console.warn('📡 Data channel not ready for sending face scan results');
    }
  }

  // Send face scan request to patient via data channel
  sendFaceScanRequest(request: FaceScanRequest): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(request));
        console.log('📡 Face scan request sent via data channel:', request);
      } catch (error) {
        console.error('📡 Error sending face scan request:', error);
      }
    } else {
      console.warn('📡 Data channel not ready for sending face scan request');
    }
  }

  // Send face scan status update via data channel
  sendFaceScanStatus(status: FaceScanStatus): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(status));
        console.log('📡 Face scan status sent via data channel:', status);
      } catch (error) {
        console.error('📡 Error sending face scan status:', error);
      }
    } else {
      console.warn('📡 Data channel not ready for sending face scan status');
    }
  }

  // Send patient information via data channel
  sendPatientInfo(patientInfo: { type: 'patient-info'; patientName: string; patientId: number; email?: string; timestamp: number }): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(patientInfo));
        console.log('📡 Patient info sent via data channel:', patientInfo);
      } catch (error) {
        console.error('📡 Error sending patient info:', error);
      }
    } else {
      console.warn('📡 Data channel not ready for sending patient info, current state:', this.dataChannel?.readyState);
    }
  }

  // Check if data channel is ready
  isDataChannelReady(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  // Wait for data channel to be ready
  waitForDataChannel(timeoutMs = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.dataChannel?.readyState === 'open') {
        resolve(true);
        return;
      }
      
      let settled = false;
      const onOpen = () => {
        if (settled) return;
        settled = true;
        this.dataChannel?.removeEventListener('open', onOpen);
        resolve(true);
      };
      
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.dataChannel?.removeEventListener('open', onOpen);
        console.warn('⚠️ Data channel timeout after', timeoutMs, 'ms');
        resolve(false);
      }, timeoutMs);
      
      if (this.dataChannel) {
        this.dataChannel.addEventListener('open', onOpen);
      } else {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  // Wait for remote stream to have active tracks
  waitForRemoteTracks(timeoutMs = 15000): Promise<boolean> {
    return new Promise((resolve) => {
      const checkForTracks = () => {
        if (this.remoteStream && this.remoteStream.getTracks().length > 0) {
          const tracks = this.remoteStream.getTracks();
          const activeTracks = tracks.filter(track => track.readyState === 'live');
          if (activeTracks.length > 0) {
            console.log('✅ Remote tracks are active:', activeTracks.map(t => ({ kind: t.kind, id: t.id })));
            resolve(true);
            return;
          }
        }
        
        // Continue checking
        setTimeout(checkForTracks, 500);
      };
      
      // Start checking immediately
      checkForTracks();
      
      // Timeout after specified time
      setTimeout(() => {
        console.warn('⚠️ Remote tracks timeout after', timeoutMs, 'ms');
        resolve(false);
      }, timeoutMs);
    });
  }

  // Send doctor information via data channel
  sendDoctorInfo(doctorInfo: { type: 'doctor-info'; doctorName: string; specialization?: string; bio?: string; doctorId?: number; timestamp: number }): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(doctorInfo));
        console.log('📡 Doctor info sent via data channel:', doctorInfo);
      } catch (error) {
        console.error('📡 Error sending doctor info:', error);
      }
    } else {
      console.warn('📡 Data channel not ready for sending doctor info');
    }
  }

  join(roomId: string): Promise<JoinResponse> {
    this.currentRoomId = roomId;
    console.log('🚪 Attempting to join room:', roomId);
    console.log('🔌 Socket connected:', this.socket?.connected);
    
    // Ensure socket is initialized and connected before joining
    if (!this.socket) {
      this.initSocket();
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        // Wait longer for connection in remote scenarios
        await this.waitForSocketConnected(15000);
      } catch (e) {
        console.warn('⚠️ Socket connection timeout, but proceeding with join attempt:', e);
      }
      
      // Set a timeout for the join operation itself
      const joinTimeout = setTimeout(() => {
        reject(new Error('Join operation timed out'));
      }, 10000);
      
      this.socket?.emit('webrtc:join', { roomId }, (resp: JoinResponse) => {
        clearTimeout(joinTimeout);
        console.log('📨 Join response received:', resp);
        
        if (resp?.ok && resp.role) {
          this.currentRole = resp.role;
          console.log('✅ Joined room successfully:', { roomId, role: this.currentRole, participants: resp?.participants });
          resolve(resp);
        } else {
          console.error('❌ Failed to join room:', resp?.error || 'Unknown error');
          reject(new Error(resp?.error || 'Failed to join room'));
        }
      });
    });
  }

  private registerSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('webrtc:peer-joined', async (data: { socketId: string; role: string }) => {
      console.log('👥 Peer joined:', data);
      if (!this.peer) await this.initPeer();
      
      // Wait a bit for the peer to be ready, then create and send offer
      setTimeout(async () => {
        console.log('📤 Creating and sending offer...');
        try {
          await this.createAndSendOffer();
          console.log('✅ Offer sent successfully');
        } catch (error) {
          console.error('❌ Error creating/sending offer:', error);
        }
      }, 1000);
    });

    this.socket.on('webrtc:offer', async ({ sdp }) => {
      console.log('📥 Received offer:', sdp);
      if (!this.peer) await this.initPeer();
      
      // Prevent duplicate processing
      if (this.isNegotiating) {
        console.log('⚠️ Already negotiating, ignoring duplicate offer');
        return;
      }
      
      try {
        this.isNegotiating = true;
        
        // Check if this is a duplicate offer
        if (this.lastOffer && this.lastOffer.sdp === sdp.sdp) {
          console.log('⚠️ Duplicate offer received, ignoring');
          this.isNegotiating = false;
          return;
        }
        
        this.lastOffer = sdp;
        
        // Ensure local tracks are attached to current peer before answering
        try {
          if (this.localStream && this.peer) {
            const senders = this.peer.getSenders();
            this.localStream.getTracks().forEach((track) => {
              const hasSender = senders.some((s) => s.track && s.track.kind === track.kind);
              if (!hasSender) {
                try { this.peer!.addTrack(track, this.localStream!); } catch {}
              }
            });
          }
        } catch {}

        await this.peer!.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('✅ Remote description set successfully');
        
        const answer = await this.peer!.createAnswer();
        console.log('📝 Answer created:', answer);
        
        await this.peer!.setLocalDescription(answer);
        console.log('✅ Local description set successfully');
        
        this.lastAnswer = answer;
        
        console.log('📤 Sending answer:', answer);
        if (this.currentRoomId) {
          this.socket?.emit('webrtc:answer', { roomId: this.currentRoomId, sdp: answer });
          console.log('✅ Answer sent successfully');
        }
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      } finally {
        this.isNegotiating = false;
      }
    });

    this.socket.on('webrtc:answer', async ({ sdp }) => {
      console.log('📥 Received answer:', sdp);
      if (!this.peer) return;
      
      try {
        // Check current signaling state before setting remote description
        const currentState = this.peer.signalingState;
        console.log('🔍 Current signaling state:', currentState);
        
        // Check if this is a duplicate answer
        if (this.lastAnswer && this.lastAnswer.sdp === sdp.sdp) {
          console.log('⚠️ Duplicate answer received, ignoring');
          return;
        }
        
        // Only set remote description if we're in the right state
        if (currentState === 'have-local-offer' || currentState === 'have-remote-pranswer') {
          await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log('✅ Remote description (answer) set successfully');
          console.log('🔗 Connection should now be established');
          this.lastAnswer = sdp;
        } else {
          console.warn('⚠️ Ignoring answer - wrong signaling state:', currentState);
        }
      } catch (error) {
        console.error('❌ Error handling answer:', error);
        // If there's an SDP mismatch, try to recover
        if (error instanceof Error && error.message?.includes('m-lines')) {
          console.log('🔄 SDP m-line mismatch detected, attempting recovery...');
          try {
            await this.attemptConnectionRecovery();
          } catch (recoveryError) {
            console.error('❌ Connection recovery failed:', recoveryError);
          }
        }
      }
    });

    this.socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      console.log('🧊 Received ICE candidate:', candidate);
      if (!this.peer || !candidate) return;
      
      try {
        // Check if remote description is set before adding ICE candidates
        if (this.peer.remoteDescription) {
          await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ ICE candidate added successfully');
        } else {
          console.warn('⚠️ Ignoring ICE candidate - no remote description set yet');
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    });

    this.socket.on('webrtc:peer-left', () => {
      console.log('👋 Peer left, cleaning up...');
      this.cleanupPeer(false);
    });
  }

  private async createAndSendOffer(): Promise<void> {
    if (!this.peer) return;
    
    // Prevent duplicate offers
    if (this.isNegotiating) {
      console.log('⚠️ Already negotiating, skipping offer creation');
      return;
    }
    
    this.isNegotiating = true;
    
    try {
      // Ensure local tracks are attached before offering
      try {
        if (this.localStream && this.peer) {
          const senders = this.peer.getSenders();
          this.localStream.getTracks().forEach((track) => {
            const hasSender = senders.some((s) => s.track && s.track.kind === track.kind);
            if (!hasSender) {
              try { this.peer!.addTrack(track, this.localStream!); } catch {}
            }
          });
        }
      } catch {}

      const offer = await this.peer.createOffer({ 
        offerToReceiveAudio: true, 
        offerToReceiveVideo: true 
      });
      
      await this.peer.setLocalDescription(offer);
      this.lastOffer = offer;
      
      if (this.currentRoomId) {
        this.socket?.emit('webrtc:offer', { roomId: this.currentRoomId, sdp: offer });
        console.log('📤 Offer sent successfully');
      }
    } catch (error) {
      console.error('❌ Error creating/sending offer:', error);
    } finally {
      this.isNegotiating = false;
    }
  }

  // Public nudge to force negotiation if connection not established
  async triggerNegotiation(): Promise<void> {
    try {
      const peerState = this.getPeerStatus();
      console.log('🧩 Trigger negotiation check. Peer state:', peerState);
      if (peerState !== 'connected' && peerState !== 'connecting') {
        await this.createAndSendOffer();
      } else {
        // Even if connected, an explicit offer can help re-sync tracks post-rejoin
        await this.createAndSendOffer();
      }
    } catch (e) {
      console.error('❌ triggerNegotiation failed:', e);
    }
  }

  /**
   * Attempt an ICE restart to recover broken connections without tearing down the peer.
   */
  async attemptIceRestart(): Promise<void> {
    if (!this.peer) return;
    console.log('🧊 Starting ICE restart...');
    // Re-attach local tracks to ensure continuity after restart
    try {
      if (this.localStream && this.peer) {
        const senders = this.peer.getSenders();
        this.localStream.getTracks().forEach((track) => {
          const hasSender = senders.some((s) => s.track && s.track.kind === track.kind);
          if (!hasSender) {
            try { this.peer!.addTrack(track, this.localStream!); } catch {}
          }
        });
      }
    } catch {}
    const offer = await this.peer.createOffer({ iceRestart: true });
    await this.peer.setLocalDescription(offer);
    if (this.currentRoomId) {
      this.socket?.emit('webrtc:offer', { roomId: this.currentRoomId, sdp: offer });
    }
    console.log('🧊 ICE restart offer sent.');
  }

  /**
   * Expose a manual refresh that triggers ICE restart (used by UI "Refresh Remote").
   */
  async restartIce(): Promise<void> {
    try {
      await this.attemptIceRestart();
    } catch (e) {
      console.error('❌ Manual ICE restart failed:', e);
    }
  }

  /**
   * Start monitoring connection quality for remote connections
   */
  private startConnectionQualityMonitoring(): void {
    if (!this.peer) return;
    
    const monitoringInterval = setInterval(() => {
      if (!this.peer || this.peer.connectionState !== 'connected') {
        clearInterval(monitoringInterval);
        return;
      }
      
      // Get connection statistics
      this.peer.getStats().then((stats) => {
        let hasAudio = false;
        let hasVideo = false;
        let bytesReceived = 0;
        let bytesSent = 0;
        let packetsLost = 0;
        
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp') {
            if (report.kind === 'audio') hasAudio = true;
            if (report.kind === 'video') hasVideo = true;
            bytesReceived += report.bytesReceived || 0;
            packetsLost += report.packetsLost || 0;
          } else if (report.type === 'outbound-rtp') {
            bytesSent += report.bytesSent || 0;
          }
        });
        
        console.log('📊 Connection quality:', {
          hasAudio,
          hasVideo,
          bytesReceived,
          bytesSent,
          packetsLost,
          connectionState: this.peer?.connectionState,
          iceConnectionState: this.peer?.iceConnectionState
        });
        
        // If we're not receiving data and connection seems stable, try to trigger negotiation
        if (bytesReceived === 0 && this.peer?.connectionState === 'connected') {
          console.warn('⚠️ No data received despite connected state, triggering negotiation...');
          this.triggerNegotiation();
        }
      }).catch((error) => {
        console.error('❌ Error getting connection stats:', error);
      });
    }, 5000); // Check every 5 seconds
  }

  /**
   * Recreate peer connection as a last resort
   */
  private async recreatePeerConnection(): Promise<void> {
    if (!this.peer) return;
    
    console.log('🔄 Recreating peer connection...');
    
    try {
      // Store current state
      const currentRoomId = this.currentRoomId;
      const currentRole = this.currentRole;
      const currentLocalStream = this.localStream;
      
      // Clean up current peer
      if (this.peer) {
        this.cleanupPeer(false);
      }
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize
      await this.initPeer();
      
      // Restore state
      this.currentRoomId = currentRoomId;
      this.currentRole = currentRole;
      
      // Reattach local stream
      if (currentLocalStream) {
        currentLocalStream.getTracks().forEach((track) => {
          try { this.peer?.addTrack(track, currentLocalStream); } catch {}
        });
      }
      
      // Trigger negotiation
      await this.triggerNegotiation();
      
      console.log('✅ Peer connection recreated successfully');
    } catch (error) {
      console.error('❌ Failed to recreate peer connection:', error);
    }
  }

  /**
   * Attempt connection recovery when SDP mismatches occur
   */
  private async attemptConnectionRecovery(): Promise<void> {
    if (!this.peer) return;
    
    console.log('🔄 Attempting connection recovery...');
    
    try {
      // Reset negotiation state
      this.isNegotiating = false;
      this.lastOffer = undefined;
      this.lastAnswer = undefined;
      
      // Close current peer and create new one
      this.peer.close();
      this.peer = undefined;
      
      // Wait a bit before reinitializing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize peer connection
      await this.initPeer();
      
      // Reattach local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          try { this.peer?.addTrack(track, this.localStream!); } catch {}
        });
      }
      
      console.log('✅ Connection recovery completed');
    } catch (error) {
      console.error('❌ Connection recovery failed:', error);
    }
  }

  async leave(): Promise<void> {
    if (this.currentRoomId) {
      this.socket?.emit('webrtc:leave', { roomId: this.currentRoomId });
    }
    this.cleanupPeer(true);
  }

  private cleanupPeer(closeSocketRoom: boolean): void {
    this.peer?.getSenders().forEach((s) => {
      try { s.track?.stop(); } catch {}
    });
    this.peer?.close();
    this.peer = undefined;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    this.remoteStream = undefined;
    // Reset remote stream subject
    this.remoteStreamSubject.next(undefined);
    
    // Reset signaling state
    this.isNegotiating = false;
    this.lastOffer = undefined;
    this.lastAnswer = undefined;
    
    if (closeSocketRoom) {
      this.currentRoomId = undefined;
      this.currentRole = undefined;
    }
  }
}
