import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService, User } from '../../../auth/auth.service';

// Interfaces based on Prisma schema
interface PatientPersonalInfo {
  fullName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  weight: number;
  height: number;
  bloodType: string;
  medicalHistory?: string;
  allergies: string[];
  medications: string[];
  profileImage?: string;
}

interface EmergencyContact {
  contactName: string;
  relationship: string;
  contactNumber: string;
  contactAddress?: string;
}

interface InsuranceInfo {
  providerName: string;
  policyNumber: string;
  insuranceContact: string;
}

interface PatientPreferences {
  language: string;
  communicationMethod: string;
}

interface PatientProfile {
  personalInfo: PatientPersonalInfo;
  emergencyContact?: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
  preferences: PatientPreferences;
}

@Component({
  selector: 'app-patient-my-profile',
  templateUrl: './patient-my-profile.component.html',
  styleUrls: ['./patient-my-profile.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  standalone: true
})
export class PatientMyProfileComponent implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('idFileInput') idFileInput!: ElementRef<HTMLInputElement>;

  profile!: PatientProfile;
  isEditing = false;
  selectedImage: File | null = null;
  age: number = 0;

  // Verification modal properties
  showVerificationModal = false;
  philhealthIdFile: File | null = null;
  capturedSelfie: string | null = null;
  isCapturing = false;
  mediaStream: MediaStream | null = null;
  isSubmittingVerification = false;

  // Liveness check modal properties
  showLivenessModal = false;
  isLivenessCheckActive = false;
  currentFlashColor = '';
  flashSequence = ['blue', 'green', 'red', 'yellow'];
  currentFlashIndex = 0;
  livenessCheckComplete = false;

  // Form groups
  profileForm!: FormGroup;

  // Options for dropdowns
  genderOptions = ['MALE', 'FEMALE', 'OTHER'];
  bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  languageOptions = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi'];
  communicationOptions = ['Email', 'Phone', 'SMS', 'In-App'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeProfile();
    this.createForm();
  }

  ngOnInit(): void {
    this.calculateAge();
    this.loadProfile();
  }

  private initializeProfile(): void {
    this.profile = {
      personalInfo: {
        fullName: '',
        email: '',
        gender: 'OTHER',
        dateOfBirth: '1990-01-01',
        contactNumber: '',
        address: '',
        weight: 0,
        height: 0,
        bloodType: '',
        medicalHistory: '',
        allergies: [],
        medications: [],
        profileImage: undefined
      },
      emergencyContact: {
        contactName: '',
        relationship: '',
        contactNumber: '',
        contactAddress: ''
      },
      insuranceInfo: {
        providerName: '',
        policyNumber: '',
        insuranceContact: ''
      },
      preferences: {
        language: 'English',
        communicationMethod: 'Email'
      }
    };
  }

  private createForm(): void {
    this.profileForm = this.fb.group({
      personalInfo: this.fb.group({
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        gender: ['', Validators.required],
        dateOfBirth: ['', Validators.required],
        contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
        address: ['', [Validators.required, Validators.minLength(10)]],
        weight: ['', [Validators.required, Validators.min(20), Validators.max(300)]],
        height: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
        bloodType: ['', Validators.required],
        medicalHistory: [''],
        allergies: [[]],
        medications: [[]]
      }),
      emergencyContact: this.fb.group({
        contactName: ['', Validators.required],
        relationship: ['', Validators.required],
        contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
        contactAddress: ['']
      }),
      insuranceInfo: this.fb.group({
        providerName: [''],
        policyNumber: [''],
        insuranceContact: ['']
      }),
      preferences: this.fb.group({
        language: ['English', Validators.required],
        communicationMethod: ['Email', Validators.required]
      })
    });
  }

  private async loadProfile(): Promise<void> {
    const user = this.authService.currentUserValue || await this.authService.getProfile();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    if (user.role !== 'PATIENT') {
      this.authService.redirectBasedOnRole();
      return;
    }

    const p = user.patientInfo || {
      fullName: '',
      gender: 'OTHER',
      dateOfBirth: '1990-01-01',
      contactNumber: '',
      address: '',
      weight: 0,
      height: 0,
      bloodType: '',
      medicalHistory: '',
      allergies: [],
      medications: [],
      emergencyContact: undefined,
      insuranceInfo: undefined
    };

    this.profile = {
      personalInfo: {
        fullName: p.fullName || '',
        email: user.email,
        gender: p.gender || 'OTHER',
        dateOfBirth: p.dateOfBirth || '1990-01-01',
        contactNumber: p.contactNumber || '',
        address: p.address || '',
        weight: p.weight || 0,
        height: p.height || 0,
        bloodType: p.bloodType || '',
        medicalHistory: p.medicalHistory || '',
        allergies: Array.isArray(p.allergies) ? p.allergies : (p.allergies ? [p.allergies] : []),
        medications: Array.isArray(p.medications) ? p.medications : (p.medications ? [p.medications] : []),
        profileImage: undefined
      },
      emergencyContact: p.emergencyContact ? {
        contactName: p.emergencyContact.contactName,
        relationship: p.emergencyContact.relationship,
        contactNumber: p.emergencyContact.contactNumber,
        contactAddress: p.emergencyContact.contactAddress
      } : undefined,
      insuranceInfo: p.insuranceInfo ? {
        providerName: p.insuranceInfo.providerName,
        policyNumber: p.insuranceInfo.policyNumber,
        insuranceContact: p.insuranceInfo.insuranceContact
      } : undefined,
      preferences: this.profile.preferences
    };

    this.profileForm.patchValue(this.profile);
    this.calculateAge();
  }

  private calculateAge(): void {
    if (this.profile.personalInfo.dateOfBirth) {
      const birthDate = new Date(this.profile.personalInfo.dateOfBirth);
      const today = new Date();
      this.age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        this.age--;
      }
    }
  }

  // Public methods
  onBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }

  onEdit(): void {
    this.isEditing = true;
    this.profileForm.patchValue(this.profile);
  }

  onCancel(): void {
    this.isEditing = false;
    this.selectedImage = null;
    this.profileForm.reset();
    this.loadProfile();
  }

  onSave(): void {
    if (this.profileForm.valid) {
      // In a real app, this would save to a service
      this.profile = this.profileForm.value;
      this.calculateAge();
      this.isEditing = false;
      this.selectedImage = null;
      console.log('Profile saved:', this.profile);
    } else {
      this.markFormGroupTouched();
    }
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
    }
  }

  onUploadImage(): void {
    if (this.selectedImage) {
      // In a real app, this would upload to a service
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profile.personalInfo.profileImage = e.target.result;
        this.selectedImage = null;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  onRemoveImage(): void {
    this.profile.personalInfo.profileImage = undefined;
  }

  onAddItem(array: string[], value: string): void {
    if (value.trim()) {
      array.push(value.trim());
    }
  }

  onRemoveItem(array: string[], index: number): void {
    array.splice(index, 1);
  }

  onInputChange(array: string[], index: number, event: any): void {
    array[index] = event.target.value;
  }

  onSelectChange(array: string[], index: number, event: any): void {
    array[index] = event.target.value;
  }

  // Utility methods
  calculateBMI(): string {
    const weight = this.profile.personalInfo.weight;
    const height = this.profile.personalInfo.height / 100; // Convert cm to meters
    if (weight && height) {
      const bmi = weight / (height * height);
      return bmi.toFixed(1);
    }
    return 'N/A';
  }

  getBMICategory(): string {
    const bmi = parseFloat(this.calculateBMI());
    if (isNaN(bmi)) return 'N/A';
    
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  getIdealWeightRange(): string {
    const height = this.profile.personalInfo.height;
    if (height) {
      const minWeight = Math.round((height - 100) * 0.9);
      const maxWeight = Math.round((height - 100) * 1.1);
      return `${minWeight} - ${maxWeight} kg`;
    }
    return 'N/A';
  }

  getFieldError(section: string, field: string): string {
    const control = this.profileForm.get(`${section}.${field}`);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) return `${field} is required`;
      if (control.errors['minlength']) return `${field} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['min']) return `${field} must be at least ${control.errors['min'].min}`;
      if (control.errors['max']) return `${field} must be at most ${control.errors['max'].max}`;
      if (control.errors['pattern']) return `${field} format is invalid`;
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(subKey => {
          control.get(subKey)?.markAsTouched();
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  get fullName(): string {
    return this.profile.personalInfo.fullName;
  }

  // Verification Modal Methods
  openVerificationModal(): void {
    this.showVerificationModal = true;
    this.resetVerificationData();
  }

  closeVerificationModal(event?: Event): void {
    if (event && event.target !== event.currentTarget) {
      return;
    }
    this.showVerificationModal = false;
    this.stopCamera();
    this.resetVerificationData();
  }

  resetVerificationData(): void {
    this.philhealthIdFile = null;
    this.capturedSelfie = null;
    this.isCapturing = false;
    this.isSubmittingVerification = false;
    this.showLivenessModal = false;
    this.isLivenessCheckActive = false;
    this.currentFlashColor = '';
    this.currentFlashIndex = 0;
    this.livenessCheckComplete = false;
  }

  // PhilHealth ID Upload Methods
  triggerIdUpload(): void {
    this.idFileInput.nativeElement.click();
  }

  onPhilhealthIdSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        this.idFileInput.nativeElement.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a JPG, PNG, or PDF file');
        this.idFileInput.nativeElement.value = '';
        return;
      }
      
      // Process the file
      this.philhealthIdFile = file;
      console.log('PhilHealth ID uploaded:', {
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type
      });
      
      // Show success message
      console.log('PhilHealth ID file uploaded successfully!');
    }
  }

  removePhilhealthId(event: Event): void {
    event.stopPropagation();
    this.philhealthIdFile = null;
    this.idFileInput.nativeElement.value = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Liveness Check Methods
  openLivenessModal(): void {
    this.showLivenessModal = true;
    this.startLivenessCheck();
  }

  closeLivenessModal(event?: Event): void {
    if (event && event.target !== event.currentTarget) {
      return;
    }
    this.showLivenessModal = false;
    this.stopLivenessCheck();
  }

  async startLivenessCheck(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.isLivenessCheckActive = true;
        this.startFlashSequence();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check your permissions.');
      this.closeLivenessModal();
    }
  }

  stopLivenessCheck(): void {
    this.isLivenessCheckActive = false;
    this.currentFlashColor = '';
    this.currentFlashIndex = 0;
    this.stopCamera();
  }

  startFlashSequence(): void {
    if (!this.isLivenessCheckActive) return;

    const flashDuration = 1000; // 1 second per color
    const totalDuration = this.flashSequence.length * flashDuration;

    // Start the flash sequence
    this.flashNextColor();

    // Complete liveness check after all colors
    setTimeout(() => {
      if (this.isLivenessCheckActive) {
        this.completeLivenessCheck();
      }
    }, totalDuration);
  }

  flashNextColor(): void {
    if (!this.isLivenessCheckActive || this.currentFlashIndex >= this.flashSequence.length) {
      return;
    }

    this.currentFlashColor = this.flashSequence[this.currentFlashIndex];
    console.log(`Flashing ${this.currentFlashColor}`);

    // Move to next color after 1 second
    setTimeout(() => {
      this.currentFlashIndex++;
      if (this.currentFlashIndex < this.flashSequence.length) {
        this.flashNextColor();
      }
    }, 1000);
  }

  completeLivenessCheck(): void {
    this.livenessCheckComplete = true;
    this.isLivenessCheckActive = false;
    this.currentFlashColor = '';
    console.log('Liveness check completed successfully!');
  }

  captureLivenessSelfie(): void {
    if (!this.videoElement || !this.livenessCheckComplete) return;
    
    const canvas = document.createElement('canvas');
    const video = this.videoElement.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      this.capturedSelfie = canvas.toDataURL('image/jpeg', 0.8);
      this.stopLivenessCheck();
      this.closeLivenessModal();
      
      console.log('Liveness selfie captured successfully!', {
        width: canvas.width,
        height: canvas.height,
        dataSize: this.capturedSelfie.length
      });
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCapturing = false;
  }



  // Verification Submission
  canSubmitVerification(): boolean {
    return !!(this.philhealthIdFile && this.capturedSelfie);
  }

  submitVerification(): void {
    if (!this.canSubmitVerification()) {
      alert('Please upload both PhilHealth ID and take a selfie before submitting.');
      return;
    }

    this.isSubmittingVerification = true;

    // Prepare verification data
    const verificationData = {
      philhealthId: {
        name: this.philhealthIdFile?.name,
        size: this.philhealthIdFile?.size,
        type: this.philhealthIdFile?.type,
        lastModified: this.philhealthIdFile?.lastModified
      },
      selfie: {
        dataSize: this.capturedSelfie?.length,
        captured: true
      },
      timestamp: new Date().toISOString(),
      userId: this.profile.personalInfo.email
    };

    console.log('Submitting verification:', verificationData);
    
    // Simulate API call with loading state
    console.log('Uploading verification data...');
    
    // Simulate processing time
    setTimeout(() => {
      console.log('Verification data uploaded successfully!');
      this.isSubmittingVerification = false;
      alert('Verification submitted successfully! Your identity will be reviewed and verified within 24-48 hours.');
      this.closeVerificationModal();
    }, 2000);
  }
}
