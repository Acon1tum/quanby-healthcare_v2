import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService, User, UpdateProfilePayload } from '../../../auth/auth.service';

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
  philHealthId?: string;
  philHealthStatus?: string;
  philHealthCategory?: string;
  philHealthExpiry?: string;
  philHealthMemberSince?: string;
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

interface PhilHealthInfo {
  philHealthId: string;
  philHealthStatus: string;
  philHealthCategory: string;
  philHealthExpiry: string;
  philHealthMemberSince: string;
}

interface PatientPreferences {
  language: string;
  communicationMethod: string;
}

interface PatientProfile {
  personalInfo: PatientPersonalInfo;
  emergencyContact?: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
  philHealthInfo?: PhilHealthInfo;
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
  imagePreview: string | null = null;
  age: number = 0;
  
  // Track pending (not yet uploaded) image state
  private imagePendingUpload = false;
  private previousProfileImage: string | undefined = undefined;
  private pendingAuthProfileImage: string | undefined = undefined;
  // Direct source bound to <img [src]>
  avatarSrc: string = '33.png';
  // Track pending deletion to apply on Save
  private pendingProfileImageRemoval = false;
  
  // Delete confirmation modal state
  showDeleteConfirm = false;
  deletingImage = false;

  // Lightweight toast notification
  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'success';
  private notificationTimeoutHandle: any = null;

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
  philHealthStatusOptions = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'];
  philHealthCategoryOptions = ['INDIVIDUAL', 'FAMILY', 'SPONSORED', 'SENIOR_CITIZEN'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {
    this.initializeProfile();
    this.createForm();
  }

  private normalizeImageDataUrl(image: string | undefined | null): string | undefined {
    if (!image) return undefined;
    const trimmed = image.trim();
    
    // If it's already a data URL, return as is
    if (trimmed.startsWith('data:')) return trimmed;
    
    // If it's empty, return undefined
    if (trimmed.length === 0) return undefined;
    
    // Detect mime type from base64 signature
    let mime = 'image/png'; // default to PNG
    
    // Check for common base64 image signatures
    if (trimmed.startsWith('/9j/') || trimmed.startsWith('/9j4AAQSkZJRg')) {
      mime = 'image/jpeg';
    } else if (trimmed.startsWith('iVBORw0KGgo') || trimmed.startsWith('iVBORw0KGg')) {
      mime = 'image/png';
    } else if (trimmed.startsWith('R0lGODlh') || trimmed.startsWith('R0lGOD')) {
      mime = 'image/gif';
    } else if (trimmed.startsWith('Qk') || trimmed.startsWith('Qk1G')) {
      mime = 'image/bmp';
    } else if (trimmed.includes('PHN2Zy') || trimmed.startsWith('PD94bWwg')) {
      mime = 'image/svg+xml';
    } else if (trimmed.startsWith('UklGR')) {
      mime = 'image/webp';
    }
    
    return `data:${mime};base64,${trimmed}`;
  }

  ngOnInit(): void {
    console.log('ngOnInit - currentUserValue exists:', !!this.authService.currentUserValue);
    console.log('ngOnInit - currentUserValue profilePicture:', this.authService.currentUserValue?.profilePicture ? this.authService.currentUserValue.profilePicture.substring(0, 50) + '...' : 'none');
    
    // Immediately use current cached user profilePicture if present
    this.setAvatarFromCurrentUser();

    // Keep profile image in sync with auth user stream in case it arrives later
    this.authService.currentUser$.subscribe(u => {
      console.log('currentUser$ subscription triggered, user:', u ? 'exists' : 'null');
      console.log('currentUser$ profilePicture:', u?.profilePicture ? u.profilePicture.substring(0, 50) + '...' : 'none');
      
      if (u?.profilePicture) {
        const normalized = this.normalizeImageDataUrl(u.profilePicture);
        console.log('currentUser$ normalized image:', normalized ? normalized.substring(0, 50) + '...' : 'null');
        this.pendingAuthProfileImage = normalized;
        // Always reflect latest DB image in avatar
        if (normalized) {
          this.avatarSrc = normalized;
          if (this.profile?.personalInfo) {
            this.profile.personalInfo.profileImage = normalized;
          }
          console.log('currentUser$ updated avatarSrc to:', this.avatarSrc.substring(0, 50) + '...');
        }
      }
    });
    
    this.calculateAge();
    this.loadProfile();
    // Ensure avatar reflects current user after initial map
    this.setAvatarFromCurrentUser();
  }

  private setAvatarFromCurrentUser(): void {
    const cached = this.authService.currentUserValue?.profilePicture;
    console.log('setAvatarFromCurrentUser - cached profilePicture:', cached ? cached.substring(0, 50) + '...' : 'null');
    
    if (cached && typeof cached === 'string') {
      const t = cached.trim();
      console.log('setAvatarFromCurrentUser - trimmed length:', t.length);
      if (t.length > 0) {
        const src = t.startsWith('data:image') ? t : (this.normalizeImageDataUrl(t) || '');
        console.log('setAvatarFromCurrentUser - src result:', src ? src.substring(0, 50) + '...' : 'null');
        if (src) {
          this.avatarSrc = src;
          console.log('setAvatarFromCurrentUser - updated avatarSrc to:', this.avatarSrc.substring(0, 50) + '...');
          // Also update the profile if it exists
          if (this.profile?.personalInfo) {
            this.profile.personalInfo.profileImage = src;
            console.log('setAvatarFromCurrentUser - updated profile.personalInfo.profileImage');
          }
        }
      }
    }
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
        profileImage: undefined,
        philHealthId: '',
        philHealthStatus: '',
        philHealthCategory: '',
        philHealthExpiry: '',
        philHealthMemberSince: ''
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
        medications: [[]],
        philHealthId: [''],
        philHealthStatus: [''],
        philHealthCategory: [''],
        philHealthExpiry: [''],
        philHealthMemberSince: ['']
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
    try {
      // Guard: must be logged in and a patient
      const user = await this.authService.getProfile();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'PATIENT') {
        this.authService.redirectBasedOnRole();
        return;
      }

      console.log('Loaded user data:', user);
      console.log('Patient info:', user.patientInfo);
      console.log('profilePicture (raw):', user.profilePicture ? (user.profilePicture.substring(0, 30) + '...') : 'none');
      console.log('profilePicture length:', user.profilePicture ? user.profilePicture.length : 0);

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
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '1990-01-01',
          contactNumber: p.contactNumber || '',
          address: p.address || '',
          weight: p.weight || 0,
          height: p.height || 0,
          bloodType: p.bloodType || '',
          medicalHistory: p.medicalHistory || '',
          allergies: Array.isArray(p.allergies) ? p.allergies : (p.allergies ? [p.allergies] : []),
          medications: Array.isArray(p.medications) ? p.medications : (p.medications ? [p.medications] : []),
          profileImage: this.normalizeImageDataUrl(user.profilePicture) || this.pendingAuthProfileImage || undefined,
          philHealthId: p.philHealthId || '',
          philHealthStatus: p.philHealthStatus || '',
          philHealthCategory: p.philHealthCategory || '',
          philHealthExpiry: p.philHealthExpiry ? new Date(p.philHealthExpiry).toISOString().split('T')[0] : '',
          philHealthMemberSince: p.philHealthMemberSince ? new Date(p.philHealthMemberSince).toISOString().split('T')[0] : ''
        },
        emergencyContact: p.emergencyContact ? {
          contactName: p.emergencyContact.contactName || '',
          relationship: p.emergencyContact.relationship || '',
          contactNumber: p.emergencyContact.contactNumber || '',
          contactAddress: p.emergencyContact.contactAddress || ''
        } : {
          contactName: '',
          relationship: '',
          contactNumber: '',
          contactAddress: ''
        },
        insuranceInfo: p.insuranceInfo ? {
          providerName: p.insuranceInfo.providerName,
          policyNumber: p.insuranceInfo.policyNumber,
          insuranceContact: p.insuranceInfo.insuranceContact
        } : undefined,
        preferences: this.profile.preferences
      };

