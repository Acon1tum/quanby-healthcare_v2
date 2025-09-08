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
  
  // Prescription properties
  showPrescriptionModal: boolean = false;
  prescriptionForm: any = {
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: null,
    refills: 0,
    prescribedAt: new Date(),
    expiresAt: null,
    notes: ''
  };
  prescriptions: any[] = [];
  isSubmittingPrescription: boolean = false;
  
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
    console.log('🔍 Starting face scan...');
    console.log('🔍 Remote stream available:', !!this.remoteStream);
    console.log('🔍 WebRTC service available:', !!this.webrtc);
    
    if (!this.remoteStream) {
      this.errorMessage = 'Patient video stream is required to start face scan.';
      console.error('❌ Face scan failed: No remote stream');
      return;
    }

    if (!this.webrtc) {
      this.errorMessage = 'WebRTC service not available.';
      console.error('❌ Face scan failed: WebRTC service not available');
      return;
    }

    this.isFaceScanning = true;
    this.faceScanStatus = 'Requesting patient to start face scan...';
    
    // Check data channel status before sending
    const dataChannelStatus = this.webrtc.getDataChannelStatus();
    console.log('🔍 Data channel status:', dataChannelStatus);
    
    if (dataChannelStatus !== 'open') {
      this.faceScanStatus = `Data channel not ready (${dataChannelStatus}). Waiting for connection...`;
      console.warn('⚠️ Data channel not ready, waiting for connection...');
      
      // Wait for data channel to be ready
      this.waitForDataChannel();
      return;
    }
    
    // Send face scan request to patient via WebRTC data channel
    this.webrtc.sendFaceScanRequest({
      type: 'face-scan-request',
      roomId: this.roomId,
      timestamp: Date.now()
    });
    
    console.log('✅ Face scan request sent successfully');
    
    // Show a simple status modal for the doctor
    this.showFaceScanModal = true;
    
    // Start monitoring for patient response
    this.monitorPatientScanProgress();
    
    // Set timeout for face scan completion
    this.setFaceScanTimeout();
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
    console.log('🔍 Setting up face scan message listener...');
    window.addEventListener('message', (event) => {
      console.log('📨 Window message received:', event);
      
      if (event.source === this.faceScanIframe?.nativeElement?.contentWindow) {
        const data = event.data;
        console.log('✅ Face scan message received from iframe:', data);
        
        switch (data.action) {
          case 'onAnalysisStart':
            console.log('🔍 Face analysis started');
            this.faceScanStatus = 'Face analysis started...';
            break;
          case 'onHealthAnalysisFinished':
            console.log('✅ Face scan completed with results:', data.analysisData);
            this.faceScanResults = data.analysisData;
            this.faceScanStatus = 'Face scan completed successfully!';
            this.isFaceScanComplete = true;
            this.isFaceScanning = false;
            
            // Send results to patient via WebRTC data channel
            this.webrtc.sendFaceScanResults(data.analysisData, 'Face scan completed successfully!');
            break;
          case 'failedToGetHealthAnalysisResult':
            console.error('❌ Failed to get health analysis results');
            this.faceScanStatus = 'Failed to get scan results.';
            this.isFaceScanning = false;
            break;
          case 'failedToLoadPage':
            console.error('❌ Failed to load face scan page');
            this.faceScanStatus = 'Failed to load face scan page.';
            this.isFaceScanning = false;
            break;
          default:
            console.log('⚠️ Unknown face scan action:', data.action, data);
            break;
        }
      } else {
        console.log('📨 Message from unknown source:', event.source);
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

  // Get connection status for debugging
  getConnectionStatus(): string {
    if (!this.webrtc) return 'WebRTC service not initialized';
    
    const socketStatus = this.webrtc.getSocketStatus();
    const peerStatus = this.webrtc.getPeerStatus();
    const dataChannelStatus = this.webrtc.getDataChannelStatus();
    
    return `Socket: ${socketStatus}, Peer: ${peerStatus}, Data: ${dataChannelStatus}`;
  }

  // Wait for data channel to be ready
  private waitForDataChannel(): void {
    console.log('⏳ Waiting for data channel to be ready...');
    const checkInterval = setInterval(() => {
      const status = this.webrtc.getDataChannelStatus();
      console.log('🔍 Data channel status check:', status);
      
      if (status === 'open') {
        clearInterval(checkInterval);
        console.log('✅ Data channel is now ready, proceeding with face scan...');
        this.faceScanStatus = 'Data channel ready. Sending face scan request...';
        
        // Retry sending the face scan request
        setTimeout(() => {
          this.webrtc.sendFaceScanRequest({
            type: 'face-scan-request',
            roomId: this.roomId,
            timestamp: Date.now()
          });
          this.monitorPatientScanProgress();
        }, 1000);
      }
    }, 2000); // Check every 2 seconds
    
    // Set a maximum wait time
    setTimeout(() => {
      clearInterval(checkInterval);
      if (this.webrtc.getDataChannelStatus() !== 'open') {
        this.faceScanStatus = 'Data channel failed to connect. Please check your connection.';
        this.isFaceScanning = false;
        console.error('❌ Data channel failed to connect within timeout');
      }
    }, 30000); // 30 second timeout
  }

  // Set timeout for face scan completion
  private setFaceScanTimeout(): void {
    console.log('⏰ Setting face scan timeout...');
    setTimeout(() => {
      if (this.isFaceScanning && !this.isFaceScanComplete) {
        console.warn('⚠️ Face scan timeout reached');
        this.faceScanStatus = 'Face scan timeout. Patient may not have responded.';
        this.isFaceScanning = false;
        
        // Show error message to user
        this.errorMessage = 'Face scan timed out. Please try again or check patient connection.';
      }
    }, 120000); // 2 minute timeout
  }

  // Prescription methods
  openPrescriptionModal(): void {
    this.showPrescriptionModal = true;
    this.resetPrescriptionForm();
  }

  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
    this.resetPrescriptionForm();
  }

  resetPrescriptionForm(): void {
    this.prescriptionForm = {
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: null,
      refills: 0,
      prescribedAt: new Date(),
      expiresAt: null,
      notes: ''
    };
  }

  async submitPrescription(): Promise<void> {
    if (!this.validatePrescriptionForm()) {
      return;
    }

    this.isSubmittingPrescription = true;

    try {
      // Create prescription object
      const prescription = {
        ...this.prescriptionForm,
        prescribedAt: new Date(this.prescriptionForm.prescribedAt),
        expiresAt: this.prescriptionForm.expiresAt ? new Date(this.prescriptionForm.expiresAt) : null,
        id: Date.now(), // Temporary ID for frontend display
        createdAt: new Date()
      };

      // Add to prescriptions list
      this.prescriptions.push(prescription);

      // Send prescription to patient via WebRTC data channel
      this.webrtc.sendFaceScanStatus({
        type: 'face-scan-status',
        status: `Prescription: ${prescription.medicationName} - ${prescription.dosage}`,
        timestamp: Date.now()
      });
      
      // Store prescription data for patient access
      console.log('📋 Prescription data for patient:', prescription);

      console.log('✅ Prescription submitted:', prescription);
      
      // Close modal and reset form
      this.closePrescriptionModal();
      
      // Show success message (you could add a toast notification here)
      alert('Prescription submitted successfully!');
      
    } catch (error) {
      console.error('❌ Error submitting prescription:', error);
      alert('Error submitting prescription. Please try again.');
    } finally {
      this.isSubmittingPrescription = false;
    }
  }

  validatePrescriptionForm(): boolean {
    const requiredFields = ['medicationName', 'dosage', 'frequency', 'duration'];
    
    for (const field of requiredFields) {
      if (!this.prescriptionForm[field] || this.prescriptionForm[field].trim() === '') {
        alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
        return false;
      }
    }

    // Validate quantity if provided
    if (this.prescriptionForm.quantity && (isNaN(this.prescriptionForm.quantity) || this.prescriptionForm.quantity <= 0)) {
      alert('Quantity must be a positive number.');
      return false;
    }

    // Validate refills
    if (this.prescriptionForm.refills < 0) {
      alert('Refills cannot be negative.');
      return false;
    }

    // Validate expiration date if provided
    if (this.prescriptionForm.expiresAt && new Date(this.prescriptionForm.expiresAt) <= new Date()) {
      alert('Expiration date must be in the future.');
      return false;
    }

    return true;
  }

  deletePrescription(index: number): void {
    if (confirm('Are you sure you want to delete this prescription?')) {
      this.prescriptions.splice(index, 1);
    }
  }

  editPrescription(index: number): void {
    this.prescriptionForm = { ...this.prescriptions[index] };
    this.showPrescriptionModal = true;
  }

  // Handle prescription data from WebRTC data channel
  handlePrescriptionData(data: any): void {
    if (data.type === 'prescription') {
      console.log('📋 Prescription received:', data.prescription);
      // You could add prescription to a received prescriptions list here
    }
  }
}
