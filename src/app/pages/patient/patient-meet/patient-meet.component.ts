import { Component, OnDestroy, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
export class PatientMeetComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo', { static: false }) localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo', { static: false }) remoteVideoRef!: ElementRef<HTMLVideoElement>;
  
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
    this.updateRemoteVideo();
  }
  
  participants = signal(0);
  currentRole = signal<string>('');
  private remoteStreamSubscription?: Subscription; // Subscription for cleanup
  private participantCountSubscription?: Subscription; // Subscription for participant count

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
    
    // Subscribe to participant count changes
    this.participantCountSubscription = this.webrtc.participantCount$.subscribe(count => {
      console.log('👥 Patient: Participant count updated via observable:', count);
      this.participants.set(count);
    });
  }

  ngAfterViewInit() {
    this.updateLocalVideo();
  }

  private updateLocalVideo() {
    if (this.localVideoRef && this.localStream) {
      this.localVideoRef.nativeElement.srcObject = this.localStream;
    }
  }

  private updateRemoteVideo() {
    if (this.remoteVideoRef && this._remoteStream) {
      this.remoteVideoRef.nativeElement.srcObject = this._remoteStream;
    }
  }

  async join() {
    if (!this.roomId) return;
    const resp = await this.webrtc.join(this.roomId);
    if (resp.ok) {
      this.isJoined.set(true);
      this.currentRole.set(resp.role || '');
      console.log('🎯 Patient joined room:', this.roomId, 'role:', this.currentRole());
    } else {
      alert(resp.error || 'Failed to join');
    }
  }

  async leave() {
    await this.webrtc.leave();
    this.isJoined.set(false);
    this.currentRole.set('');
    this.remoteStream = undefined;
  }

  refreshRemoteStream() {
    console.log('🔄 Manually refreshing remote stream...');
    this.remoteStream = this.webrtc.getRemoteStream();
  }

  ngOnDestroy(): void {
    this.remoteStreamSubscription?.unsubscribe(); // Unsubscribe on destroy
    this.participantCountSubscription?.unsubscribe(); // Unsubscribe on destroy
    this.webrtc.leave().catch(() => {});
  }
}