      console.log('Mapped profile data:', this.profile);

      // Fallback: if for any reason profile image is still empty but auth service holds it, apply it
      if ((!this.profile.personalInfo.profileImage || this.profile.personalInfo.profileImage.length === 0) && this.authService.currentUserValue?.profilePicture) {
        const normalizedImage = this.normalizeImageDataUrl(this.authService.currentUserValue.profilePicture);
        if (normalizedImage) {
          this.profile.personalInfo.profileImage = normalizedImage;
          console.log('Applied fallback profilePicture from auth service');
        }
      }

      // Set avatar src for the template - prioritize profile image from backend
      const profileImage = this.profile.personalInfo.profileImage;
      if (profileImage && profileImage.length > 0) {
        this.avatarSrc = profileImage;
      } else {
        this.avatarSrc = this.avatarSrc || '33.png';
      }
      
      console.log('Final avatarSrc set to:', this.avatarSrc.substring(0, 50) + '...');

      this.profileForm.patchValue(this.profile);
      this.calculateAge();
    } catch (error) {
      console.error('Error loading profile:', error);
      // Handle error appropriately - maybe show a toast or redirect
    }
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

  async onSave(): Promise<void> {
    if (!this.profileForm.valid) {
      this.markFormGroupTouched();
      this.triggerToast('Please fix the highlighted fields before saving.', 'error');
      return;
    }

    // Merge form values into local profile state
    this.profile = {
      ...this.profile,
      personalInfo: {
        ...this.profile.personalInfo,
        ...this.profileForm.value.personalInfo
      },
      emergencyContact: {
        ...this.profile.emergencyContact,
        ...this.profileForm.value.emergencyContact
      },
      insuranceInfo: {
        ...this.profile.insuranceInfo,
        ...this.profileForm.value.insuranceInfo
      },
      preferences: {
        ...this.profile.preferences,
        ...this.profileForm.value.preferences
      }
    };

    // Map to backend payload
    const p = this.profile;
    // Determine profile picture payload based on pending removal or current image
    let profilePicturePayload: string | null | undefined = undefined;
    if (this.pendingProfileImageRemoval) {
      profilePicturePayload = null;
    } else if (p.personalInfo.profileImage) {
      profilePicturePayload = p.personalInfo.profileImage;
    }

    const payload: UpdateProfilePayload = {
      email: p.personalInfo.email,
      firstName: p.personalInfo.fullName.split(' ')[0] || '',
      lastName: p.personalInfo.fullName.split(' ').slice(1).join(' ') || '',
      bio: p.personalInfo.medicalHistory || '',
      contactNumber: p.personalInfo.contactNumber,
      address: p.personalInfo.address,
      gender: p.personalInfo.gender as any,
      dateOfBirth: p.personalInfo.dateOfBirth ? new Date(p.personalInfo.dateOfBirth).toISOString() : undefined,
      // Patient-specific fields
      weight: typeof p.personalInfo.weight === 'number' ? p.personalInfo.weight : undefined,
      height: typeof p.personalInfo.height === 'number' ? p.personalInfo.height : undefined,
      bloodType: p.personalInfo.bloodType || undefined,
      medicalHistory: p.personalInfo.medicalHistory || undefined,
      allergies: Array.isArray(p.personalInfo.allergies) ? p.personalInfo.allergies.join(', ') : (p.personalInfo.allergies as any),
      medications: Array.isArray(p.personalInfo.medications) ? p.personalInfo.medications.join(', ') : (p.personalInfo.medications as any),
      // Profile Picture
      profilePicture: profilePicturePayload,
      // Emergency Contact
      emergencyContact: p.emergencyContact ? {
        contactName: p.emergencyContact.contactName,
        relationship: p.emergencyContact.relationship,
        contactNumber: p.emergencyContact.contactNumber,
        contactAddress: p.emergencyContact.contactAddress
      } : undefined,
    } as UpdateProfilePayload;

    try {
      const result = await this.authService.updateProfile(payload);
      if (result.success) {
        this.isEditing = false;
        // Clear pending deletion flag upon successful save
        this.pendingProfileImageRemoval = false;
        // Refresh profile from backend to reflect saved data
        await this.refreshProfile();
        this.triggerToast('Profile updated successfully', 'success');
      } else {
        this.triggerToast(result.message || 'Profile update failed', 'error');
      }
    } catch (e) {
      this.triggerToast('An error occurred while updating the profile.', 'error');
    }
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        // Remember previous image and show preview immediately
        this.previousProfileImage = this.profile?.personalInfo?.profileImage;
        this.profile.personalInfo.profileImage = this.imagePreview as string;
        this.imagePendingUpload = true;
        // Reflect in avatar immediately
        this.avatarSrc = this.profile.personalInfo.profileImage || this.avatarSrc;
      };
      reader.readAsDataURL(file);
    }
  }

  async onUploadImage(): Promise<void> {
    if (this.selectedImage && this.imagePreview) {
      try {
        console.log('Uploading profile picture:', this.selectedImage.name);
        
        // Update the profile picture in the User table via backend
        const result = await this.authService.updateProfile({
          profilePicture: this.imagePreview
        });
        
        if (result.success) {
          // Update local profile state
          this.profile.personalInfo.profileImage = this.imagePreview;
          this.imagePendingUpload = false;
          this.previousProfileImage = undefined;
          this.avatarSrc = this.profile.personalInfo.profileImage || this.avatarSrc;
          
          // Clear the selected image and preview
          this.selectedImage = null;
          this.imagePreview = null;
          
          // Update the form with the new image
          if (this.isEditing) {
            this.profileForm.patchValue({
              personalInfo: {
                ...this.profileForm.value.personalInfo,
                profileImage: this.profile.personalInfo.profileImage
              }
            });
          }
          
          this.triggerToast('Profile picture updated successfully', 'success');
        } else {
          this.triggerToast(result.message || 'Failed to update profile picture', 'error');
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        this.triggerToast('An error occurred while uploading the profile picture', 'error');
      }
    }
  }

  async onRemoveImage(): Promise<void> {
    // If there is a newly selected image that hasn't been uploaded yet,
    // just clear the preview and restore the previous image without calling the backend.
    if (this.imagePendingUpload) {
      this.selectedImage = null;
      this.imagePreview = null;
      this.profile.personalInfo.profileImage = this.previousProfileImage;
      this.imagePendingUpload = false;
      this.previousProfileImage = undefined;
    }

    // Defer backend deletion until Save; update UI immediately
    this.pendingProfileImageRemoval = true;
    this.profile.personalInfo.profileImage = undefined;
    this.selectedImage = null;
    this.imagePreview = null;
    this.avatarSrc = '33.png';

    // Update the form
    if (this.isEditing) {
      this.profileForm.patchValue({
        personalInfo: {
          ...this.profileForm.value.personalInfo,
          profileImage: undefined
        }
      });
    }

    this.triggerToast('Profile picture will be removed on Save', 'info');
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

  private triggerToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    if (this.notificationTimeoutHandle) {
      clearTimeout(this.notificationTimeoutHandle);
    }
    this.notificationTimeoutHandle = setTimeout(() => {
      this.showNotification = false;
      this.notificationMessage = '';
    }, 3000);
  }

  async refreshProfile(): Promise<void> {
    // No need to refresh from server since updateProfile already updates the global state
    // The profile data is already up to date from the save operation
    console.log('Profile refresh completed - data already up to date');
  }

  // Confirmation modal handlers
  openRemoveImageConfirm(): void {
    // Directly perform removal without modal
    void this.onRemoveImage();
  }

  async confirmRemoveImage(): Promise<void> { }

  cancelRemoveImage(): void { }

  // Safe image URL for template binding (if needed for security)
  get profileImageUrl(): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(this.effectiveAvatarSrc);
  }

  // Plain string source for <img [src]> - same as effectiveAvatarSrc
  get profileImageSrc(): string {
    return this.effectiveAvatarSrc;
  }

  // Prefer current user's profilePicture (DB) over local avatarSrc
  get effectiveAvatarSrc(): string {
    const raw = this.authService.currentUserValue?.profilePicture;
    console.log('effectiveAvatarSrc - raw profilePicture:', raw ? raw.substring(0, 50) + '...' : 'null/undefined');
    console.log('effectiveAvatarSrc - currentUserValue exists:', !!this.authService.currentUserValue);
    
    if (raw && typeof raw === 'string' && raw.trim().length > 0 && !this.pendingProfileImageRemoval) {
      const t = raw.trim();
      console.log('effectiveAvatarSrc - trimmed length:', t.length);
      console.log('effectiveAvatarSrc - starts with data:image:', t.startsWith('data:image'));
      
      // If it's already a data URL, use it directly
      if (t.startsWith('data:image')) {
        console.log('effectiveAvatarSrc - using data URL directly');
        return t;
      }
      // Otherwise, normalize it to a proper data URL
      const normalized = this.normalizeImageDataUrl(t);
      console.log('effectiveAvatarSrc - normalized result:', normalized ? normalized.substring(0, 50) + '...' : 'null');
      if (normalized) {
        console.log('effectiveAvatarSrc - using normalized image');
        return normalized;
      }
    }
    
    console.log('effectiveAvatarSrc - falling back to avatarSrc:', this.avatarSrc);
    // Fallback to local avatarSrc or default image
    return this.avatarSrc || '33.png';
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
