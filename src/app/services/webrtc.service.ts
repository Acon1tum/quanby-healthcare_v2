import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface JoinResponse {
  ok: boolean;
  error?: string;
  participants?: number;
  role?: 'doctor' | 'patient';
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
  
  // Observable for participant count changes
  private participantCountSubject = new BehaviorSubject<number>(0);
  public participantCount$ = this.participantCountSubject.asObservable();

  constructor(private zone: NgZone) {}

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
    const userRaw = localStorage.getItem('currentUser');
    const user = userRaw ? JSON.parse(userRaw) as { token?: string } : undefined;
    const token = user?.token;
    console.log('🔑 User token:', token ? 'Present' : 'Missing');
    console.log('👤 Current user:', user);
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
      this.zone.run(() => {
        // Update the remote stream with the new tracks
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          console.log('✅ Remote stream updated:', this.remoteStream);
          this.remoteStreamSubject.next(this.remoteStream);
        }
      });
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
  
  // Method to update participant count
  private updateParticipantCount(count: number): void {
    this.zone.run(() => {
      this.participantCountSubject.next(count);
      console.log('👥 Participant count updated:', count);
    });
  }

  join(roomId: string): Promise<JoinResponse> {
    this.currentRoomId = roomId;
    console.log('🚪 Attempting to join room:', roomId);
    console.log('🔌 Socket connected:', this.socket?.connected);
    return new Promise((resolve) => {
      this.socket?.emit('webrtc:join', { roomId }, (resp: JoinResponse) => {
        console.log('📨 Join response received:', resp);
        if (resp?.ok && resp.role) this.currentRole = resp.role;
        // Update participant count
        if (resp?.participants !== undefined) {
          this.updateParticipantCount(resp.participants);
        }
        console.log('✅ Joined room successfully:', { roomId, role: this.currentRole, participants: resp.participants });
        resolve(resp);
      });
    });
  }

  private registerSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('webrtc:peer-joined', async (data: { socketId: string; role: string }) => {
      console.log('👥 Peer joined:', data);
      
      // If we already have a peer connection, this might be a reconnection
      if (this.peer) {
        await this.handlePeerRejoin();
      } else {
        await this.initPeer();
      }
      
      // Increment participant count
      const currentCount = this.participantCountSubject.value;
      this.updateParticipantCount(currentCount + 1);
      
      // Wait a bit for the peer to be ready, then create and send offer
      setTimeout(async () => {
        console.log('📤 Creating and sending offer...');
        await this.createAndSendOffer();
      }, 1000);
    });

    this.socket.on('webrtc:offer', async ({ sdp }) => {
      console.log('📥 Received offer:', sdp);
      if (!this.peer) await this.initPeer();
      await this.peer!.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.peer!.createAnswer();
      await this.peer!.setLocalDescription(answer);
      console.log('📤 Sending answer:', answer);
      if (this.currentRoomId) {
        this.socket?.emit('webrtc:answer', { roomId: this.currentRoomId, sdp: answer });
      }
    });

    this.socket.on('webrtc:answer', async ({ sdp }) => {
      console.log('📥 Received answer:', sdp);
      if (!this.peer) return;
      await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      console.log('🧊 Received ICE candidate:', candidate);
      if (!this.peer || !candidate) return;
      try { await this.peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    this.socket.on('webrtc:peer-left', () => {
      console.log('👋 Peer left, cleaning up remote stream only...');
      this.cleanupRemoteStreamOnly();
      
      // Decrement participant count
      const currentCount = this.participantCountSubject.value;
      this.updateParticipantCount(Math.max(0, currentCount - 1));
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
    // Reset participant count
    this.updateParticipantCount(0);
  }

  private cleanupPeer(closeSocketRoom: boolean): void {
    // Only close the peer connection, don't stop local tracks
    this.peer?.getSenders().forEach((s) => {
      try { s.track?.stop(); } catch {}
    });
    this.peer?.close();
    this.peer = undefined;
    
    // Only stop local stream if we're completely leaving
    if (closeSocketRoom) {
      this.localStream?.getTracks().forEach((t) => t.stop());
      this.localStream = undefined;
    }
    
    // Always clean up remote stream
    this.remoteStream = undefined;
    this.remoteStreamSubject.next(undefined);
    
    if (closeSocketRoom) {
      this.currentRoomId = undefined;
      this.currentRole = undefined;
      // Reset participant count when completely leaving
      this.updateParticipantCount(0);
    }
  }

  private cleanupRemoteStreamOnly(): void {
    // Stop remote stream tracks
    this.remoteStream?.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
    this.remoteStream = undefined;
    this.remoteStreamSubject.next(undefined);
    
    // Reset peer connection for new peer
    if (this.peer) {
      this.peer.close();
      this.peer = undefined;
    }
  }

  private async handlePeerRejoin(): Promise<void> {
    console.log('🔄 Peer rejoined, reinitializing connection...');
    if (this.peer) {
      this.peer.close();
      this.peer = undefined;
    }
    await this.initPeer();
  }
}
