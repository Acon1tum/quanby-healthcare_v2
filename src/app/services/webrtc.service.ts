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
    // Use environment backend API URL if available, otherwise default to localhost:3000
    if (environment.backendApi) {
      return environment.backendApi.replace('/api', '');
    }
    return 'http://localhost:3000';
  }

  initSocket(signalingUrl?: string): void {
    if (this.socket) return;
    const url = signalingUrl || this.getSignalingUrl();
    console.log('🔌 Connecting to Socket.IO server:', url);
    
    // Get token from AuthService instead of localStorage
    const token = this.authService.accessToken;
    console.log('🔑 User token:', token ? 'Present' : 'Missing');
    console.log('👤 Current user:', this.authService.currentUserValue);
    
    this.socket = io(url, {
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });
    
    // Add connection event listeners for debugging
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });
    
    this.registerSocketHandlers();
  }

  async initPeer(config?: RTCConfiguration): Promise<void> {
    if (this.peer) return;
    const defaultConfig: RTCConfiguration = config ?? {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };
    this.peer = new RTCPeerConnection(defaultConfig);
    this.remoteStream = new MediaStream();

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
        // Update the remote stream with the new tracks
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          console.log('✅ Remote stream updated:', this.remoteStream);
          console.log('📹 Remote stream tracks:', this.remoteStream.getTracks().map(t => ({
            id: t.id,
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState
          })));
          
          // Emit the stream to subscribers
          this.remoteStreamSubject.next(this.remoteStream);
        } else {
          console.warn('⚠️ No streams in track event');
        }
      });
    };

    // Add connection state change handler
    this.peer.onconnectionstatechange = () => {
      console.log('🔗 Peer connection state changed:', this.peer?.connectionState);
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
  }

  private createDataChannel(): void {
    if (!this.peer) return;
    
    try {
      // Create data channel for face scan communication
      this.dataChannel = this.peer.createDataChannel('face-scan-channel', {
        ordered: true
      });
      
      this.dataChannel.onopen = () => {
        console.log('📡 Data channel opened for face scan communication');
      };
      
      this.dataChannel.onclose = () => {
        console.log('📡 Data channel closed');
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('📡 Data channel error:', error);
      };
      
      this.dataChannel.onmessage = (event) => {
        try {
          const data: FaceScanData = JSON.parse(event.data);
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

  join(roomId: string): Promise<JoinResponse> {
    this.currentRoomId = roomId;
    console.log('🚪 Attempting to join room:', roomId);
    console.log('🔌 Socket connected:', this.socket?.connected);
    return new Promise((resolve) => {
      this.socket?.emit('webrtc:join', { roomId }, (resp: JoinResponse) => {
        console.log('📨 Join response received:', resp);
        if (resp?.ok && resp.role) this.currentRole = resp.role;
        console.log('✅ Joined room successfully:', { roomId, role: this.currentRole, participants: resp.participants });
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
        await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('✅ Remote description (answer) set successfully');
        console.log('🔗 Connection should now be established');
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    });

    this.socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      console.log('🧊 Received ICE candidate:', candidate);
      if (!this.peer || !candidate) return;
      
      try {
        await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('✅ ICE candidate added successfully');
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
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    if (this.currentRoomId) {
      this.socket?.emit('webrtc:offer', { roomId: this.currentRoomId, sdp: offer });
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
