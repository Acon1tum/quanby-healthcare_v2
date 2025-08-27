import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { WebRTCService } from '../../../services/webrtc.service';
import { FaceScanService, FaceScanRequest } from '../../../services/face-scan.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HealthReportDisplayComponent, HealthScanResults } from '../../../shared/components/health-report-display/health-report-display.component';

@Component({
  selector: 'app-patient-meet',
  standalone: true,
  imports: [CommonModule, FormsModule, HealthReportDisplayComponent],
  templateUrl: './patient-meet.component.html',
  styleUrls: ['./patient-meet.component.scss']
})
export class PatientMeetComponent implements OnInit, OnDestroy, AfterViewInit {
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
  
  // Face scanning properties
  showFaceScanRequest: boolean = false;
  showFaceScanModal: boolean = false;
  faceScanIframeUrl: SafeResourceUrl | null = null;
  faceScanResults: HealthScanResults | null = null;
  faceScanStatus: string = '';
  isFaceScanning: boolean = false;
  isFaceScanComplete: boolean = false;
  showRawResults: boolean = false;
  
  private remoteStreamSubscription: any;
  private dataChannelSubscription: any;

  constructor(
    public webrtc: WebRTCService,
    private faceScanService: FaceScanService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Initialize WebRTC service
    this.webrtc.initSocket();
    this.webrtc.initPeer();
    // Don't get user media until joining - this prevents camera from starting early
    
    // Subscribe to remote stream changes
    this.remoteStreamSubscription = this.webrtc.remoteStream$.subscribe(stream => {
      console.log('🔄 Remote stream updated in patient component:', stream);
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

    // Subscribe to data channel messages for face scan requests and results
    this.dataChannelSubscription = this.webrtc.dataChannel$.subscribe(data => {
      if (data && data.type === 'face-scan-request') {
        console.log('📡 Face scan request received via data channel:', data);
        this.handleFaceScanRequest(data);
      } else if (data && data.type === 'face-scan-results') {
        console.log('📡 Face scan results received via data channel:', data);
        this.showFaceScanResultsModal(data.results, data.status);
      }
    });
  }

  ngAfterViewInit() {
    // Don't bind local video here - wait until joining
  }

  ngOnDestroy() {
    if (this.remoteStreamSubscription) {
      this.remoteStreamSubscription.unsubscribe();
    }
    if (this.dataChannelSubscription) {
      this.dataChannelSubscription.unsubscribe();
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
        console.log('✅ Local video bound successfully for patient');
        
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
        console.log('✅ Remote video bound successfully for patient');
        
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
        console.log('✅ Patient joined room successfully:', result);
        
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
    console.log('🚪 Patient left the room');
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
      console.log('🔄 Manual refresh of local video');
    } else {
      console.warn('⚠️ No local stream available for refresh');
    }
  }

  // Getter for remote stream with logging
  get remoteStreamValue(): MediaStream | null {
    return this.remoteStream;
  }

  set remoteStreamValue(value: MediaStream | null) {
    console.log('🔄 Setting remote stream in patient component:', value);
    this.remoteStream = value;
    this.bindRemoteVideo();
  }

  // Face scan methods
  handleFaceScanRequest(request: any): void {
    console.log('📡 Handling face scan request:', request);
    this.showFaceScanRequest = true;
    this.faceScanStatus = 'Doctor has requested a face scan. Click "Start Scan" to begin.';
  }

  startFaceScan(): void {
    this.showFaceScanRequest = false;
    this.showFaceScanModal = true;
    this.isFaceScanning = true;
    this.faceScanStatus = 'Initializing face scan...';
    
    // Notify doctor that patient has started the scan
    this.webrtc.sendFaceScanStatus({
      type: 'face-scan-status',
      status: 'Patient started face scan',
      timestamp: Date.now()
    });
    
    // Generate face scan token
    const request: FaceScanRequest = {
      clientId: `patient_${this.roomId}_${Date.now()}`,
      showResults: 'display',
      noDesign: true,
      faceOutline: true,
      buttonBgColor: '#007bff',
      buttonTextColor: '#ffffff',
      isVoiceAnalysisOn: false,
      forceFrontCamera: true,
      language: 'en',
      showDisclaimer: false
    };

    this.faceScanService.generateVideoToken(request).subscribe({
      next: (response) => {
        if (response.success && response.videoIframeUrl) {
          this.faceScanIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.videoIframeUrl);
          this.faceScanStatus = 'Face scan ready. Please follow the on-screen instructions.';
          this.setupFaceScanMessageListener();
        } else {
          this.faceScanStatus = 'Failed to initialize face scan.';
          this.isFaceScanning = false;
        }
      },
      error: (error) => {
        console.error('Face scan initialization error:', error);
        this.faceScanStatus = 'Error initializing face scan.';
        this.isFaceScanning = false;
        this.webrtc.sendFaceScanStatus({
          type: 'face-scan-status',
          status: 'Face scan failed to initialize',
          timestamp: Date.now()
        });
      }
    });
  }

  private setupFaceScanMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (event.source === this.faceScanIframe?.nativeElement?.contentWindow) {
        const data = event.data;
        console.log('Face scan message received:', data);
        
        switch (data.action) {
          case 'onAnalysisStart':
            this.faceScanStatus = 'Face analysis started...';
            // Notify doctor of progress
            this.webrtc.sendFaceScanStatus({
              type: 'face-scan-status',
              status: 'Patient: Face analysis started...',
              timestamp: Date.now()
            });
            break;
          case 'onHealthAnalysisFinished':
            this.faceScanResults = data.analysisData;
            this.faceScanStatus = 'Face scan completed successfully!';
            this.isFaceScanComplete = true;
            this.isFaceScanning = false;
            
            // Automatically send results to doctor via WebRTC data channel
            this.webrtc.sendFaceScanResults(data.analysisData, 'Face scan completed successfully!');
            break;
          case 'failedToGetHealthAnalysisResult':
            this.faceScanStatus = 'Failed to get scan results.';
            this.isFaceScanning = false;
            // Notify doctor of failure
            this.webrtc.sendFaceScanStatus({
              type: 'face-scan-status',
              status: 'Patient: Face scan failed to get results',
              timestamp: Date.now()
            });
            break;
          case 'failedToLoadPage':
            this.faceScanStatus = 'Failed to load face scan page.';
            this.isFaceScanning = false;
            // Notify doctor of failure
            this.webrtc.sendFaceScanStatus({
              type: 'face-scan-status',
              status: 'Patient: Face scan page failed to load',
              timestamp: Date.now()
            });
            break;
        }
      }
    });
  }

  // Face scan result methods
  showFaceScanResultsModal(results: any, status: string): void {
    this.faceScanResults = results;
    this.faceScanStatus = status;
    this.showFaceScanModal = true;
  }

  hideFaceScanResults(): void {
    this.showFaceScanModal = false;
    this.faceScanResults = null;
    this.faceScanStatus = '';
  }

  closeFaceScanModal(): void {
    this.showFaceScanModal = false;
    this.isFaceScanning = false;
    this.faceScanResults = null;
    this.faceScanStatus = '';
    this.isFaceScanComplete = false;
  }

  // Method to receive face scan results from doctor (can be called via WebRTC data channel)
  receiveFaceScanResults(results: any): void {
    this.showFaceScanResultsModal(results, 'Face scan completed successfully!');
  }
}
