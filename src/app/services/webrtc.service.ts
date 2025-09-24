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

  private waitForSocketConnected(timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }
      let settled = false;
      const onConnect = () => {
        if (settled) return;
        settled = true;
        this.socket?.off('connect_error', onError);
        resolve();
      };
      const onError = (err: any) => {
        console.error('❌ Socket connect error (waiting):', err);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        reject(new Error('Socket connect timeout'));
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
    const defaultIceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];
    // Allow optional TURN/STUN overrides via environment
    const envIceServers = (environment as any).webrtcIceServers as RTCIceServer[] | undefined;
    const defaultConfig: RTCConfiguration = config ?? {
      iceServers: envIceServers?.length ? envIceServers : defaultIceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      // Enhanced configuration for production
      iceTransportPolicy: 'all',
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
        this.socket?.emit('webrtc:ice-candidate', {
          roomId: this.currentRoomId,
          candidate: event.candidate,
        });
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
        if (event.streams && event.streams[0]) {
          // Stream provided by browser
          this.remoteStream = event.streams[0];
          console.log('✅ Remote stream (from event.streams) updated:', this.remoteStream);
        } else {
          // Some browsers fire ontrack with no streams; add track to our aggregate stream
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          try {
            this.remoteStream.addTrack(event.track);
            console.log('➕ Added remote track to aggregate stream');
          } catch (e) {
            console.warn('⚠️ Failed to add remote track to stream:', e);
          }
        }
        if (this.remoteStream) {
          console.log('📹 Remote stream tracks now:', this.remoteStream.getTracks().map(t => ({
            id: t.id,
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState
          })));
          this.remoteStreamSubject.next(this.remoteStream);
        }
      });
    };

    // Add connection state change handler
    this.peer.onconnectionstatechange = async () => {
      const state = this.peer?.connectionState;
      console.log('🔗 Peer connection state changed:', state);
      
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
        await this.createAndSendOffer();
      } catch (e) {
        console.error('❌ Failed to renegotiate onnegotiationneeded:', e);
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
        // Notify that data channel is ready
        this.zone.run(() => {
          this.dataChannelSubject.next({
            type: 'face-scan-status',
            status: 'data-channel-ready',
            timestamp: Date.now()
          });
        });
      };
      
      this.dataChannel.onclose = () => {
        console.log('📡 Data channel closed');
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('📡 Data channel error:', error);
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
    return new Promise(async (resolve) => {
      try {
        await this.waitForSocketConnected(7000);
      } catch (e) {
        console.warn('⚠️ Proceeding to emit join without confirmed connection:', e);
      }
      this.socket?.emit('webrtc:join', { roomId }, (resp: JoinResponse) => {
        console.log('📨 Join response received:', resp);
        if (resp?.ok && resp.role) this.currentRole = resp.role;
        console.log('✅ Joined room successfully:', { roomId, role: this.currentRole, participants: resp?.participants });
        resolve(resp);
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
      
      try {
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
        
        console.log('📤 Sending answer:', answer);
        if (this.currentRoomId) {
          this.socket?.emit('webrtc:answer', { roomId: this.currentRoomId, sdp: answer });
          console.log('✅ Answer sent successfully');
        }
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      }
    });

    this.socket.on('webrtc:answer', async ({ sdp }) => {
      console.log('📥 Received answer:', sdp);
      if (!this.peer) return;
      
      try {
        // Check current signaling state before setting remote description
        const currentState = this.peer.signalingState;
        console.log('🔍 Current signaling state:', currentState);
        
        // Only set remote description if we're in the right state
        if (currentState === 'have-local-offer' || currentState === 'have-remote-pranswer') {
          await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log('✅ Remote description (answer) set successfully');
          console.log('🔗 Connection should now be established');
        } else {
          console.warn('⚠️ Ignoring answer - wrong signaling state:', currentState);
        }
      } catch (error) {
        console.error('❌ Error handling answer:', error);
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

    const offer = await this.peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await this.peer.setLocalDescription(offer);
    if (this.currentRoomId) {
      this.socket?.emit('webrtc:offer', { roomId: this.currentRoomId, sdp: offer });
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
    if (closeSocketRoom) {
      this.currentRoomId = undefined;
      this.currentRole = undefined;
    }
  }
}
