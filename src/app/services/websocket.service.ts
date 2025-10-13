import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus = new BehaviorSubject<boolean>(false);
  
  public isConnected$ = this.connectionStatus.asObservable();

  constructor(private authService: AuthService) {
    // Auto-connect when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  /**
   * Connect to Socket.IO server with authentication
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('✅ Socket.IO already connected');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('❌ No authentication token found');
      return;
    }

    console.log('🔌 Connecting to Socket.IO server...');

    this.socket = io(environment.webrtcSignalingUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket?.id);
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      this.connectionStatus.next(false);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus.next(false);
    }
  }

  /**
   * Listen for Socket.IO events
   */
  on<T = any>(eventName: string): Observable<T> {
    return new Observable(observer => {
      if (!this.socket || !this.socket.connected) {
        console.error('❌ Socket not connected');
        observer.error('Socket not connected');
        return;
      }

      this.socket.on(eventName, (data: T) => {
        observer.next(data);
      });

      // Cleanup on unsubscribe
      return () => {
        if (this.socket) {
          this.socket.off(eventName);
        }
      };
    });
  }

  /**
   * Emit Socket.IO event
   */
  emit(eventName: string, data?: any): void {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit(eventName, data);
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}



