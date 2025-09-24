import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { WebRTCService } from '../../../services/webrtc.service';
import { FaceScanService, FaceScanRequest } from '../../../services/face-scan.service';
import { HealthScanService, FaceScanResult } from '../../../services/health-scan.service';
import { AuthService } from '../../../auth/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HealthReportDisplayComponent, HealthScanResults } from '../../../shared/components/health-report-display/health-report-display.component';
import { Subscription } from 'rxjs';

// Type declaration for lottie-web
declare const lottie: any;

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
  @ViewChild('medicalAnimation') medicalAnimationRef!: ElementRef<HTMLDivElement>;
  
  roomId: string = '';
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  participants: number = 0;
  currentRole: string = '';
  isJoined: boolean = false;
  isJoining: boolean = false;
  errorMessage: string = '';
  isCameraOn: boolean = true;
  
  // Doctor details sidebar state
  showDoctorSidebar: boolean = true;
  connectedDoctorName: string = '';
  doctorDetails: { name?: string; specialization?: string; bio?: string } | null = null;
  
  // Face scanning properties
  showFaceScanRequest: boolean = false;
  showFaceScanModal: boolean = false;
  faceScanIframeUrl: SafeResourceUrl | null = null;
  faceScanResults: HealthScanResults | null = null;
  faceScanStatus: string = '';
  isFaceScanning: boolean = false;
  isFaceScanComplete: boolean = false;
  showRawResults: boolean = false;
  scanTimeRemaining: number = 0;
  
  // Health scan save properties
  isSavingToDatabase: boolean = false;
  saveStatus: string = '';
  showSaveSuccessModal: boolean = false;
  showSaveErrorModal: boolean = false;
  faceScanResultsForSave: FaceScanResult[] = [];
  
  // Notification properties
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'prescription' | 'diagnosis' | 'info' = 'info';
  notificationData: any = null;
  notificationTimeout: any = null;

  // Mobile dropdown properties
  showMobileDropdown: boolean = false;
  // In-video overlay menu
  showOverlayMenu: boolean = false;
  
  // Prescription and Diagnosis details modal
  showDetailsModal: boolean = false;
  detailsType: 'prescription' | 'diagnosis' | null = null;
  detailsData: any = null;
  
  // Prescription and Diagnosis list modal
  showPrescriptionDiagnosisModal: boolean = false;
  prescriptions: any[] = [];
  diagnoses: any[] = [];
  isLoadingPrescriptions: boolean = false;
  isLoadingDiagnoses: boolean = false;
  
  // Store received prescriptions and diagnoses from doctor
  receivedPrescriptions: any[] = [];
  receivedDiagnoses: any[] = [];
  
  // Lottie animation
  private lottieAnimation: any = null;
  
  private remoteStreamSubscription: any;
  private dataChannelSubscription: any;
  private healthScanSubscription: Subscription = new Subscription();

  constructor(
    public webrtc: WebRTCService,
    private faceScanService: FaceScanService,
    private healthScanService: HealthScanService,
    private authService: AuthService,
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

    // Listen for data channel messages (face scan, status, doctor info)
    this.dataChannelSubscription = this.webrtc.dataChannel$.subscribe(data => {
      if (!data) return;
      if ((data as any).type === 'face-scan-request') {
        this.handleFaceScanRequest(data as any);
      } else if ((data as any).type === 'face-scan-status') {
        this.handleStatusMessage(data as any);
      } else if ((data as any).type === 'doctor-info') {
        const d = data as any;
        this.connectedDoctorName = d.doctorName;
        this.doctorDetails = {
          name: d.doctorName,
          specialization: d.specialization,
          bio: d.bio
        };
        console.log('👨‍⚕️ Doctor info received:', this.doctorDetails);
      }
    });
  }

  ngAfterViewInit() {
    // Don't bind local video here - wait until joining
    // Load the medical animation
    this.loadMedicalAnimation();
  }

  ngOnDestroy() {
    if (this.remoteStreamSubscription) {
      this.remoteStreamSubscription.unsubscribe();
    }
    if (this.dataChannelSubscription) {
      this.dataChannelSubscription.unsubscribe();
    }
    if (this.healthScanSubscription) {
      this.healthScanSubscription.unsubscribe();
    }
    // Destroy lottie animation
    if (this.lottieAnimation) {
      this.lottieAnimation.destroy();
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
        const newStream = this.remoteStream;
        const currentStream = videoElement.srcObject as MediaStream | null;
        const assignStream = () => {
          try { videoElement.pause(); } catch {}
          try { (videoElement as any).srcObject = null; } catch {}
          (videoElement as any).srcObject = newStream;
          console.log('✅ Remote video srcObject assigned (patient)');
        };
        if (!currentStream || currentStream.id !== newStream.id) {
          assignStream();
        }
        const tryPlay = () => {
          videoElement.play().then(() => {
            console.log('▶️ Remote video started playing successfully (patient)');
          }).catch(e => {
            console.warn('⚠️ Remote video autoplay failed (patient):', e);
            videoElement.muted = true;
            videoElement.play().catch(e2 => {
              console.error('❌ Remote video play failed even with muted (patient):', e2);
            });
          });
        };
        if (videoElement.readyState >= 2) {
          tryPlay();
        } else {
          videoElement.onloadedmetadata = () => {
            videoElement.onloadedmetadata = null;
            tryPlay();
          };
          setTimeout(() => {
            if (videoElement.readyState >= 2) {
              tryPlay();
            }
          }, 100);
        }
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
      // Clear any stale video element bindings before (re)joining
      try {
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = null as any;
        }
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = null as any;
        }
      } catch {}

      // Ensure clean state before (re)joining
      try {
        const existingRoom = this.webrtc.getCurrentRoomId();
        if (existingRoom) {
          await this.webrtc.leave();
          await this.webrtc.initPeer();
        }
      } catch (e) {
        console.warn('⚠️ Cleanup before join failed or not needed:', e);
      }

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

        // Nudge remote stream binding after join
        setTimeout(() => {
          this.refreshRemoteStream();
        }, 1500);
        setTimeout(() => {
          this.refreshRemoteStream();
        }, 3000);
        // Nudge negotiation in case tracks didn't sync
        setTimeout(() => {
          this.webrtc.triggerNegotiation();
        }, 1800);

        // Send patient information after successful join
        this.sendPatientInformation();
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
    try {
      if (this.remoteVideoRef?.nativeElement) {
        this.remoteVideoRef.nativeElement.srcObject = null as any;
      }
      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = null as any;
      }
    } catch {}
  }

  // Send patient information to the doctor
  private sendPatientInformation(): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      console.warn('⚠️ No authenticated user found, cannot send patient information');
      return;
    }

    // Wait for data channel to be ready before sending
    this.waitForDataChannelAndSendInfo(currentUser);
  }

  // Wait for data channel to be ready and then send patient info
  private async waitForDataChannelAndSendInfo(currentUser: any): Promise<void> {
    try {
      console.log('🔍 Waiting for data channel to be ready...');
      const isReady = await this.webrtc.waitForDataChannel(15000); // Wait up to 15 seconds
      
      if (isReady) {
        // Data channel is ready, send patient information
        const patientInfo = {
          type: 'patient-info' as const,
          patientName: currentUser.patientInfo?.fullName || currentUser.email || 'Unknown Patient',
          patientId: currentUser.id,
          email: currentUser.email,
          timestamp: Date.now()
        };
        
        console.log('📡 Sending patient information:', patientInfo);
        this.webrtc.sendPatientInfo(patientInfo);
      } else {
        console.warn('⚠️ Data channel failed to become ready within timeout');
        // Fallback: try to send anyway (it will warn if not ready)
        const patientInfo = {
          type: 'patient-info' as const,
          patientName: currentUser.patientInfo?.fullName || currentUser.email || 'Unknown Patient',
          patientId: currentUser.id,
          email: currentUser.email,
          timestamp: Date.now()
        };
        this.webrtc.sendPatientInfo(patientInfo);
      }
    } catch (error) {
      console.error('❌ Error waiting for data channel:', error);
    }
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
      // Attempt ICE restart for reconnection
      if (this.webrtc.getPeerStatus() !== 'Not Ready') {
        console.log('🧊 Attempting ICE restart to recover remote stream...');
        this.webrtc.restartIce();
      }
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
          case 'scanTimeRemaining':
            console.log('⏱️ Scan time remaining received in patient-meet:', data);
            this.scanTimeRemaining = data.analysisData || 0;
            console.log('⏱️ Updated scan time remaining in patient-meet:', this.scanTimeRemaining);
            break;
          case 'onHealthAnalysisFinished':
            this.faceScanResults = data.analysisData;
            this.faceScanStatus = 'Face scan completed successfully!';
            this.isFaceScanComplete = true;
            this.isFaceScanning = false;
            
            // Convert results to FaceScanResult format for saving
            this.faceScanResultsForSave = this.convertHealthScanResultsToFaceScanResults(data.analysisData);
            
            // Automatically send results to doctor via WebRTC data channel
            this.webrtc.sendFaceScanResults(data.analysisData, 'Face scan completed successfully!');
            
            // Automatically save results to database
            this.saveHealthScanResults();
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

  /**
   * Convert HealthScanResults to FaceScanResult array for saving
   */
  private convertHealthScanResultsToFaceScanResults(healthScanResults: HealthScanResults): FaceScanResult[] {
    const results: FaceScanResult[] = [];

    // Convert vital signs
    if (healthScanResults.vitalSigns) {
      const vs = healthScanResults.vitalSigns;
      
      if (vs.heartRate && vs.heartRate > 0) {
        results.push({
          title: 'Heart Rate',
          description: 'Heart rate measurement from facial blood flow analysis.',
          score: Math.round(vs.heartRate),
          value: `${vs.heartRate.toFixed(1)} bpm`,
          category: 'heartRate',
          status: this.getHeartRateStatus(vs.heartRate),
          color: this.getHeartRateColor(vs.heartRate),
          normalRange: '60-100 bpm'
        });
      }

      if (vs.bloodPressureSystolic && vs.bloodPressureSystolic > 0) {
        results.push({
          title: 'Blood Pressure (Systolic)',
          description: 'Systolic blood pressure assessment.',
          score: Math.round(vs.bloodPressureSystolic),
          value: `${Math.round(vs.bloodPressureSystolic)} mmHg`,
          category: 'systolicPressure',
          status: this.getBloodPressureStatus(vs.bloodPressureSystolic, 'systolic'),
          color: this.getBloodPressureColor(vs.bloodPressureSystolic, 'systolic'),
          normalRange: '90-120 mmHg'
        });
      }

      if (vs.bloodPressureDiastolic && vs.bloodPressureDiastolic > 0) {
        results.push({
          title: 'Blood Pressure (Diastolic)',
          description: 'Diastolic blood pressure assessment.',
          score: Math.round(vs.bloodPressureDiastolic),
          value: `${Math.round(vs.bloodPressureDiastolic)} mmHg`,
          category: 'diastolicPressure',
          status: this.getBloodPressureStatus(vs.bloodPressureDiastolic, 'diastolic'),
          color: this.getBloodPressureColor(vs.bloodPressureDiastolic, 'diastolic'),
          normalRange: '60-80 mmHg'
        });
      }

      if (vs.spo2 && vs.spo2 > 0) {
        results.push({
          title: 'Oxygen Saturation',
          description: 'Blood oxygen level estimation.',
          score: Math.round(vs.spo2),
          value: `${vs.spo2.toFixed(1)}%`,
          category: 'oxygenSaturation',
          status: this.getOxygenSaturationStatus(vs.spo2),
          color: this.getOxygenSaturationColor(vs.spo2),
          normalRange: '95-100%'
        });
      }

      if (vs.respiratoryRate && vs.respiratoryRate > 0) {
        results.push({
          title: 'Respiratory Rate',
          description: 'Breathing rate detected through facial monitoring.',
          score: Math.round(vs.respiratoryRate),
          value: `${vs.respiratoryRate.toFixed(1)} bpm`,
          category: 'respiratoryRate',
          status: this.getRespiratoryRateStatus(vs.respiratoryRate),
          color: this.getRespiratoryRateColor(vs.respiratoryRate),
          normalRange: '12-20 bpm'
        });
      }

      if (vs.stress && vs.stress > 0) {
        results.push({
          title: 'Stress Level',
          description: 'Assessment of stress levels based on facial indicators.',
          score: Math.round(vs.stress),
          value: `${vs.stress.toFixed(2)}`,
          category: 'stress',
          status: this.getStressStatus(vs.stress),
          color: this.getStressColor(vs.stress)
        });
      }

      if (vs.stressScore && vs.stressScore > 0) {
        results.push({
          title: 'Stress Score',
          description: 'Composite stress score from facial analysis.',
          score: Math.round(vs.stressScore),
          value: `${vs.stressScore.toFixed(1)}`,
          category: 'stressScore',
          status: this.getStressScoreStatus(vs.stressScore),
          color: this.getStressScoreColor(vs.stressScore)
        });
      }

      if (vs.hrvSdnn && vs.hrvSdnn > 0) {
        results.push({
          title: 'HRV SDNN',
          description: 'Standard deviation of NN intervals (HRV).',
          score: Math.round(vs.hrvSdnn),
          value: `${vs.hrvSdnn.toFixed(2)} ms`,
          category: 'hrvSdnn',
          status: this.getHrvStatus(vs.hrvSdnn),
          color: this.getHrvColor(vs.hrvSdnn)
        });
      }

      if (vs.hrvRmssd && vs.hrvRmssd > 0) {
        results.push({
          title: 'HRV RMSSD',
          description: 'Root mean square of successive differences (HRV).',
          score: Math.round(vs.hrvRmssd),
          value: `${vs.hrvRmssd.toFixed(2)} ms`,
          category: 'hrvRmssd',
          status: this.getHrvStatus(vs.hrvRmssd),
          color: this.getHrvColor(vs.hrvRmssd)
        });
      }
    }

    // Convert holistic health
    if (healthScanResults.holisticHealth) {
      const hh = healthScanResults.holisticHealth;
      
      if (hh.generalWellness && hh.generalWellness > 0) {
        results.push({
          title: 'Overall Health Score',
          description: 'Your comprehensive health assessment based on facial analysis.',
          score: Math.round(hh.generalWellness),
          value: `${hh.generalWellness.toFixed(1)}%`,
          category: 'overall',
          status: this.getOverallStatus(hh.generalWellness),
          color: this.getOverallColor(hh.generalWellness)
        });
      }
    }

    // Convert risks
    if (healthScanResults.risks) {
      const risks = healthScanResults.risks;
      
      if (risks.cardiovascularRisks) {
        const cvr = risks.cardiovascularRisks;
        
        if (cvr.coronaryHeartDisease && cvr.coronaryHeartDisease > 0) {
          results.push({
            title: 'Risk of Coronary Heart Disease',
            description: 'Coronary artery disease risk assessment.',
            score: cvr.coronaryHeartDisease * 100,
            value: `${(cvr.coronaryHeartDisease * 100).toFixed(2)}%`,
            category: 'coronaryRisk',
            status: this.getRiskStatus(cvr.coronaryHeartDisease * 100),
            color: this.getRiskColor(cvr.coronaryHeartDisease * 100),
            normalRange: '< 5%'
          });
        }

        if (cvr.congestiveHeartFailure && cvr.congestiveHeartFailure > 0) {
          results.push({
            title: 'Risk of Congestive Heart Failure',
            description: 'Cardiovascular risk assessment.',
            score: cvr.congestiveHeartFailure * 100,
            value: `${(cvr.congestiveHeartFailure * 100).toFixed(2)}%`,
            category: 'heartFailureRisk',
            status: this.getRiskStatus(cvr.congestiveHeartFailure * 100),
            color: this.getRiskColor(cvr.congestiveHeartFailure * 100),
            normalRange: '< 2%'
          });
        }

        if (cvr.stroke && cvr.stroke > 0) {
          results.push({
            title: 'Risk of Stroke',
            description: 'Stroke risk assessment based on cardiovascular indicators.',
            score: cvr.stroke * 100,
            value: `${(cvr.stroke * 100).toFixed(2)}%`,
            category: 'strokeRisk',
            status: this.getRiskStatus(cvr.stroke * 100),
            color: this.getRiskColor(cvr.stroke * 100),
            normalRange: '< 2%'
          });
        }

        if (cvr.generalRisk && cvr.generalRisk > 0) {
          results.push({
            title: 'General Cardiovascular Risk',
            description: 'Overall cardiovascular disease risk assessment.',
            score: cvr.generalRisk * 100,
            value: `${(cvr.generalRisk * 100).toFixed(2)}%`,
            category: 'cvdRisk',
            status: this.getRiskStatus(cvr.generalRisk * 100),
            color: this.getRiskColor(cvr.generalRisk * 100),
            normalRange: '< 2%'
          });
        }

        if (cvr.intermittentClaudication && cvr.intermittentClaudication > 0) {
          results.push({
            title: 'Risk of Intermittent Claudication',
            description: 'Peripheral artery disease risk assessment.',
            score: cvr.intermittentClaudication * 100,
            value: `${(cvr.intermittentClaudication * 100).toFixed(2)}%`,
            category: 'intermittentClaudication',
            status: this.getRiskStatus(cvr.intermittentClaudication * 100),
            color: this.getRiskColor(cvr.intermittentClaudication * 100),
            normalRange: '< 2%'
          });
        }
      }

      if (risks.covidRisk && risks.covidRisk.covidRisk && risks.covidRisk.covidRisk > 0) {
        results.push({
          title: 'COVID-19 Risk',
          description: 'COVID-19 risk assessment based on health indicators.',
          score: risks.covidRisk.covidRisk * 100,
          value: `${(risks.covidRisk.covidRisk * 100).toFixed(2)}%`,
          category: 'covidRisk',
          status: this.getRiskStatus(risks.covidRisk.covidRisk * 100),
          color: this.getRiskColor(risks.covidRisk.covidRisk * 100),
          normalRange: '< 5%'
        });
      }
    }

    console.log('✅ Converted health scan results to face scan results:', results);
    return results;
  }

  /**
   * Save health scan results to database
   */
  private saveHealthScanResults(): void {
    if (!this.faceScanResultsForSave || this.faceScanResultsForSave.length === 0) {
      console.log('⚠️ No face scan results to save');
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('⚠️ User not logged in, cannot save health scan results');
      this.saveStatus = 'Please log in to save your health data.';
      this.showSaveErrorModal = true;
      setTimeout(() => {
        this.showSaveErrorModal = false;
      }, 5000);
      return;
    }

    console.log('💾 Saving health scan results to database from patient-meet...');
    console.log('📊 Face scan results to save:', this.faceScanResultsForSave);
    console.log('🔑 Auth token present:', !!token);
    
    this.isSavingToDatabase = true;
    this.saveStatus = 'Saving your health data...';

    this.healthScanSubscription.add(
      this.healthScanService.saveFaceScanResults(this.faceScanResultsForSave).subscribe({
        next: (response) => {
          console.log('✅ Health scan results saved successfully from patient-meet:', response);
          this.isSavingToDatabase = false;
          this.saveStatus = 'Health data submitted successfully!';
          this.showSaveSuccessModal = true;
          
          // Auto-hide success modal after 3 seconds
          setTimeout(() => {
            this.showSaveSuccessModal = false;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Failed to save health scan results from patient-meet:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });
          this.isSavingToDatabase = false;
          
          // Provide more specific error messages
          let errorMessage = 'Failed to save health data. Please try again.';
          if (error.status === 401) {
            errorMessage = 'Please log in to save your health data.';
          } else if (error.status === 403) {
            errorMessage = 'Only patients can save health scan results.';
          } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.saveStatus = errorMessage;
          this.showSaveErrorModal = true;
          
          // Auto-hide error modal after 5 seconds
          setTimeout(() => {
            this.showSaveErrorModal = false;
          }, 5000);
        }
      })
    );
  }

  /**
   * Manual save method (can be called from UI)
   */
  saveHealthScanResultsManually(): void {
    this.saveHealthScanResults();
  }

  /**
   * Close save success modal
   */
  closeSaveSuccessModal(): void {
    this.showSaveSuccessModal = false;
    this.saveStatus = '';
  }

  /**
   * Close save error modal
   */
  closeSaveErrorModal(): void {
    this.showSaveErrorModal = false;
    this.saveStatus = '';
  }

  /**
   * Retry saving health scan results
   */
  retrySaveHealthScanResults(): void {
    this.closeSaveErrorModal();
    this.saveHealthScanResults();
  }

  // Helper methods for status and color determination
  private getHeartRateStatus(hr: number): string {
    if (hr >= 60 && hr <= 100) return 'Excellent';
    if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 120)) return 'Good';
    return 'Poor';
  }

  private getHeartRateColor(hr: number): string {
    if (hr >= 60 && hr <= 100) return 'green';
    if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 120)) return 'orange';
    return 'red';
  }

  private getBloodPressureStatus(bp: number, type: 'systolic' | 'diastolic'): string {
    if (type === 'systolic') {
      if (bp >= 90 && bp <= 120) return 'Excellent';
      if (bp > 120 && bp <= 140) return 'Good';
      return 'Poor';
    } else {
      if (bp >= 60 && bp <= 80) return 'Excellent';
      if (bp > 80 && bp <= 90) return 'Good';
      return 'Poor';
    }
  }

  private getBloodPressureColor(bp: number, type: 'systolic' | 'diastolic'): string {
    if (type === 'systolic') {
      if (bp >= 90 && bp <= 120) return 'green';
      if (bp > 120 && bp <= 140) return 'orange';
      return 'red';
    } else {
      if (bp >= 60 && bp <= 80) return 'green';
      if (bp > 80 && bp <= 90) return 'orange';
      return 'red';
    }
  }

  private getOxygenSaturationStatus(spo2: number): string {
    if (spo2 >= 98) return 'Excellent';
    if (spo2 >= 95) return 'Good';
    return 'Poor';
  }

  private getOxygenSaturationColor(spo2: number): string {
    if (spo2 >= 98) return 'green';
    if (spo2 >= 95) return 'orange';
    return 'red';
  }

  private getRespiratoryRateStatus(rr: number): string {
    if (rr >= 12 && rr <= 20) return 'Excellent';
    if (rr >= 10 && rr <= 24) return 'Good';
    return 'Poor';
  }

  private getRespiratoryRateColor(rr: number): string {
    if (rr >= 12 && rr <= 20) return 'green';
    if (rr >= 10 && rr <= 24) return 'orange';
    return 'red';
  }

  private getStressStatus(stress: number): string {
    if (stress <= 2) return 'Excellent';
    if (stress <= 4) return 'Good';
    if (stress <= 6) return 'Average';
    return 'Poor';
  }

  private getStressColor(stress: number): string {
    if (stress <= 2) return 'green';
    if (stress <= 4) return 'orange';
    if (stress <= 6) return 'yellow';
    return 'red';
  }

  private getStressScoreStatus(score: number): string {
    if (score < 30) return 'Excellent';
    if (score < 60) return 'Good';
    return 'Poor';
  }

  private getStressScoreColor(score: number): string {
    if (score < 30) return 'green';
    if (score < 60) return 'orange';
    return 'red';
  }

  private getHrvStatus(hrv: number): string {
    if (hrv >= 50) return 'Excellent';
    if (hrv >= 30) return 'Good';
    return 'Poor';
  }

  private getHrvColor(hrv: number): string {
    if (hrv >= 50) return 'green';
    if (hrv >= 30) return 'orange';
    return 'red';
  }

  private getOverallStatus(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Poor';
  }

  private getOverallColor(score: number): string {
    if (score >= 80) return 'green';
    if (score >= 60) return 'orange';
    return 'red';
  }

  private getRiskStatus(risk: number): string {
    if (risk < 2) return 'Excellent';
    if (risk < 5) return 'Good';
    if (risk < 10) return 'Average';
    return 'Poor';
  }

  private getRiskColor(risk: number): string {
    if (risk < 2) return 'green';
    if (risk < 5) return 'orange';
    return 'red';
  }

  // Load Medical Lottie Animation
  private async loadMedicalAnimation(): Promise<void> {
    try {
      // Dynamically import lottie-web
      const lottieModule = await import('lottie-web');
      const lottieInstance = lottieModule.default;
      
      if (this.medicalAnimationRef && this.medicalAnimationRef.nativeElement) {
        // Load the medical animation from the public folder
        this.lottieAnimation = lottieInstance.loadAnimation({
          container: this.medicalAnimationRef.nativeElement,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/Doctor.json'
        });
        
        console.log('✅ Medical animation loaded successfully in patient-meet');
      }
    } catch (error) {
      console.error('❌ Error loading medical animation in patient-meet:', error);
      // Fallback: show a simple medical icon or text
      if (this.medicalAnimationRef && this.medicalAnimationRef.nativeElement) {
        this.medicalAnimationRef.nativeElement.innerHTML = '<div class="medical-fallback">🏥</div>';
      }
    }
  }

  // Handle status messages from doctor (prescriptions, diagnoses, lab requests, appointments, etc.)
  private handleStatusMessage(data: any): void {
    console.log('📨 Handling status message:', data);
    
    if (data.status) {
      const status = data.status.toLowerCase();
      
      if (status.includes('prescription created')) {
        // Store the prescription data if available
        if (data.prescriptionData) {
          this.receivedPrescriptions.push(data.prescriptionData);
        }
        this.showNotificationMessage('💊 New Prescription Received', 'prescription', data);
      } else if (status.includes('diagnosis created')) {
        // Store the diagnosis data if available
        if (data.diagnosisData) {
          this.receivedDiagnoses.push(data.diagnosisData);
        }
        this.showNotificationMessage('🔍 New Diagnosis Received', 'diagnosis', data);
      } else if (status.includes('lab request')) {
        // Handle lab request notifications
        this.showNotificationMessage('🧪 Lab Request Created', 'info', data);
      } else if (status.includes('appointment scheduled')) {
        // Handle appointment scheduling notifications
        this.showNotificationMessage('📅 New Appointment Scheduled', 'info', data);
      } else {
        this.showNotificationMessage(data.status, 'info', data);
      }
    }
  }

  // Show notification message
  private showNotificationMessage(message: string, type: 'prescription' | 'diagnosis' | 'info', data?: any): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.notificationData = data;
    this.showNotification = true;
    
    // Auto-hide notification after 5 seconds
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.notificationTimeout = setTimeout(() => {
      this.hideNotification();
    }, 5000);
    
    console.log('🔔 Notification shown:', { message, type, data });
  }

  // Hide notification
  hideNotification(): void {
    this.showNotification = false;
    this.notificationMessage = '';
    this.notificationType = 'info';
    this.notificationData = null;
    
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  // Mobile dropdown methods
  toggleMobileDropdown(): void {
    this.showMobileDropdown = !this.showMobileDropdown;
  }

  closeMobileDropdown(): void {
    this.showMobileDropdown = false;
  }

  // Refresh doctor info similar to doctor's Toggle details menu
  refreshDoctorDetails(): void {
    // If we already have details, re-request by nudging doctor via patient-info
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      console.warn('⚠️ No authenticated user found, cannot refresh doctor details');
      return;
    }
    // Re-send patient info to prompt doctor to respond with doctor-info
    // Only when data channel is open
    const status = this.webrtc.getDataChannelStatus();
    if (status === 'open') {
      const patientInfo = {
        type: 'patient-info' as const,
        patientName: currentUser.patientInfo?.fullName || currentUser.email || 'Unknown Patient',
        patientId: currentUser.id,
        email: currentUser.email,
        timestamp: Date.now()
      };
      try {
        this.webrtc.sendPatientInfo(patientInfo);
        console.log('📡 Re-sent patient info to refresh doctor details');
      } catch (e) {
        console.warn('Unable to resend patient info for doctor details refresh:', e);
      }
    } else {
      console.warn('📡 Data channel not open; cannot refresh doctor info now');
    }
  }

  // Overlay menu controls
  toggleOverlayMenu(): void {
    this.showOverlayMenu = !this.showOverlayMenu;
  }

  closeOverlayMenu(): void {
    this.showOverlayMenu = false;
  }

  // View details of prescription or diagnosis
  viewDetails(): void {
    if (this.notificationData && (this.notificationType === 'prescription' || this.notificationType === 'diagnosis')) {
      this.detailsType = this.notificationType;
      this.detailsData = this.notificationData;
      this.showDetailsModal = true;
      this.hideNotification();
    }
  }

  // Close details modal
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.detailsType = null;
    this.detailsData = null;
  }

  // Open prescription and diagnosis modal
  openPrescriptionDiagnosisModal(): void {
    this.showPrescriptionDiagnosisModal = true;
    this.loadPrescriptionsAndDiagnoses();
  }

  // Close prescription and diagnosis modal
  closePrescriptionDiagnosisModal(): void {
    this.showPrescriptionDiagnosisModal = false;
    this.prescriptions = [];
    this.diagnoses = [];
  }

  // Load prescriptions and diagnoses
  private loadPrescriptionsAndDiagnoses(): void {
    this.isLoadingPrescriptions = true;
    this.isLoadingDiagnoses = true;

    // Simulate loading delay
    setTimeout(() => {
      // Use received prescriptions and diagnoses from doctor
      this.prescriptions = [...this.receivedPrescriptions];
      this.diagnoses = [...this.receivedDiagnoses];

      this.isLoadingPrescriptions = false;
      this.isLoadingDiagnoses = false;
    }, 500);
  }

  // View specific prescription details
  viewPrescriptionDetails(prescription: any): void {
    this.detailsType = 'prescription';
    this.detailsData = prescription;
    this.showDetailsModal = true;
    this.closePrescriptionDiagnosisModal();
  }

  // View specific diagnosis details
  viewDiagnosisDetails(diagnosis: any): void {
    this.detailsType = 'diagnosis';
    this.detailsData = diagnosis;
    this.showDetailsModal = true;
    this.closePrescriptionDiagnosisModal();
  }
}