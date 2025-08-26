import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebRTCService } from '../../../services/webrtc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-patient-meet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-meet.component.html',
  styleUrl: './patient-meet.component.scss'
})
export class PatientMeetComponent implements OnInit, OnDestroy {
  roomId = '';
  isJoined = signal(false);
  localStream?: MediaStream;
  private _remoteStream?: MediaStream;
  
  get remoteStream(): MediaStream | undefined {
    return this._remoteStream;
  }
  
  set remoteStream(value: MediaStream | undefined) {
    console.log('🎥 Patient: Setting remote stream:', value ? `MediaStream(${value.id})` : 'undefined');
    this._remoteStream = value;
  }
  
  participants = signal(0);
  currentRole = signal<string>('');
  private remoteStreamSubscription?: Subscription;

  constructor(private webrtc: WebRTCService) {}

  async ngOnInit() {
    this.webrtc.initSocket();
    await this.webrtc.initPeer();
    this.localStream = await this.webrtc.getUserMedia({ video: true, audio: true });
    
    // Subscribe to remote stream changes
    this.remoteStreamSubscription = this.webrtc.remoteStream$.subscribe(stream => {
      console.log('🔄 Patient: Remote stream updated via observable:', stream);
      this.remoteStream = stream;
    });
  }

  async join() {
    if (!this.roomId) return;
    const resp = await this.webrtc.join(this.roomId);
    if (resp.ok) {
      this.isJoined.set(true);
      this.participants.set(resp.participants || 0);
      this.currentRole.set(resp.role || '');
      console.log('🎯 Patient joined room:', this.roomId, 'participants:', this.participants());
    } else {
      alert(resp.error || 'Failed to join');
    }
  }

  async leave() {
    await this.webrtc.leave();
    this.isJoined.set(false);
    this.participants.set(0);
    this.currentRole.set('');
    this.remoteStream = undefined;
  }

  refreshRemoteStream() {
    console.log('🔄 Manually refreshing remote stream...');
    this.remoteStream = this.webrtc.getRemoteStream();
  }

  ngOnDestroy(): void {
    this.remoteStreamSubscription?.unsubscribe();
    this.webrtc.leave().catch(() => {});
  }
}
