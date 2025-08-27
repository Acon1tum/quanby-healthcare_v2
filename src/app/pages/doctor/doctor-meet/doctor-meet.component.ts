import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { WebRTCService } from '../../../services/webrtc.service';
import { FaceScanService, FaceScanRequest } from '../../../services/face-scan.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HealthReportDisplayComponent, HealthScanResults } from '../../../shared/components/health-report-display/health-report-display.component';

@Component({
  selector: 'app-doctor-meet',
  standalone: true,
  imports: [CommonModule, FormsModule, HealthReportDisplayComponent],
  templateUrl: './doctor-meet.component.html',
  styleUrls: ['./doctor-meet.component.scss']
})
export class DoctorMeetComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('faceScanIframe') faceScanIframe!: ElementRef<HTMLIFrameElement>;
  
  roomId: string = '';
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  participants: number = 0;
  currentRole: string = '';
  isJoined: boolean = false;
  isJoining: boolean = false;
  errorMessage: string = '';
  isCameraOn: boolean = true;
  copySuccessMessage: string = '';
  
  // Face scanning properties
  isFaceScanning: boolean = false;
  showFaceScanModal: boolean = false;
  faceScanIframeUrl: SafeResourceUrl | null = null;
  faceScanResults: HealthScanResults | null = null;
  faceScanStatus: string = '';
  isFaceScanComplete: boolean = false;
  showRawResults: boolean = false;
  
  private remoteStreamSubscription: any;

  constructor(
    public webrtc: WebRTCService,
    private faceScanService: FaceScanService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Generate a random room ID for the doctor
    this.generateRoomId();
    
    // Initialize WebRTC service
    this.webrtc.initSocket();
    this.webrtc.initPeer();
    // Don't get user media until joining - this prevents camera from starting early
    
    // Subscribe to remote stream changes
    this.remoteStreamSubscription = this.webrtc.remoteStream$.subscribe(stream => {
      console.log('🔄 Remote stream updated in doctor component:', stream);
      this.remoteStream = stream || null;
      
      // Immediately try to bind remote video when stream changes
      if (stream) {
        console.log('🎥 Remote stream received, binding to video element...');
        setTimeout(() => {
          this.bindRemoteVideo();
        }, 100);
      } else {
        console.log('❌ Remote stream cleared');
      }
    });

    // Subscribe to data channel messages for face scan results and status updates
    this.webrtc.dataChannel$.subscribe(data => {
      if (data && data.type === 'face-scan-results') {
        console.log('📡 Face scan results received in doctor component:', data);
        this.handleFaceScanResults(data.results, data.status);
      } else if (data && data.type === 'face-scan-status') {
        console.log('📡 Face scan status update received in doctor component:', data);
        this.handleFaceScanStatusUpdate(data.status);
      }
    });
  }

  private generateRoomId(): void {
    // Generate a random 6-character alphanumeric room ID
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.roomId = result;
    console.log('🏠 Generated room ID:', this.roomId);
  }

  generateNewRoomId(): void {
    this.generateRoomId();
    console.log('🔄 New room ID generated:', this.roomId);
  }

  copyRoomIdToClipboard(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.roomId).then(() => {
        console.log('📋 Room ID copied to clipboard:', this.roomId);
        this.showCopySuccessMessage();
      }).catch(err => {
        console.error('❌ Failed to copy room ID:', err);
        // Fallback for older browsers
        this.fallbackCopyRoomId();
      });
    } else {
      // Fallback for browsers without clipboard API
      this.fallbackCopyRoomId();
    }
  }

  private showCopySuccessMessage(): void {
    this.copySuccessMessage = 'Room code copied to clipboard!';
    setTimeout(() => {
      this.copySuccessMessage = '';
    }, 3000);
  }

  private fallbackCopyRoomId(): void {
    // Create a temporary input element
    const textArea = document.createElement('textarea');
    textArea.value = this.roomId;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('📋 Room ID copied to clipboard (fallback):', this.roomId);
      this.showCopySuccessMessage();
    } catch (err) {
      console.error('❌ Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  ngAfterViewInit() {
    // Don't bind local video here - wait until joining
  }

  ngOnDestroy() {
    if (this.remoteStreamSubscription) {
      this.remoteStreamSubscription.unsubscribe();
    }
    this.leave();
  }

  private bindLocalVideo() {
    console.log('🔗 Attempting to bind local video...');
    console.log('📹 Local video ref:', this.localVideoRef);
    console.log('🎥 Local stream:', this.localStream);
    
    if (this.localVideoRef && this.localVideoRef.nativeElement && this.localStream) {
      try {
        const videoElement = this.localVideoRef.nativeElement;
        videoElement.srcObject = this.localStream;
        console.log('✅ Local video bound successfully for doctor');
        
        // Ensure video plays
        videoElement.play().then(() => {
          console.log('▶️ Video started playing successfully');
        }).catch(e => {
          console.warn('⚠️ Video autoplay failed:', e);
          // Try to play without autoplay
          videoElement.muted = true;
          videoElement.play().catch(e2 => {
            console.error('❌ Video play failed even with muted:', e2);
          });
        });
      } catch (error) {
        console.error('❌ Error binding local video:', error);
      }
    } else {
      console.warn('⚠️ Cannot bind local video:', {
        hasRef: !!this.localVideoRef,
        hasElement: !!(this.localVideoRef && this.localVideoRef.nativeElement),
        hasStream: !!this.localStream,
        streamTracks: this.localStream?.getTracks().length || 0
      });
    }
  }

  private bindRemoteVideo() {
    console.log('🔗 Attempting to bind remote video...');
    console.log('📹 Remote video ref:', this.remoteVideoRef);
    console.log('🎥 Remote stream:', this.remoteStream);
    
    if (this.remoteVideoRef && this.remoteVideoRef.nativeElement && this.remoteStream) {
      try {
        const videoElement = this.remoteVideoRef.nativeElement;
        videoElement.srcObject = this.remoteStream;
        console.log('✅ Remote video bound successfully for doctor');
        
        // Ensure video plays
        videoElement.play().then(() => {
          console.log('▶️ Remote video started playing successfully');
        }).catch(e => {
          console.warn('⚠️ Remote video autoplay failed:', e);
          // Try to play without autoplay
          videoElement.muted = true;
          videoElement.play().catch(e2 => {
            console.error('❌ Remote video play failed even with muted:', e2);
          });
        });
      } catch (error) {
        console.error('❌ Error binding remote video:', error);
      }
    } else {
      console.warn('⚠️ Cannot bind remote video:', {
        hasRef: !!this.remoteVideoRef,
        hasElement: !!(this.remoteVideoRef && this.remoteVideoRef.nativeElement),
        hasStream: !!this.remoteStream,
        streamTracks: this.remoteStream?.getTracks().length || 0
      });
    }
  }

  toggleCamera() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      if (this.isCameraOn) {
        // Turn off camera
        videoTrack.enabled = false;
        this.isCameraOn = false;
        console.log('📷 Camera turned OFF');
      } else {
        // Turn on camera
        videoTrack.enabled = true;
        this.isCameraOn = true;
        console.log('📷 Camera turned ON');
      }
    }
  }

  async join() {
    if (!this.roomId.trim()) {
      this.errorMessage = 'Please enter a room ID';
      return;
    }

    this.isJoining = true;
    this.errorMessage = '';

    try {
      // Get user media and wait for the stream
      console.log('📷 Getting user media...');
      const mediaStream = await this.webrtc.getUserMedia();
      
      if (!mediaStream) {
        throw new Error('Failed to get camera access');
      }
      
      console.log('✅ User media obtained:', mediaStream);
      console.log('📹 Media tracks:', mediaStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      const result = await this.webrtc.join(this.roomId);
      if (result.ok) {
        this.isJoined = true;
        this.participants = result.participants || 0;
        this.currentRole = result.role || '';
        console.log('✅ Doctor joined room successfully:', result);
        
        // Set local stream and bind video
        this.localStream = mediaStream;
        console.log('🎥 Setting local stream:', this.localStream);
        
        // Try to bind video immediately, then retry if needed
        this.bindLocalVideo();
        
        // Also retry after a longer delay to ensure DOM is fully ready
        setTimeout(() => {
          if (!this.localVideoRef?.nativeElement?.srcObject) {
            console.log('🔄 Retrying video binding...');
            this.bindLocalVideo();
          }
        }, 500);
      } else {
        this.errorMessage = result.error || 'Failed to join room';
        console.error('❌ Failed to join room:', result);
      }
    } catch (error) {
      console.error('❌ Error during join process:', error);
      if (error instanceof Error && error.message.includes('camera')) {
        this.errorMessage = 'Camera access denied. Please allow camera access and try again.';
      } else if (error instanceof Error && error.message.includes('NotAllowedError')) {
        this.errorMessage = 'Camera access denied. Please allow camera access and try again.';
      } else if (error instanceof Error && error.message.includes('NotFoundError')) {
        this.errorMessage = 'No camera found. Please check your camera connection.';
      } else {
        this.errorMessage = 'Error joining room: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      this.isJoining = false;
    }
  }

  leave() {
    this.webrtc.leave();
    this.isJoined = false;
    this.remoteStream = null;
    this.localStream = null;
    this.participants = 0;
    this.currentRole = '';
    this.errorMessage = '';
    this.isCameraOn = true;
    console.log('🚪 Doctor left the room');
  }

  refreshRemoteStream() {
    console.log('🔄 Manual refresh of remote stream');
    console.log('📊 Current remote stream status:', {
      hasStream: !!this.remoteStream,
      streamId: this.remoteStream?.id,
      tracksCount: this.remoteStream?.getTracks().length || 0,
      tracks: this.remoteStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      }))
    });
    
    const stream = this.webrtc.getRemoteStream();
    this.remoteStream = stream || null;
    
    if (this.remoteStream) {
      console.log('✅ Remote stream refreshed, binding to video...');
      this.bindRemoteVideo();
    } else {
      console.log('❌ No remote stream available for refresh');
    }
  }

  debugRemoteStream() {
    console.log('🔍 Debugging remote stream...');
    console.log('📊 Remote stream details:', {
      hasStream: !!this.remoteStream,
      streamId: this.remoteStream?.id,
      tracksCount: this.remoteStream?.getTracks().length || 0,
      tracks: this.remoteStream?.getTracks().map(t => ({
        id: t.id,
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      }))
    });
    
    console.log('📹 Remote video element:', {
      hasRef: !!this.remoteVideoRef,
      hasElement: !!(this.remoteVideoRef && this.remoteVideoRef.nativeElement),
      srcObject: this.remoteVideoRef?.nativeElement?.srcObject,
      readyState: this.remoteVideoRef?.nativeElement?.readyState,
      networkState: this.remoteVideoRef?.nativeElement?.networkState
    });
    
    // Try to get stream from service
    const serviceStream = this.webrtc.getRemoteStream();
    console.log('🔧 Service remote stream:', {
      hasStream: !!serviceStream,
      streamId: serviceStream?.id,
      tracksCount: serviceStream?.getTracks().length || 0
    });
  }

  refreshLocalVideo() {
    console.log('🔄 Manual refresh of local video');
    if (this.localStream) {
      this.bindLocalVideo();
    } else {
      console.warn('⚠️ No local stream available for refresh');
    }
  }

  // Getter for remote stream with logging
  get remoteStreamValue(): MediaStream | null {
    return this.remoteStream;
  }

  set remoteStreamValue(value: MediaStream | null) {
    console.log('🔄 Setting remote stream in doctor component:', value);
    this.remoteStream = value;
    this.bindRemoteVideo();
  }

  // Face scanning methods
  startFaceScan(): void {
    if (!this.remoteStream) {
      this.errorMessage = 'Patient video stream is required to start face scan.';
      return;
    }

    this.isFaceScanning = true;
    this.faceScanStatus = 'Requesting patient to start face scan...';
    
    // Send face scan request to patient via WebRTC data channel
    this.webrtc.sendFaceScanRequest({
      type: 'face-scan-request',
      roomId: this.roomId,
      timestamp: Date.now()
    });
    
    // Show a simple status modal for the doctor
    this.showFaceScanModal = true;
    
    // Start monitoring for patient response
    this.monitorPatientScanProgress();
  }

  private monitorPatientScanProgress(): void {
    // Update status every few seconds to show progress
    const progressInterval = setInterval(() => {
      if (this.isFaceScanComplete) {
        clearInterval(progressInterval);
        return;
      }
      
      if (this.faceScanStatus.includes('Requesting patient')) {
        this.faceScanStatus = 'Patient is reviewing face scan request...';
      } else if (this.faceScanStatus.includes('reviewing')) {
        this.faceScanStatus = 'Patient is starting face scan...';
      } else if (this.faceScanStatus.includes('starting')) {
        this.faceScanStatus = 'Patient is performing face scan...';
      } else if (this.faceScanStatus.includes('performing')) {
        this.faceScanStatus = 'Patient is completing face scan...';
      }
    }, 3000);
  }

  private setupFaceScanMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (event.source === this.faceScanIframe?.nativeElement?.contentWindow) {
        const data = event.data;
        console.log('Face scan message received:', data);
        
        switch (data.action) {
          case 'onAnalysisStart':
            this.faceScanStatus = 'Face analysis started...';
            break;
          case 'onHealthAnalysisFinished':
            this.faceScanResults = data.analysisData;
            this.faceScanStatus = 'Face scan completed successfully!';
            this.isFaceScanComplete = true;
            this.isFaceScanning = false;
            
            // Send results to patient via WebRTC data channel
            this.webrtc.sendFaceScanResults(data.analysisData, 'Face scan completed successfully!');
            break;
          case 'failedToGetHealthAnalysisResult':
            this.faceScanStatus = 'Failed to get scan results.';
            this.isFaceScanning = false;
            break;
          case 'failedToLoadPage':
            this.faceScanStatus = 'Failed to load face scan page.';
            this.isFaceScanning = false;
            break;
        }
      }
    });
  }

  closeFaceScanModal(): void {
    this.showFaceScanModal = false;
    this.isFaceScanning = false;
    this.faceScanResults = null;
    this.faceScanStatus = '';
    this.isFaceScanComplete = false;
  }

  resetFaceScan(): void {
    this.closeFaceScanModal();
    this.faceScanIframeUrl = null;
  }

  // Handle face scan results received from patient
  private handleFaceScanResults(results: any, status: string): void {
    console.log('📊 Handling face scan results in doctor component:', results);
    this.faceScanResults = results;
    this.faceScanStatus = status;
    this.isFaceScanComplete = true;
    this.isFaceScanning = false;
    
    // Update the modal to show results
    this.showFaceScanModal = true;
  }

  // Handle face scan status updates from patient
  private handleFaceScanStatusUpdate(status: string): void {
    console.log('📊 Handling face scan status update in doctor component:', status);
    this.faceScanStatus = status;
  }
}
