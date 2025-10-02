import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { WebRTCService } from '../../../services/webrtc.service';
import { ActivatedRoute } from '@angular/router';
import { FaceScanService, FaceScanRequest } from '../../../services/face-scan.service';
import { PrescriptionsService, CreatePrescriptionRequest, Prescription, Patient } from '../../../services/prescriptions.service';
import { ConsultationsService, CreateDirectConsultationRequest, Consultation } from '../../../services/consultations.service';
import { DiagnosesService, CreateDiagnosisRequest, Diagnosis, DiagnosisSeverity, DiagnosisStatus } from '../../../services/diagnoses.service';
import { PatientService, PatientInfo } from '../../../services/patient.service';
import { AppointmentsService } from '../../../services/appointments.service';
import { OrganizationsService, Organization } from '../../../services/organizations.service';
import { DoctorsService } from '../../../services/doctors.service';
import { LabRequestService, LabRequestForm } from '../../../services/lab-request.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HealthReportDisplayComponent, HealthScanResults } from '../../../shared/components/health-report-display/health-report-display.component';

// Type declaration for lottie-web
declare const lottie: any;

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
  isMicrophoneOn: boolean = true;
  copySuccessMessage: string = '';
  showRejoinInput: boolean = false;
  rejoinRoomId: string = '';
  
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
  prescriptionForms: any[] = []; // Array to hold multiple prescription forms
  prescriptionForm: any = {
    patientId: null, // Will be auto-populated from consultation context
    consultationId: null, // Will be auto-populated from consultation context
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
  prescriptions: Prescription[] = [];
  isSubmittingPrescription: boolean = false;
  prescriptionError: string = '';
  prescriptionSuccess: string = '';
  
  // Consultation context properties
  currentConsultation: any = null;
  currentPatient: any = null;
  consultationId: number | null = null;
  patientId: string | null = null;
  
  // Patient details properties
  patientDetails: PatientInfo | null = null;
  isLoadingPatientDetails: boolean = false;
  patientDetailsError: string = '';
  recentActivity: any[] = [];
  connectedPatientName: string = '';
  connectedPatientId: string | null = null;
  
  // Diagnosis properties
  showDiagnosisModal: boolean = false;
  diagnosisForm: any = {
    patientId: null,
    consultationId: null,
    diagnosisCode: '',
    diagnosisName: '',
    description: '',
    severity: DiagnosisSeverity.MILD,
    status: DiagnosisStatus.ACTIVE,
    onsetDate: null,
    diagnosedAt: new Date(),
    resolvedAt: null,
    notes: '',
    isPrimary: false
  };
  diagnoses: Diagnosis[] = [];
  isSubmittingDiagnosis: boolean = false;
  diagnosisError: string = '';
  diagnosisSuccess: string = '';
  
  // Lab Request properties
  showLabRequestModal: boolean = false;
  labRequestForm: LabRequestForm = {
    patientId: '',
    doctorId: '',
    organizationId: '',
    consultationId: '',
    note: '',
    status: 'PENDING',
    priority: 'NORMAL',
    requestedTests: '',
    instructions: ''
  };
  isSubmittingLabRequest: boolean = false;
  labRequestError: string = '';
  labRequestSuccess: string = '';
  
  // Lab Request Enums for template
  LabRequestStatus = {
    PENDING: 'PENDING' as const,
    IN_PROGRESS: 'IN_PROGRESS' as const,
    COMPLETED: 'COMPLETED' as const,
    CANCELLED: 'CANCELLED' as const,
    REJECTED: 'REJECTED' as const,
    ON_HOLD: 'ON_HOLD' as const
  };
  
  LabRequestPriority = {
    LOW: 'LOW' as const,
    NORMAL: 'NORMAL' as const,
    HIGH: 'HIGH' as const,
    URGENT: 'URGENT' as const
  };
  
  // Schedule to Another Doctor properties
  showScheduleModal: boolean = false;
  scheduleForm: any = {
    patientId: null,
    organizationId: null,
    doctorId: null,
    appointmentDate: '',
    appointmentTime: '',
    priority: 'NORMAL',
    notes: ''
  };
  organizations: Organization[] = [];
  availableDoctors: any[] = [];
  isSubmittingSchedule: boolean = false;
  scheduleError: string = '';
  scheduleSuccess: string = '';

  // Notification properties
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' | 'info' = 'success';
  notificationTimeout: any = null;

  // Mobile dropdown properties
  showMobileDropdown: boolean = false;
  // In-video overlay menu
  showOverlayMenu: boolean = false;
  // End-call area dropdown
  showEndActionsDropdown: boolean = false;

  // Patient details sidebar collapsed state
  isSidebarCollapsed: boolean = this.checkIfMobile();
  
  // Enums for template
  DiagnosisSeverity = DiagnosisSeverity;
  DiagnosisStatus = DiagnosisStatus;
  
  // Lottie animation
  private lottieAnimation: any = null;
  
  private remoteStreamSubscription: any;
  private isBindingRemote: boolean = false;

  constructor(
    public webrtc: WebRTCService,
    private faceScanService: FaceScanService,
    private prescriptionsService: PrescriptionsService,
    private consultationsService: ConsultationsService,
    private diagnosesService: DiagnosesService,
    private patientService: PatientService,
    private appointmentService: AppointmentsService,
    private organizationsService: OrganizationsService,
    private doctorsService: DoctorsService,
    private labRequestService: LabRequestService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute

  ) {}

  ngOnInit() {
    // Set initial sidebar state based on screen size
    this.updateSidebarStateOnResize();
    
    // Add window resize listener to automatically collapse/expand sidebar
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.updateSidebarStateOnResize.bind(this));
    }
    
    // Check for roomId in query parameters
    this.route.queryParams.subscribe(params => {
      if (params['roomId']) {
        this.roomId = params['roomId'];
        console.log('🏠 Room ID from query params, auto-joining:', this.roomId);
        // Auto-join the meeting when roomId is provided
        setTimeout(() => {
          this.join();
        }, 1000); // Small delay to ensure WebRTC is initialized
      } else {
        // Generate a random room ID for the doctor if no roomId provided
        this.generateRoomId();
      }
    });

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
        
        // Patient joined - fetch their name
        this.handlePatientJoined();
      } else {
        console.log('❌ Remote stream cleared');
        // Patient left - clear their name
        this.handlePatientLeft();
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
      } else if (data && (data as any).type === 'patient-info') {
        console.log('📡 Patient info received in doctor component:', data);
        this.handlePatientInfo(data);
        // Ensure doctor info is sent back once data channel is open
        try {
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
          const doctorName = currentUser?.doctorInfo ? `${currentUser.doctorInfo.firstName || ''} ${currentUser.doctorInfo.lastName || ''}`.trim() : (currentUser?.email || 'Doctor');
          const specialization = currentUser?.doctorInfo?.specialization || undefined;
          const bio = currentUser?.doctorInfo?.qualifications ? `Qualifications: ${currentUser.doctorInfo.qualifications}` : undefined;
          if (doctorName) {
            this.webrtc.sendDoctorInfo({
              type: 'doctor-info',
              doctorName,
              specialization,
              bio,
              doctorId: currentUser?.id,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          console.warn('Unable to send doctor info after patient-info:', e);
        }
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

  toggleRejoinInput(): void {
    this.showRejoinInput = !this.showRejoinInput;
  }

  rejoinUsingCode(): void {
    if (!this.rejoinRoomId || !this.rejoinRoomId.trim()) {
      this.errorMessage = 'Please enter a room code to rejoin.';
      return;
    }
    // Set the roomId and reuse join()
    this.roomId = this.rejoinRoomId.trim();
    this.join();
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
    // Load the medical animation
    this.loadMedicalAnimation();
  }

  ngOnDestroy() {
    // Clean up resize listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.updateSidebarStateOnResize.bind(this));
    }
    
    if (this.remoteStreamSubscription) {
      this.remoteStreamSubscription.unsubscribe();
    }
    // Destroy lottie animation
    if (this.lottieAnimation) {
      this.lottieAnimation.destroy();
    }
    // Clear notification timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.leave();
  }

  // Notification management methods
  private showNotificationMessage(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    
    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    // Auto-hide notification after 5 seconds
    this.notificationTimeout = setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  hideNotification(): void {
    this.showNotification = false;
    this.notificationMessage = '';
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

  // Overlay menu controls
  toggleOverlayMenu(): void {
    this.showOverlayMenu = !this.showOverlayMenu;
  }

  closeOverlayMenu(): void {
    this.showOverlayMenu = false;
  }

  // End-call area dropdown controls
  toggleEndActionsDropdown(): void {
    this.showEndActionsDropdown = !this.showEndActionsDropdown;
  }

  closeEndActionsDropdown(): void {
    this.showEndActionsDropdown = false;
  }

  // Toggle patient details sidebar
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // Check if device is mobile (for initial sidebar state)
  private checkIfMobile(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768; // Mobile/Tablet breakpoint
    }
    return false;
  }

  // Update sidebar state based on screen size
  private updateSidebarStateOnResize(): void {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768;
      // Only auto-collapse on mobile, don't auto-expand on desktop
      // This allows user preference to persist on desktop
      if (isMobile && !this.isSidebarCollapsed) {
        this.isSidebarCollapsed = true;
      } else if (!isMobile && this.isSidebarCollapsed) {
        // Auto-expand when switching to desktop
        this.isSidebarCollapsed = false;
      }
    }
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
        if (this.isBindingRemote) {
          console.log('⏳ Skipping bindRemoteVideo: binding in progress');
          return;
        }
        this.isBindingRemote = true;

        const videoElement = this.remoteVideoRef.nativeElement;
        const newStream = this.remoteStream;
        const currentStream = videoElement.srcObject as MediaStream | null;

        const assignStream = () => {
          try { videoElement.pause(); } catch {}
          try { (videoElement as any).srcObject = null; } catch {}
          (videoElement as any).srcObject = newStream;
          console.log('✅ Remote video srcObject assigned');
        };

        if (!currentStream || currentStream.id !== newStream.id) {
          assignStream();
        } else {
          console.log('ℹ️ Remote video already has the correct stream');
        }

        const tryPlay = () => {
          videoElement.play().then(() => {
            console.log('▶️ Remote video started playing successfully');
          }).catch(e => {
            console.warn('⚠️ Remote video autoplay failed:', e);
            videoElement.muted = true;
            videoElement.play().catch(e2 => {
              console.error('❌ Remote video play failed even with muted:', e2);
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
          // If metadata already loaded quickly, fallback after a tick
          setTimeout(() => {
            if (videoElement.readyState >= 2) {
              tryPlay();
            }
          }, 100);
        }
      } catch (error) {
        console.error('❌ Error binding remote video:', error);
      } finally {
        this.isBindingRemote = false;
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

  // Reinitialize audio with enhanced constraints to fix echo issues
  async reinitializeAudio(): Promise<void> {
    if (!this.localStream) {
      console.warn('⚠️ No local stream available for audio reinitialization');
      return;
    }

    try {
      console.log('🔄 Reinitializing audio with enhanced constraints...');
      
      // Stop current audio track
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.stop();
        console.log('🔇 Stopped current audio track');
      }

      // Get new audio track with enhanced constraints
      const enhancedConstraints = this.webrtc.getEnhancedAudioConstraints();
      const newStream = await navigator.mediaDevices.getUserMedia(enhancedConstraints);
      
      if (newStream && newStream.getAudioTracks().length > 0) {
        // Replace audio track in existing stream
        const newAudioTrack = newStream.getAudioTracks()[0];
        const sender = this.webrtc.getPeerConnection()?.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        );
        
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
          console.log('✅ Audio track replaced with enhanced constraints');
        }

        // Update local stream reference
        this.localStream = newStream;
        this.isMicrophoneOn = true;
        
        console.log('🎤 Audio reinitialized successfully with echo cancellation');
      }
    } catch (error) {
      console.error('❌ Error reinitializing audio:', error);
    }
  }

  toggleMicrophone() {
    if (!this.localStream) return;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      if (this.isMicrophoneOn) {
        // Turn off microphone
        audioTrack.enabled = false;
        this.isMicrophoneOn = false;
        console.log('🎤 Microphone turned OFF');
      } else {
        // Turn on microphone
        audioTrack.enabled = true;
        this.isMicrophoneOn = true;
        console.log('🎤 Microphone turned ON');
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

      // Get user media with enhanced audio constraints and wait for the stream
      console.log('📷 Getting user media with enhanced audio constraints...');
      const enhancedConstraints = this.webrtc.getEnhancedAudioConstraints();
      const mediaStream = await this.webrtc.getUserMedia(enhancedConstraints);
      
      if (!mediaStream) {
        throw new Error('Failed to get camera access');
      }
      
      console.log('✅ User media obtained:', mediaStream);
      console.log('📹 Media tracks:', mediaStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      // Log debug information before joining
      console.log('🔍 Pre-join debug info:');
      this.webrtc.logDebugInfo();
      
      const result = await this.webrtc.join(this.roomId);
      if (result.ok) {
        this.isJoined = true;
        this.participants = result.participants || 0;
        this.currentRole = result.role || '';
        console.log('✅ Doctor joined room successfully:', result);
        
        // Log debug information after joining
        console.log('🔍 Post-join debug info:');
        this.webrtc.logDebugInfo();
        
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
        
        // Enhanced remote stream binding with better timing for remote connections
        setTimeout(async () => {
          this.refreshRemoteStream();
          console.log('🔍 Debug after first remote stream refresh:');
          this.webrtc.logDebugInfo();
          
          // Wait for remote tracks to be established
          console.log('⏳ Waiting for remote tracks...');
          const tracksReady = await this.webrtc.waitForRemoteTracks(10000);
          if (tracksReady) {
            console.log('✅ Remote tracks established successfully');
            this.refreshRemoteStream();
          } else {
            console.warn('⚠️ Remote tracks not established, triggering negotiation...');
            this.webrtc.triggerNegotiation();
          }
        }, 1500);
        
        setTimeout(async () => {
          this.refreshRemoteStream();
          console.log('🔍 Debug after second remote stream refresh:');
          this.webrtc.logDebugInfo();
          
          // Check data channel readiness
          const dataChannelReady = await this.webrtc.waitForDataChannel(5000);
          if (dataChannelReady) {
            console.log('✅ Data channel is ready');
          } else {
            console.warn('⚠️ Data channel not ready');
          }
        }, 3000);
        
        // Nudge negotiation in case tracks didn't sync - important for remote connections
        setTimeout(() => {
          console.log('🔄 Triggering negotiation for remote connection...');
          this.webrtc.triggerNegotiation();
        }, 1800);
        
        // Additional negotiation attempts for remote connections
        setTimeout(() => {
          console.log('🔄 Second negotiation attempt for remote connection...');
          this.webrtc.triggerNegotiation();
        }, 5000);

        // Load patient details when doctor joins
        this.loadPatientDetails();
      } else {
        this.errorMessage = result.error || 'Failed to join room';
        console.error('❌ Failed to join room:', result);
        console.log('🔍 Debug info after failed join:');
        this.webrtc.logDebugInfo();
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
    this.isMicrophoneOn = true;
    console.log('🚪 Doctor left the room');
    try {
      if (this.remoteVideoRef?.nativeElement) {
        this.remoteVideoRef.nativeElement.srcObject = null as any;
      }
      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = null as any;
      }
    } catch {}
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
      
      // Wait for data channel to be ready using the improved method
      this.waitForDataChannelAndSendRequest();
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

  // Wait for data channel to be ready and send face scan request
  private async waitForDataChannelAndSendRequest(): Promise<void> {
    try {
      console.log('⏳ Waiting for data channel to be ready...');
      const isReady = await this.webrtc.waitForDataChannel(15000); // Wait up to 15 seconds
      
      if (isReady) {
        console.log('✅ Data channel is now ready, proceeding with face scan...');
        this.faceScanStatus = 'Data channel ready. Sending face scan request...';
        
        // Send the face scan request
        setTimeout(() => {
          this.webrtc.sendFaceScanRequest({
            type: 'face-scan-request',
            roomId: this.roomId,
            timestamp: Date.now()
          });
          
          console.log('✅ Face scan request sent successfully');
          this.monitorPatientScanProgress();
          this.setFaceScanTimeout();
        }, 1000);
      } else {
        this.faceScanStatus = 'Data channel failed to connect. Please check your connection.';
        this.isFaceScanning = false;
        console.error('❌ Data channel failed to connect within timeout');
      }
    } catch (error) {
      console.error('❌ Error waiting for data channel:', error);
      this.faceScanStatus = 'Error waiting for connection. Please try again.';
      this.isFaceScanning = false;
    }
  }

  // Legacy method for backward compatibility
  private waitForDataChannel(): void {
    console.log('⚠️ Using legacy waitForDataChannel method, consider updating to waitForDataChannelAndSendRequest');
    this.waitForDataChannelAndSendRequest();
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
    // Check if patient is connected
    if (!this.remoteStream) {
      this.prescriptionError = 'Patient must be connected to create a prescription.';
      return;
    }

    // Check if doctor is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'DOCTOR') {
      this.prescriptionError = 'Only doctors can create prescriptions.';
      return;
    }

    // Initialize consultation context
    this.initializeConsultationContext();

    // Ensure patient data is loaded before showing modal
    this.ensurePatientDataLoaded();

    this.showPrescriptionModal = true;
    this.resetPrescriptionForm();
    this.initializePrescriptionForms();
    this.prescriptionError = '';
    this.prescriptionSuccess = '';
  }

  // Initialize consultation context for prescription
  private initializeConsultationContext(): void {
    // In a real implementation, this would come from:
    // 1. URL parameters (consultation ID)
    // 2. Route state
    // 3. Service call to get current consultation
    // 4. WebRTC data channel communication with patient
    
    // For now, we'll create a real consultation
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.patientId = this.getPatientIdFromContext();
    
    // Set initial patient info (will be updated when patient connects)
    this.currentPatient = {
      id: this.patientId,
      fullName: null, // Will be updated when patient connects and data is loaded
      email: null
    };
    
    // Create consultation if not already exists
    console.log('🔍 initializeConsultationContext - consultationId:', this.consultationId, 'patientId:', this.patientId);
    if (!this.consultationId && this.patientId) {
      console.log('🏥 Creating consultation because consultationId is null and patientId exists');
      this.createConsultation();
    } else {
      console.log('⏭️ Skipping consultation creation - consultationId:', this.consultationId, 'patientId:', this.patientId);
    }
  }

  // Load patient data and create consultation
  private loadPatientDataAndCreateConsultation(): void {
    console.log('🔍 Loading patient data and creating consultation...');
    
    this.prescriptionsService.getAvailablePatients().subscribe({
      next: (response) => {
        console.log('📊 Patient data response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          // Use the first available patient
          const firstPatient: Patient = response.data[0];
          console.log('👤 First patient data:', firstPatient);
          
          this.patientId = firstPatient.id;
          this.currentPatient = {
            id: firstPatient.id,
            fullName: firstPatient.fullName || 'Unknown Patient',
            email: firstPatient.email
          };
          
          // Update the prescription form with the actual patient ID
          this.prescriptionForm.patientId = this.patientId;
          // Keep diagnosis form in sync with the resolved patient context
          if (this.diagnosisForm) {
            this.diagnosisForm.patientId = this.patientId;
          }
          
          console.log('✅ Loaded actual patient data:', this.currentPatient);
          console.log('📋 Updated prescription form patientId:', this.prescriptionForm.patientId);
          
          // Now create a consultation
          this.createConsultation();
        } else {
          console.warn('⚠️ No patients available, using fallback data');
          console.log('📊 Response data:', response.data);
          this.createConsultation(); // Still try to create consultation with fallback data
        }
      },
      error: (error) => {
        console.error('❌ Error loading patient data:', error);
        console.warn('⚠️ Using fallback patient data');
        
        // Ensure we still have a valid patient ID for testing
        if (!this.patientId) {
          this.patientId = '550e8400-e29b-41d4-a716-446655440005'; // Fallback to first seeded patient UUID
          this.prescriptionForm.patientId = this.patientId;
          if (this.diagnosisForm) {
            this.diagnosisForm.patientId = this.patientId;
          }
          console.log('🔄 Using fallback patient ID:', this.patientId);
        }
        
        // Still try to create consultation
        this.createConsultation();
      }
    });
  }

  // Create a consultation for the prescription
  private createConsultation(): void {
    console.log('🏥 Creating consultation for prescription...');
    
    const consultationData: CreateDirectConsultationRequest = {
      patientId: this.patientId!,
      startTime: new Date(),
      notes: 'Direct consultation from doctor-meet for prescription',
      diagnosis: 'Consultation for prescription management',
      treatment: 'Prescription-based treatment'
    };

    this.consultationsService.createDirectConsultation(consultationData).subscribe({
      next: (response) => {
        console.log('📊 Consultation creation response:', response);
        
        if (response.success && response.data) {
          this.consultationId = response.data.id;
          this.currentConsultation = {
            id: this.consultationId,
            doctorId: response.data.doctorId,
            patientId: response.data.patientId,
            startTime: new Date(response.data.startTime),
            status: 'active'
          };
          
          // Update the prescription form with the consultation ID
          this.prescriptionForm.consultationId = this.consultationId;
          // Also update diagnosis form with the consultation ID
          if (this.diagnosisForm) {
            this.diagnosisForm.consultationId = this.consultationId;
          }
          
          console.log('✅ Consultation created successfully:', this.currentConsultation);
          console.log('📋 Updated prescription form consultationId:', this.prescriptionForm.consultationId);
          console.log('📋 Updated diagnosis form consultationId:', this.diagnosisForm?.consultationId);
          console.log('🔍 consultationId type:', typeof this.consultationId, 'value:', this.consultationId);
          console.log('🔍 currentConsultation.id type:', typeof this.currentConsultation.id, 'value:', this.currentConsultation.id);
        } else {
          console.warn('⚠️ Failed to create consultation:', response.message);
          this.consultationId = null;
        }
      },
      error: (error) => {
        console.error('❌ Error creating consultation:', error);
        this.consultationId = null;
        console.warn('⚠️ Will proceed without consultation ID');
      }
    });
  }

  // Load actual patient data from database (legacy method - kept for compatibility)
  private loadPatientData(): void {
    console.log('🔍 Loading patient data from database...');
    
    this.prescriptionsService.getAvailablePatients().subscribe({
      next: (response) => {
        console.log('📊 Patient data response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          // Use the first available patient
          const firstPatient: Patient = response.data[0];
          console.log('👤 First patient data:', firstPatient);
          
          this.patientId = firstPatient.id;
          this.currentPatient = {
            id: firstPatient.id,
            fullName: firstPatient.fullName || 'Unknown Patient',
            email: firstPatient.email
          };
          
          // Update the prescription form with the actual patient ID
          this.prescriptionForm.patientId = this.patientId;
          if (this.diagnosisForm) {
            this.diagnosisForm.patientId = this.patientId;
          }
          
          console.log('✅ Loaded actual patient data:', this.currentPatient);
          console.log('📋 Updated prescription form patientId:', this.prescriptionForm.patientId);
        } else {
          console.warn('⚠️ No patients available, using fallback data');
          console.log('📊 Response data:', response.data);
        }
      },
      error: (error) => {
        console.error('❌ Error loading patient data:', error);
        console.warn('⚠️ Using fallback patient data');
        
        // Ensure we still have a valid patient ID for testing
        if (!this.patientId) {
          this.patientId = '550e8400-e29b-41d4-a716-446655440005'; // Fallback to first seeded patient UUID
          this.prescriptionForm.patientId = this.patientId;
          if (this.diagnosisForm) {
            this.diagnosisForm.patientId = this.patientId;
          }
          console.log('🔄 Using fallback patient ID:', this.patientId);
        }
      }
    });
  }

  // Generate a consultation ID (in real app, this would come from consultation service)
  private generateConsultationId(): number {
    // In production, this should be the actual consultation ID from the database
    // Generate a smaller integer that fits in INT4 (32-bit signed integer)
    // Using a simple counter or smaller timestamp
    return Math.floor(Math.random() * 1000000) + 1; // Random ID between 1 and 1000000
  }

  // Get patient ID from context (in real app, this would come from consultation data)
  private getPatientIdFromContext(): string {
    // In production, this should be extracted from:
    // 1. Consultation data
    // 2. WebRTC connection context
    // 3. Route parameters
    // 4. Service call
    
    // Use connected patient ID if available, otherwise fallback to seeded patient
    if (this.connectedPatientId) {
      return this.connectedPatientId;
    }
    
    // For now, return the first available patient ID from seeded data
    // Based on seed.ts: Admin(1), Doctors(2,3), Patients(4,5,6)
    // In real implementation, this would be the actual patient ID from the consultation
    return '550e8400-e29b-41d4-a716-446655440005'; // First patient UUID from seeded data
  }

  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
    this.resetPrescriptionForm();
    this.initializePrescriptionForms(); // Initialize with one empty form
    this.prescriptionError = '';
    this.prescriptionSuccess = '';
  }

  resetPrescriptionForm(): void {
    this.prescriptionForm = {
      patientId: this.patientId, // Auto-populated from consultation context
      consultationId: this.consultationId || null, // Auto-populated from consultation context (can be null)
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

  // Initialize prescription forms array with one empty form
  initializePrescriptionForms(): void {
    this.prescriptionForms = [{
      id: 1,
      patientId: this.patientId,
      consultationId: this.consultationId || null,
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
    }];
  }

  // Add a new prescription form
  addPrescriptionForm(): void {
    const newId = this.prescriptionForms.length > 0 ? Math.max(...this.prescriptionForms.map(f => f.id)) + 1 : 1;
    this.prescriptionForms.push({
      id: newId,
      patientId: this.patientId,
      consultationId: this.consultationId || null,
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
    });
  }

  // Remove a prescription form (only if more than one exists)
  removePrescriptionForm(index: number): void {
    if (this.prescriptionForms.length > 1) {
      this.prescriptionForms.splice(index, 1);
    }
  }

  // Get the next available ID for prescription forms
  getNextPrescriptionId(): number {
    return this.prescriptionForms.length > 0 ? Math.max(...this.prescriptionForms.map(f => f.id)) + 1 : 1;
  }

  // Ensure patient data is loaded before showing prescription modal
  private ensurePatientDataLoaded(): void {
    // If we already have patient details, use that
    if (this.patientDetails && this.patientDetails.fullName) {
      this.currentPatient = {
        id: this.patientId,
        fullName: this.patientDetails.fullName,
        email: 'Not provided'
      };
      return;
    }

    // If we have connected patient name, use that
    if (this.connectedPatientName) {
      this.currentPatient = {
        id: this.patientId,
        fullName: this.connectedPatientName,
        email: 'Not provided'
      };
      return;
    }

    // If we have currentPatient but no fullName, try to load it
    if (this.patientId) {
      this.loadPatientDetails();
    }
  }

  // Get current patient name from multiple sources
  getCurrentPatientName(): string {
    // First check if a patient is actually connected
    if (!this.remoteStream) {
      console.log('🔍 getCurrentPatientName: No remote stream, returning "No Patient Connected"');
      return 'No Patient Connected';
    }
    
    console.log('🔍 getCurrentPatientName: Remote stream exists, checking patient data');
    console.log('🔍 patientDetails:', this.patientDetails);
    console.log('🔍 currentPatient:', this.currentPatient);
    console.log('🔍 connectedPatientName:', this.connectedPatientName);
    
    // Priority order: patientDetails > currentPatient > connectedPatientName > fallback
    if (this.patientDetails && this.patientDetails.fullName) {
      console.log('🔍 Returning patientDetails.fullName:', this.patientDetails.fullName);
      return this.patientDetails.fullName;
    }
    
    if (this.currentPatient && this.currentPatient.fullName) {
      console.log('🔍 Returning currentPatient.fullName:', this.currentPatient.fullName);
      return this.currentPatient.fullName;
    }
    
    if (this.connectedPatientName) {
      console.log('🔍 Returning connectedPatientName:', this.connectedPatientName);
      return this.connectedPatientName;
    }
    
    console.log('🔍 Returning "Patient Name Loading..."');
    return 'Patient Name Loading...';
  }

  // Update prescription forms with current patient data
  private updatePrescriptionFormsWithPatientData(): void {
    if (this.prescriptionForms && this.prescriptionForms.length > 0) {
      this.prescriptionForms.forEach(form => {
        form.patientId = this.patientId;
        form.consultationId = this.consultationId;
      });
    }
  }

  // Refresh patient name display (useful for debugging or manual refresh)
  refreshPatientNameDisplay(): void {
    // Force update the current patient object with the latest data
    if (this.patientDetails && this.patientDetails.fullName) {
      this.currentPatient = {
        id: this.patientId,
        fullName: this.patientDetails.fullName,
        email: 'Not provided'
      };
    }
  }

  // Ensure patient name is loaded before showing diagnosis modal
  ensurePatientNameLoaded(): void {
    // If we don't have patient details, try to load them
    if (!this.patientDetails || !this.patientDetails.fullName) {
      console.log('🔄 Ensuring patient name is loaded for diagnosis modal...');
      this.loadPatientDetails();
    }
    
    // If we have patient details but currentPatient is not set, update it
    if (this.patientDetails && this.patientDetails.fullName && (!this.currentPatient || !this.currentPatient.fullName)) {
      this.currentPatient = {
        id: this.patientId || this.connectedPatientId,
        fullName: this.patientDetails.fullName,
        email: 'Not provided'
      };
      console.log('✅ Updated currentPatient for diagnosis modal:', this.currentPatient);
    }
    
    // If we still don't have a name, try to get it from connected patient name
    if ((!this.currentPatient || !this.currentPatient.fullName) && this.connectedPatientName) {
      this.currentPatient = {
        id: this.patientId || this.connectedPatientId,
        fullName: this.connectedPatientName,
        email: 'Not provided'
      };
      console.log('✅ Used connectedPatientName for diagnosis modal:', this.currentPatient);
    }
  }


  async submitPrescription(): Promise<void> {
    // Update prescription forms with current patient and consultation data
    this.updatePrescriptionFormsWithPatientData();
    
    // Validate all prescription forms
    if (!this.validateAllPrescriptionForms()) {
      return;
    }

    // Ensure we have valid patient context
    if (!this.patientId) {
      this.prescriptionError = 'Patient context is required to create a prescription.';
      this.showNotificationMessage('❌ Patient context is required to create a prescription.', 'error');
      return;
    }

    // Check if consultation was created successfully
    if (!this.consultationId) {
      this.prescriptionError = 'Consultation is required to create a prescription. Please wait for consultation to be created.';
      this.showNotificationMessage('❌ Consultation is required. Please wait for consultation to be created.', 'error');
      return;
    }

    this.isSubmittingPrescription = true;
    this.prescriptionError = '';
    this.prescriptionSuccess = '';

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each prescription form
      for (let i = 0; i < this.prescriptionForms.length; i++) {
        const form = this.prescriptionForms[i];
        
        // Skip empty forms (where medication name is not filled)
        if (!form.medicationName || form.medicationName.trim() === '') {
          continue;
        }

        // Prepare prescription data for API
        const prescriptionData: CreatePrescriptionRequest = {
          patientId: this.patientId, // Use the main patientId property
          consultationId: this.consultationId, // Use the main consultationId property
          medicationName: form.medicationName,
          dosage: form.dosage,
          frequency: form.frequency,
          duration: form.duration,
          instructions: form.instructions,
          quantity: form.quantity,
          refills: form.refills,
          expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
          notes: form.notes
        };

        console.log(`📋 Submitting prescription ${i + 1} with data:`, prescriptionData);
        console.log(`🔍 Debug - Main consultationId: ${this.consultationId}, patientId: ${this.patientId}`);
        console.log(`🔍 Debug - Form consultationId: ${form.consultationId}, patientId: ${form.patientId}`);

        // Validate prescription data
        const validation = this.prescriptionsService.validatePrescriptionData(prescriptionData);
        if (!validation.isValid) {
          errors.push(`Prescription ${i + 1}: ${validation.errors.join(', ')}`);
          errorCount++;
          continue;
        }

        // Create prescription via API
        try {
          const response = await this.prescriptionsService.createPrescription(prescriptionData).toPromise();
          
          if (response && response.success && response.data) {
            // Add to local prescriptions list
            this.prescriptions.push(response.data as Prescription);
            successCount++;

            // Send prescription notification to patient via WebRTC data channel
            this.webrtc.sendFaceScanStatus({
              type: 'face-scan-status',
              status: `Prescription Created: ${prescriptionData.medicationName} - ${prescriptionData.dosage}`,
              timestamp: Date.now(),
              prescriptionData: response.data
            });
            
            console.log(`✅ Prescription ${i + 1} created successfully:`, response.data);
          } else {
            errors.push(`Prescription ${i + 1}: ${response?.message || 'Failed to create prescription'}`);
            errorCount++;
          }
        } catch (error: any) {
          console.error(`❌ Error creating prescription ${i + 1}:`, error);
          errors.push(`Prescription ${i + 1}: ${error.error?.message || 'Error creating prescription'}`);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        this.closePrescriptionModal();
        this.showNotificationMessage(`✅ ${successCount} prescription(s) created and saved successfully!`, 'success');
      } else if (successCount > 0 && errorCount > 0) {
        this.prescriptionError = `Partially successful: ${successCount} prescription(s) created, ${errorCount} failed. Errors: ${errors.join('; ')}`;
        this.showNotificationMessage(`⚠️ ${successCount} prescription(s) created, ${errorCount} failed.`, 'info');
      } else {
        this.prescriptionError = `All prescriptions failed. Errors: ${errors.join('; ')}`;
        this.showNotificationMessage('❌ Failed to create prescriptions. Please try again.', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error submitting prescriptions:', error);
      this.prescriptionError = 'Error submitting prescriptions. Please try again.';
      this.showNotificationMessage('❌ Failed to create prescriptions. Please try again.', 'error');
    } finally {
      this.isSubmittingPrescription = false;
    }
  }

  validatePrescriptionForm(): boolean {
    const requiredFields = ['medicationName', 'dosage', 'frequency', 'duration'];
    
    for (const field of requiredFields) {
      if (!this.prescriptionForm[field] || this.prescriptionForm[field].trim() === '') {
        const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
        this.showNotificationMessage(`❌ Please fill in the ${fieldName} field.`, 'error');
        return false;
      }
    }

    // Validate quantity if provided
    if (this.prescriptionForm.quantity && (isNaN(this.prescriptionForm.quantity) || this.prescriptionForm.quantity <= 0)) {
      this.showNotificationMessage('❌ Quantity must be a positive number.', 'error');
      return false;
    }

    // Validate refills
    if (this.prescriptionForm.refills < 0) {
      this.showNotificationMessage('❌ Refills cannot be negative.', 'error');
      return false;
    }

    // Validate expiration date if provided
    if (this.prescriptionForm.expiresAt && new Date(this.prescriptionForm.expiresAt) <= new Date()) {
      this.showNotificationMessage('❌ Expiration date must be in the future.', 'error');
      return false;
    }

    return true;
  }

  validateAllPrescriptionForms(): boolean {
    // Check if at least one prescription form has medication name filled
    const hasValidPrescription = this.prescriptionForms.some(form => 
      form.medicationName && form.medicationName.trim() !== ''
    );

    if (!hasValidPrescription) {
      this.prescriptionError = 'At least one prescription with medication name is required.';
      this.showNotificationMessage('❌ At least one prescription with medication name is required.', 'error');
      return false;
    }

    // Validate each filled prescription form
    const requiredFields = ['medicationName', 'dosage', 'frequency', 'duration'];
    
    for (let i = 0; i < this.prescriptionForms.length; i++) {
      const form = this.prescriptionForms[i];
      
      // Skip empty forms
      if (!form.medicationName || form.medicationName.trim() === '') {
        continue;
      }

      // Validate required fields for this form
      for (const field of requiredFields) {
        if (!form[field] || form[field].toString().trim() === '') {
          const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
          this.prescriptionError = `Prescription ${i + 1}: ${fieldName} is required.`;
          this.showNotificationMessage(`❌ Prescription ${i + 1}: Please fill in the ${fieldName} field.`, 'error');
          return false;
        }
      }

      // Validate quantity if provided
      if (form.quantity && (isNaN(form.quantity) || form.quantity <= 0)) {
        this.prescriptionError = `Prescription ${i + 1}: Quantity must be a positive number.`;
        this.showNotificationMessage(`❌ Prescription ${i + 1}: Quantity must be a positive number.`, 'error');
        return false;
      }

      // Validate refills
      if (form.refills < 0) {
        this.prescriptionError = `Prescription ${i + 1}: Refills cannot be negative.`;
        this.showNotificationMessage(`❌ Prescription ${i + 1}: Refills cannot be negative.`, 'error');
        return false;
      }

      // Validate expiration date if provided
      if (form.expiresAt && new Date(form.expiresAt) <= new Date()) {
        this.prescriptionError = `Prescription ${i + 1}: Expiration date must be in the future.`;
        this.showNotificationMessage(`❌ Prescription ${i + 1}: Expiration date must be in the future.`, 'error');
        return false;
      }
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

  // Diagnosis methods
  openDiagnosisModal(): void {
    // Check if patient is connected
    if (!this.remoteStream) {
      this.diagnosisError = 'Patient must be connected to create a diagnosis.';
      return;
    }

    // Check if doctor is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'DOCTOR') {
      this.diagnosisError = 'Only doctors can create diagnoses.';
      return;
    }

    // Initialize consultation context if not already done
    if (!this.consultationId) {
      this.initializeConsultationContext();
    }

    // Ensure patient details are loaded before showing modal
    this.ensurePatientNameLoaded();

    this.showDiagnosisModal = true;
    this.resetDiagnosisForm();
    this.diagnosisError = '';
    this.diagnosisSuccess = '';
  }

  closeDiagnosisModal(): void {
    this.showDiagnosisModal = false;
    this.resetDiagnosisForm();
    this.diagnosisError = '';
    this.diagnosisSuccess = '';
  }

  resetDiagnosisForm(): void {
    this.diagnosisForm = {
      patientId: this.patientId,
      consultationId: this.consultationId || null,
      diagnosisCode: '',
      diagnosisName: '',
      description: '',
      severity: DiagnosisSeverity.MILD,
      status: DiagnosisStatus.ACTIVE,
      onsetDate: null,
      diagnosedAt: new Date(),
      resolvedAt: null,
      notes: '',
      isPrimary: false
    };
  }

  async submitDiagnosis(): Promise<void> {
    if (!this.validateDiagnosisForm()) {
      return;
    }

    // Ensure we have valid patient context
    if (!this.diagnosisForm.patientId) {
      this.diagnosisError = 'Patient context is required to create a diagnosis.';
      this.showNotificationMessage('❌ Patient context is required to create a diagnosis.', 'error');
      return;
    }

    this.isSubmittingDiagnosis = true;
    this.diagnosisError = '';
    this.diagnosisSuccess = '';

    try {
      // Prepare diagnosis data for API
      const diagnosisData: CreateDiagnosisRequest = {
        patientId: this.diagnosisForm.patientId,
        consultationId: this.diagnosisForm.consultationId,
        diagnosisCode: this.diagnosisForm.diagnosisCode || undefined,
        diagnosisName: this.diagnosisForm.diagnosisName,
        description: this.diagnosisForm.description || undefined,
        severity: this.diagnosisForm.severity,
        status: this.diagnosisForm.status,
        onsetDate: this.diagnosisForm.onsetDate ? new Date(this.diagnosisForm.onsetDate) : undefined,
        resolvedAt: this.diagnosisForm.resolvedAt ? new Date(this.diagnosisForm.resolvedAt) : undefined,
        notes: this.diagnosisForm.notes || undefined,
        isPrimary: this.diagnosisForm.isPrimary
      };

      console.log('🔍 Submitting diagnosis with data:', diagnosisData);
      console.log('👤 Current patient ID:', this.patientId);
      console.log('🏥 Current consultation ID:', this.consultationId);

      // Validate diagnosis data
      const validation = this.diagnosesService.validateDiagnosisData(diagnosisData);
      if (!validation.isValid) {
        this.diagnosisError = validation.errors.join(', ');
        this.showNotificationMessage('❌ Please fix validation errors before submitting.', 'error');
        return;
      }

      // Create diagnosis via API
      this.diagnosesService.createDiagnosis(diagnosisData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Add to local diagnoses list
            this.diagnoses.push(response.data as Diagnosis);

            // Send diagnosis notification to patient via WebRTC data channel
            this.webrtc.sendFaceScanStatus({
              type: 'face-scan-status',
              status: `Diagnosis Created: ${diagnosisData.diagnosisName} - ${diagnosisData.severity}`,
              timestamp: Date.now(),
              diagnosisData: response.data // Send the complete diagnosis data
            });
            
            console.log('✅ Diagnosis created successfully:', response.data);
            
            // Close modal and reset form
            this.closeDiagnosisModal();
            
            // Show success notification
            this.showNotificationMessage('✅ Diagnosis created and saved successfully!', 'success');
            
          } else {
            this.diagnosisError = response.message || 'Failed to create diagnosis';
          }
        },
        error: (error) => {
          console.error('❌ Error creating diagnosis:', error);
          this.diagnosisError = error.error?.message || 'Error creating diagnosis. Please try again.';
          this.showNotificationMessage('❌ Failed to create diagnosis. Please try again.', 'error');
        },
        complete: () => {
          this.isSubmittingDiagnosis = false;
        }
      });
      
    } catch (error) {
      console.error('❌ Error submitting diagnosis:', error);
      this.diagnosisError = 'Error submitting diagnosis. Please try again.';
      this.isSubmittingDiagnosis = false;
    }
  }

  validateDiagnosisForm(): boolean {
    const requiredFields = ['diagnosisName'];
    
    for (const field of requiredFields) {
      if (!this.diagnosisForm[field] || this.diagnosisForm[field].trim() === '') {
        const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
        this.showNotificationMessage(`❌ Please fill in the ${fieldName} field.`, 'error');
        return false;
      }
    }

    // Validate onset date if provided
    if (this.diagnosisForm.onsetDate && new Date(this.diagnosisForm.onsetDate) > new Date()) {
      this.showNotificationMessage('❌ Onset date cannot be in the future.', 'error');
      return false;
    }

    // Validate resolved date if provided
    if (this.diagnosisForm.resolvedAt && new Date(this.diagnosisForm.resolvedAt) > new Date()) {
      this.showNotificationMessage('❌ Resolved date cannot be in the future.', 'error');
      return false;
    }

    // Validate onset date vs resolved date
    if (this.diagnosisForm.onsetDate && this.diagnosisForm.resolvedAt && 
        new Date(this.diagnosisForm.onsetDate) > new Date(this.diagnosisForm.resolvedAt)) {
      this.showNotificationMessage('❌ Onset date cannot be after resolved date.', 'error');
      return false;
    }

    return true;
  }

  deleteDiagnosis(index: number): void {
    if (confirm('Are you sure you want to delete this diagnosis?')) {
      this.diagnoses.splice(index, 1);
    }
  }

  editDiagnosis(index: number): void {
    this.diagnosisForm = { ...this.diagnoses[index] };
    this.showDiagnosisModal = true;
  }

  // Handle diagnosis data from WebRTC data channel
  handleDiagnosisData(data: any): void {
    if (data.type === 'diagnosis') {
      console.log('🔍 Diagnosis received:', data.diagnosis);
      // You could add diagnosis to a received diagnoses list here
    }
  }

  // Lab Request methods
  openLabRequestModal(): void {
    // Check if patient is connected
    if (!this.remoteStream) {
      this.labRequestError = 'Patient must be connected to create a lab request.';
      return;
    }

    // Check if doctor is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'DOCTOR') {
      this.labRequestError = 'Only doctors can create lab requests.';
      return;
    }

    // Initialize consultation context if not already done
    if (!this.consultationId) {
      this.initializeConsultationContext();
    }

    // Ensure patient details are loaded before showing modal
    this.ensurePatientNameLoaded();

    this.showLabRequestModal = true;
    this.resetLabRequestForm();
    this.loadOrganizations();
    this.labRequestError = '';
    this.labRequestSuccess = '';
  }

  closeLabRequestModal(): void {
    this.showLabRequestModal = false;
    this.resetLabRequestForm();
    this.labRequestError = '';
    this.labRequestSuccess = '';
  }

  resetLabRequestForm(): void {
    this.labRequestForm = {
      patientId: this.connectedPatientId || this.patientId || '',
      doctorId: '',
      organizationId: '',
      consultationId: this.consultationId?.toString() || '',
      note: '',
      status: 'PENDING',
      priority: 'NORMAL',
      requestedTests: '',
      instructions: ''
    };
  }

  onLabRequestOrganizationChange(): void {
    this.labRequestForm.doctorId = '';
    this.availableDoctors = [];
    
    if (this.labRequestForm.organizationId) {
      this.loadDoctorsByOrganization(this.labRequestForm.organizationId);
    }
  }

  isLabRequestFormValid(): boolean {
    // Check if patient is connected
    if (!this.remoteStream) {
      return false;
    }
    
    // Check if patient name is not "No Patient Connected"
    if (this.getCurrentPatientName() === 'No Patient Connected') {
      return false;
    }
    
    // Check if consultation ID is available
    if (!this.currentConsultation && !this.consultationId) {
      return false;
    }
    
    // Check if all required form fields are filled
    return !!(
      this.labRequestForm.patientId &&
      this.labRequestForm.organizationId &&
      this.labRequestForm.doctorId
    );
  }

  async submitLabRequest(): Promise<void> {
    if (!this.isLabRequestFormValid()) {
      // Provide specific error messages based on what's missing
      if (!this.remoteStream) {
        this.labRequestError = 'Patient must be connected to submit lab request.';
      } else if (this.getCurrentPatientName() === 'No Patient Connected') {
        this.labRequestError = 'Patient information is not available.';
      } else if (!this.currentConsultation && !this.consultationId) {
        this.labRequestError = 'Consultation ID is not available.';
      } else {
        this.labRequestError = 'Please fill in all required fields (Organization and Doctor).';
      }
      return;
    }

    this.isSubmittingLabRequest = true;
    this.labRequestError = '';
    this.labRequestSuccess = '';

    try {
      console.log('🧪 Submitting lab request:', this.labRequestForm);
      console.log('🔍 Current user:', JSON.parse(localStorage.getItem('currentUser') || '{}'));
      console.log('🔍 Token exists:', !!localStorage.getItem('token'));

      // Validate that we have all required data
      if (!this.labRequestForm.patientId) {
        throw new Error('Patient ID is required');
      }
      if (!this.labRequestForm.doctorId) {
        throw new Error('Doctor ID is required');
      }
      if (!this.labRequestForm.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Create the lab request using the service
      const labRequestData: LabRequestForm = {
        patientId: this.labRequestForm.patientId,
        doctorId: this.labRequestForm.doctorId,
        organizationId: this.labRequestForm.organizationId,
        consultationId: this.labRequestForm.consultationId,
        note: this.labRequestForm.note,
        status: this.labRequestForm.status,
        priority: this.labRequestForm.priority,
        requestedTests: this.labRequestForm.requestedTests,
        instructions: this.labRequestForm.instructions
      };

      console.log('🔍 Lab request data to send:', labRequestData);

      const createdLabRequest = await this.labRequestService.createLabRequest(labRequestData).toPromise();
      
      console.log('✅ Lab request created successfully:', createdLabRequest);
      
      this.labRequestSuccess = 'Lab request submitted successfully!';
      
      // Show success notification
      this.showNotificationMessage('🧪 Lab request submitted successfully!', 'success');
      
      // Send notification to patient via WebRTC data channel
      this.webrtc.sendFaceScanStatus({
        type: 'face-scan-status',
        status: 'Lab Request Created: Your doctor has submitted a lab request for you',
        timestamp: Date.now(),
        labRequestData: createdLabRequest
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        this.closeLabRequestModal();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Error submitting lab request:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        error: error?.error
      });
      
      // Extract more specific error message
      let errorMessage = 'Error submitting lab request. Please try again.';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        // Clear localStorage and redirect to login
        localStorage.clear();
        this.showNotificationMessage('❌ Session expired. Please log in again.', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (error?.status === 400) {
        errorMessage = 'Invalid data. Please check your input.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      this.labRequestError = errorMessage;
      
      // Show error notification
      this.showNotificationMessage(`❌ ${errorMessage}`, 'error');
    } finally {
      this.isSubmittingLabRequest = false;
    }
  }

  // Schedule to Another Doctor Methods
  openScheduleModal(): void {
    // Check if patient is connected
    if (!this.remoteStream) {
      this.scheduleError = 'Patient must be connected to schedule appointment.';
      return;
    }

    // Check if doctor is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'DOCTOR') {
      this.scheduleError = 'Only doctors can schedule appointments.';
      return;
    }

    // Ensure patient details are loaded
    this.ensurePatientNameLoaded();

    // Initialize form with current patient data
    this.scheduleForm.patientId = this.patientId || this.connectedPatientId;
    
    this.showScheduleModal = true;
    this.resetScheduleForm();
    this.scheduleError = '';
    this.scheduleSuccess = '';
    
    // Load organizations and doctoaars
    this.loadOrganizations();
  }

  closeScheduleModal(): void {
    this.showScheduleModal = false;
    this.resetScheduleForm();
    this.scheduleError = '';
    this.scheduleSuccess = '';
    this.organizations = [];
    this.availableDoctors = [];
  }

  resetScheduleForm(): void {
    this.scheduleForm = {
      patientId: this.patientId || this.connectedPatientId,
      organizationId: null,
      doctorId: null,
      appointmentDate: '',
      appointmentTime: '',
      priority: 'NORMAL',
      notes: ''
    };
  }

  loadOrganizations(): void {
    this.organizationsService.getOrganizations().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.organizations = response.data;
          console.log('✅ Loaded organizations:', this.organizations);
        } else {
          console.warn('⚠️ Failed to load organizations:', response.message);
          this.organizations = [];
        }
      },
      error: (error) => {
        console.error('❌ Error loading organizations:', error);
        this.organizations = [];
      }
    });
  }

  onOrganizationChange(): void {
    this.scheduleForm.doctorId = null; // Reset doctor selection
    this.loadDoctorsByOrganization(this.scheduleForm.organizationId);
  }

  loadDoctorsByOrganization(organizationId: string): void {
    if (!organizationId) {
      this.availableDoctors = [];
      return;
    }

    this.organizationsService.getDoctorsByOrganization(organizationId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.availableDoctors = response.data.map(doctor => ({
            id: doctor.id,
            firstName: doctor.name.split(' ')[0] || 'Dr.',
            lastName: doctor.name.split(' ').slice(1).join(' ') || '',
            specialization: doctor.specialization
          }));
          console.log('✅ Loaded doctors for organization:', this.availableDoctors);
        } else {
          console.warn('⚠️ Failed to load doctors:', response.message);
          this.availableDoctors = [];
        }
      },
      error: (error) => {
        console.error('❌ Error loading doctors:', error);
        this.availableDoctors = [];
      }
    });
  }

  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  isScheduleFormValid(): boolean {
    return !!(
      this.scheduleForm.patientId &&
      this.scheduleForm.organizationId &&
      this.scheduleForm.doctorId &&
      this.scheduleForm.appointmentDate &&
      this.scheduleForm.appointmentTime
    );
  }

  async submitSchedule(): Promise<void> {
    if (!this.isScheduleFormValid()) {
      this.scheduleError = 'Please fill in all required fields.';
      return;
    }

    this.isSubmittingSchedule = true;
    this.scheduleError = '';
    this.scheduleSuccess = '';

    try {
      // Combine date and time
      const appointmentDateTime = new Date(`${this.scheduleForm.appointmentDate}T${this.scheduleForm.appointmentTime}`);
      
      const appointmentData = {
        patientId: this.scheduleForm.patientId,
        doctorId: this.scheduleForm.doctorId,
        requestedDate: this.scheduleForm.appointmentDate, // Send date in YYYY-MM-DD format
        requestedTime: this.scheduleForm.appointmentTime,
        reason: 'Referred by current doctor',
        priority: this.scheduleForm.priority,
        notes: this.scheduleForm.notes
      };

      console.log('📅 Submitting appointment request:', appointmentData);

      // Call the real API
      const response = await this.appointmentService.createAppointmentRequestByDoctor(appointmentData).toPromise();

      if (response.success) {
        this.scheduleSuccess = `Appointment scheduled successfully for ${this.getCurrentPatientName()}`;
        this.showNotificationMessage('📅 Appointment scheduled successfully!', 'success');
        
        // Send notification to patient via WebRTC data channel
        this.webrtc.sendFaceScanStatus({
          type: 'face-scan-status',
          status: 'Appointment Scheduled: Your doctor has scheduled an appointment with another doctor for you',
          timestamp: Date.now(),
          appointmentData: response.data
        });
        
        // Close modal after a short delay
        setTimeout(() => {
          this.closeScheduleModal();
        }, 2000);
      } else {
        this.scheduleError = response.message || 'Failed to schedule appointment';
      }
    } catch (error: any) {
      console.error('❌ Error scheduling appointment:', error);
      this.scheduleError = error?.error?.message || 'An error occurred while scheduling the appointment';
    } finally {
      this.isSubmittingSchedule = false;
    }
  }

  // Patient Details Methods
  loadPatientDetails(): void {
    if (!this.connectedPatientId && !this.patientId) {
      console.warn('⚠️ No patient ID available for loading details');
      return;
    }

    this.isLoadingPatientDetails = true;
    this.patientDetailsError = '';

    // Use connected patient ID if available, otherwise fall back to patientId
    const targetPatientId = this.connectedPatientId || this.patientId;
    
    if (targetPatientId) {
      this.fetchRealPatientDetails(targetPatientId);
    } else {
      // No patient id available; stop loading and show error
      this.isLoadingPatientDetails = false;
      this.patientDetailsError = 'No patient ID available to load details.';
    }
  }

  // Fetch real patient details from API
  private fetchRealPatientDetails(patientId: string): void {
    console.log('🔍 Fetching real patient details for ID:', patientId);
    
    this.patientService.getPatientInfoByUserId(patientId).subscribe({
      next: (response) => {
        console.log('📊 Real patient data response:', response);
        
        if (response.success && response.data) {
          this.patientDetails = response.data;
          
          // Update connected patient name if not already set
          if (!this.connectedPatientName && response.data.fullName) {
            this.connectedPatientName = response.data.fullName;
          }
          
          // Update current patient object
          this.currentPatient = {
            id: response.data.userId,
            fullName: response.data.fullName,
            email: 'Not provided' // Email not included in PatientInfo
          };

          // If prescription modal is open, update the prescription forms with current patient data
          if (this.showPrescriptionModal) {
            this.updatePrescriptionFormsWithPatientData();
          }
          
          // Load recent activity (placeholder)
          this.loadRecentActivity(patientId);
          
          console.log('✅ Real patient details loaded:', this.patientDetails);
          this.showNotificationMessage(`👤 Patient details loaded: ${response.data.fullName}`, 'success');
        } else {
          console.warn('⚠️ Failed to load real patient data:', response.message);
          this.patientDetailsError = response.message || 'Failed to load patient details';
          this.patientDetails = null;
        }
      },
      error: (error) => {
        console.error('❌ Error fetching real patient details:', error);
        this.patientDetailsError = error?.error?.message || 'Error loading patient details.';
        this.patientDetails = null;
      },
      complete: () => {
        this.isLoadingPatientDetails = false;
      }
    });
  }

  // Load recent activity for the patient
  private loadRecentActivity(patientId: string): void {
    // This would typically fetch from consultations, prescriptions, etc.
    // For now, we'll use mock data
    this.recentActivity = [
      {
        icon: '💊',
        title: 'Prescription Created',
        time: '2 hours ago'
      },
      {
        icon: '🔍',
        title: 'Face Scan Completed',
        time: '1 day ago'
      },
      {
        icon: '📋',
        title: 'Consultation Started',
        time: '2 days ago'
      }
    ];
  }

  private loadMockPatientDetails(): void {
    // Mock patient data - in real implementation, this would come from API
    this.patientDetails = {
      id: 1,
      userId: this.connectedPatientId || this.patientId || 'Unknown ID',
      fullName: this.connectedPatientName || 'Unknown Patient',
      gender: '',
      dateOfBirth: new Date(),
      contactNumber: '',
      address: '',
      weight: 0,
      height: 0,
      bloodType: '',
      medicalHistory: '',
      allergies: '',
      medications: ''
    };

    // Mock recent activity
    this.recentActivity = [
      {
        icon: '💊',
        title: 'Prescription Created',
        time: '2 hours ago'
      },
      {
        icon: '🔍',
        title: 'Face Scan Completed',
        time: '1 day ago'
      },
      {
        icon: '📋',
        title: 'Consultation Started',
        time: '2 days ago'
      }
    ];

    this.isLoadingPatientDetails = false;
    console.log('✅ Mock patient details loaded:', this.patientDetails);
  }

  refreshPatientDetails(): void {
    console.log('🔄 Refreshing patient details...');
    this.loadPatientDetails();
  }

  // Calculate patient age from date of birth
  getPatientAge(): string {
    if (!this.patientDetails?.dateOfBirth) {
      return 'Not specified';
    }
    
    const today = new Date();
    const birthDate = new Date(this.patientDetails.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return `${age} years`;
  }

  // Handle patient joining the meeting
  private handlePatientJoined(): void {
    console.log('👤 Patient joined the meeting');
    
    // Patient information will be sent automatically by the patient component
    // No need to request it manually
    
    // Also send basic doctor info to patient if data channel is open
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const doctorName = currentUser?.doctorInfo ? `${currentUser.doctorInfo.firstName || ''} ${currentUser.doctorInfo.lastName || ''}`.trim() : (currentUser?.email || 'Doctor');
      const specialization = currentUser?.doctorInfo?.specialization || undefined;
      const bio = currentUser?.doctorInfo?.qualifications ? `Qualifications: ${currentUser.doctorInfo.qualifications}` : undefined;
      if (doctorName) {
        this.webrtc.sendDoctorInfo({
          type: 'doctor-info',
          doctorName,
          specialization,
          bio,
          doctorId: currentUser?.id,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.warn('Unable to send doctor info:', e);
    }
    
    // Clear any existing mock data when patient joins
    this.clearMockData();
    
    // Load patient details (will be updated when patient info is received)
    this.loadPatientDetails();
  }

  // Clear mock data when patient joins
  private clearMockData(): void {
    console.log('🧹 Clearing mock patient data');
    this.patientDetails = null;
    this.currentPatient = {
      id: null,
      fullName: null,
      email: null
    };
    this.recentActivity = [];
  }

  // Handle patient leaving the meeting
  private handlePatientLeft(): void {
    console.log('👤 Patient left the meeting');
    this.connectedPatientName = '';
    this.connectedPatientId = null;
    this.patientDetails = null;
    this.currentPatient = {
      id: null,
      fullName: null,
      email: null
    };
    this.recentActivity = [];
  }


  // Handle patient information received from data channel
  private handlePatientInfo(data: any): void {
    console.log('📊 Processing patient information:', data);
    
    if (data.patientName) {
      this.connectedPatientName = data.patientName;
      console.log('✅ Patient name set:', this.connectedPatientName);
    }
    
    if (data.patientId) {
      this.connectedPatientId = data.patientId;
      this.patientId = data.patientId; // Keep for backward compatibility
      console.log('✅ Patient ID set:', this.connectedPatientId);
    }
    
    // Update current patient object
    if (data.patientName || data.patientId) {
      this.currentPatient = {
        id: this.connectedPatientId || this.patientId,
        fullName: this.connectedPatientName || 'Unknown Patient',
        email: data.email || 'Not provided'
      };
    }
    
    // Show notification
    if (this.connectedPatientName) {
      this.showNotificationMessage(`👤 ${this.connectedPatientName} joined the consultation`, 'info');
    }
    
    // Load real patient details now that we have the patient ID
    if (this.connectedPatientId) {
      this.loadPatientDetails();
    }
  }

  // Load Medical Lottie Animation
  private async loadMedicalAnimation(): Promise<void> {
    try {
      // Dynamically import lottie-web with proper ESM handling
      const lottieModule = await import('lottie-web/build/player/lottie_light');
      const lottieInstance = lottieModule.default || lottieModule;
      
      if (this.medicalAnimationRef && this.medicalAnimationRef.nativeElement) {
        // Load the medical animation from the public folder
        this.lottieAnimation = lottieInstance.loadAnimation({
          container: this.medicalAnimationRef.nativeElement,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/Medical.json'
        });
        
        console.log('✅ Medical animation loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error loading medical animation:', error);
      // Fallback: show a simple medical icon or text
      if (this.medicalAnimationRef && this.medicalAnimationRef.nativeElement) {
        this.medicalAnimationRef.nativeElement.innerHTML = '<div class="medical-fallback">🏥</div>';
      }
    }
  }
}
