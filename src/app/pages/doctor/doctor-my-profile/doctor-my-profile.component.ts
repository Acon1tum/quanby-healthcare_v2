import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User, UpdateProfilePayload } from '../../../auth/auth.service';

interface DoctorProfile {
  personalInfo: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    gender: string;
    profileImage?: string;
  };
  professionalInfo: {
    licenseNumber: string;
    specialization: string;
    qualifications: string;
    experience: number;
    languages: string[];
    certifications: string[];
    hospitalAffiliations: string[];
    // Medical License Information
    prcId: string;
    ptrId: string;
    medicalLicenseLevel: string;
    philHealthAccreditation: string;
    licenseExpiry: Date;
    isLicenseActive: boolean;
    additionalCertifications: string;
    licenseIssuedBy: string;
    licenseIssuedDate: Date;
    renewalRequired: boolean;
  };
  contactInfo: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
      email: string;
    };
  };
  bio: {
    summary: string;
    expertise: string[];
    achievements: string[];
    researchInterests: string[];
  };
  preferences: {
    consultationFee: number;
    availability: string[];
    notificationSettings: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    timezone: string;
    language: string;
  };
  systemInfo: {
    lastLogin: Date;
    accountCreated: Date;
    status: string;
    verificationStatus: string;
  };
  // ID Document Uploads
  idDocuments: {
    prcIdImage: string;
    ptrIdImage: string;
    medicalLicenseImage: string;
    additionalIdImages: string[];
    idDocumentsVerified: boolean;
    idDocumentsVerifiedBy: string;
    idDocumentsVerifiedAt: Date;
  };
}

@Component({
  selector: 'app-doctor-my-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './doctor-my-profile.component.html',
  styleUrl: './doctor-my-profile.component.scss'
})
export class DoctorMyProfileComponent implements OnInit {
  profile!: DoctorProfile;
  profileForm!: FormGroup;
  isEditing = false;
  isChangingPassword = false;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  // Track pending (not yet uploaded) image state
  private imagePendingUpload = false;
  private previousProfileImage: string | undefined = undefined;
  private pendingAuthProfileImage: string | undefined = undefined;
  // Direct source bound to <img [src]>
  avatarSrc: string = '9.png';

  // Lightweight toast notification
  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'success';
  private notificationTimeoutHandle: any = null;

  // Available options for form fields
  genderOptions = ['MALE', 'FEMALE', 'OTHER'];
  specializationOptions = [
    'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
    'General Medicine', 'Neurology', 'Oncology', 'Orthopedics',
    'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Urology',
    'Ophthalmology', 'Otolaryngology', 'Pulmonology', 'Rheumatology',
    'Emergency Medicine', 'Family Medicine', 'Internal Medicine', 'Other'
  ];
  languageOptions = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi', 'Other'];
  medicalLicenseLevelOptions = [
    { value: 'S1', label: 'S1 - General Practitioner Accreditation' },
    { value: 'S2', label: 'S2 - Specialist Accreditation' },
    { value: 'S3', label: 'S3 - Subspecialist Accreditation' }
  ];
  philHealthAccreditationOptions = [
    { value: 'ACCREDITED', label: 'Accredited' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'NOT_ACCREDITED', label: 'Not Accredited' },
    { value: 'UNDER_REVIEW', label: 'Under Review' }
  ];
  timezoneOptions = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00',
    'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00', 'UTC-03:00',
    'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00',
    'UTC+03:00', 'UTC+04:00', 'UTC+05:00', 'UTC+06:00', 'UTC+07:00',
    'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];
  availabilityOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  private normalizeImageDataUrl(image: string | undefined | null): string | undefined {
    if (!image) return undefined;
    const trimmed = image.trim();
    if (trimmed.startsWith('data:')) return trimmed;
    // Detect mime type from base64 signature
    let mime = 'image/png';
    if (trimmed.startsWith('/9j/')) mime = 'image/jpeg';
    else if (trimmed.startsWith('iVBORw0KGgo')) mime = 'image/png';
    else if (trimmed.startsWith('R0lG')) mime = 'image/gif';
    else if (trimmed.startsWith('Qk')) mime = 'image/bmp';
    else if (trimmed.slice(0, 10).includes('PHN2Zy') || trimmed.startsWith('PD94bWwg')) mime = 'image/svg+xml';
    return `data:${mime};base64,${trimmed}`;
  }

  ngOnInit(): void {
    // Immediately use current cached user profilePicture if present
    this.setAvatarFromCurrentUser();

    // Keep profile image in sync with auth user stream in case it arrives later
    this.authService.currentUser$.subscribe(u => {
      if (u?.profilePicture) {
        const normalized = this.normalizeImageDataUrl(u.profilePicture);
        this.pendingAuthProfileImage = normalized;
        // Always reflect latest DB image in avatar
        if (normalized) {
          this.avatarSrc = normalized;
          if (this.profile?.personalInfo) {
            this.profile.personalInfo.profileImage = normalized;
          }
        }
      }
    });
    this.loadProfile();
    // Ensure avatar reflects current user after initial map
    this.setAvatarFromCurrentUser();
  }

  private setAvatarFromCurrentUser(): void {
    const cached = this.authService.currentUserValue?.profilePicture;
    if (cached && typeof cached === 'string') {
      const t = cached.trim();
      if (t.length > 0) {
        const src = t.startsWith('data:image') ? t : (this.normalizeImageDataUrl(t) || '');
        if (src) {
          this.avatarSrc = src;
        }
      }
    }
  }

  async loadProfile(): Promise<void> {
    try {
      // Guard: must be logged in and a doctor
      const user = this.authService.currentUserValue || await this.authService.getProfile();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'DOCTOR') {
        this.authService.redirectBasedOnRole();
        return;
      }

      console.log('Loaded user data:', user);
      console.log('Doctor info:', user.doctorInfo);
      console.log('profilePicture (raw):', user.profilePicture ? (user.profilePicture.substring(0, 30) + '...') : 'none');

      // Map backend user (User + DoctorInfo) to view model
      const doctor = user.doctorInfo || {
        id: '',
        userId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        gender: 'OTHER',
        dateOfBirth: '',
        contactNumber: '',
        address: '',
        bio: '',
        specialization: '',
        qualifications: '',
        experience: 0,
        // Medical License Information
        prcId: '',
        ptrId: '',
        medicalLicenseLevel: '',
        philHealthAccreditation: '',
        licenseNumber: '',
        licenseExpiry: '',
        isLicenseActive: false,
        // Additional License Information
        additionalCertifications: '',
        licenseIssuedBy: '',
        licenseIssuedDate: '',
        renewalRequired: false,
        // ID Document Uploads
        prcIdImage: '',
        ptrIdImage: '',
        medicalLicenseImage: '',
        additionalIdImages: '',
        idDocumentsVerified: false,
        idDocumentsVerifiedBy: '',
        idDocumentsVerifiedAt: ''
      };

      this.profile = {
        personalInfo: {
          firstName: doctor.firstName || '',
          middleName: doctor.middleName || '',
          lastName: doctor.lastName || '',
          email: user.email,
          phone: doctor.contactNumber || '',
          dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth) : new Date(),
          gender: (doctor.gender || 'OTHER').toString(),
          profileImage: this.normalizeImageDataUrl(user.profilePicture) || this.pendingAuthProfileImage
        },
        professionalInfo: {
          licenseNumber: doctor.licenseNumber || '',
          specialization: doctor.specialization || '',
          qualifications: doctor.qualifications || '',
          experience: doctor.experience || 0,
          languages: [],
          certifications: [],
          hospitalAffiliations: [],
          // Medical License Information
          prcId: doctor.prcId || '',
          ptrId: doctor.ptrId || '',
          medicalLicenseLevel: doctor.medicalLicenseLevel || '',
          philHealthAccreditation: doctor.philHealthAccreditation || '',
          licenseExpiry: doctor.licenseExpiry ? new Date(doctor.licenseExpiry) : new Date(),
          isLicenseActive: doctor.isLicenseActive || false,
          additionalCertifications: doctor.additionalCertifications || '',
          licenseIssuedBy: doctor.licenseIssuedBy || '',
          licenseIssuedDate: doctor.licenseIssuedDate ? new Date(doctor.licenseIssuedDate) : new Date(),
          renewalRequired: doctor.renewalRequired || false
        },
        contactInfo: {
          address: doctor.address || '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
            email: ''
          }
        },
        bio: {
          summary: doctor.bio || '',
          expertise: [],
          achievements: [],
          researchInterests: []
        },
        preferences: {
          consultationFee: 0,
          availability: [],
          notificationSettings: {
            email: true,
            sms: false,
            push: true
          },
          timezone: 'UTC+00:00',
          language: 'English'
        },
        systemInfo: {
          lastLogin: new Date(),
          accountCreated: new Date(),
          status: 'Active',
          verificationStatus: 'Verified'
        },
        idDocuments: {
          prcIdImage: doctor.prcIdImage || '',
          ptrIdImage: doctor.ptrIdImage || '',
          medicalLicenseImage: doctor.medicalLicenseImage || '',
          additionalIdImages: doctor.additionalIdImages ? JSON.parse(doctor.additionalIdImages) : [],
          idDocumentsVerified: doctor.idDocumentsVerified || false,
          idDocumentsVerifiedBy: doctor.idDocumentsVerifiedBy || '',
          idDocumentsVerifiedAt: doctor.idDocumentsVerifiedAt ? new Date(doctor.idDocumentsVerifiedAt) : new Date()
        }
      };

      console.log('Mapped profile data:', this.profile);

      // Fallback: if for any reason profile image is still empty but auth service holds it, apply it
      if ((!this.profile.personalInfo.profileImage || this.profile.personalInfo.profileImage.length === 0) && this.authService.currentUserValue?.profilePicture) {
        this.profile.personalInfo.profileImage = this.normalizeImageDataUrl(this.authService.currentUserValue.profilePicture);
        console.log('Applied fallback profilePicture from auth service');
      }

      // Set avatar src for the template
      this.avatarSrc = this.profile.personalInfo.profileImage || this.avatarSrc || '9.png';

      // Initialize form with the loaded data
      this.initForm();
    } catch (error) {
      console.error('Error loading profile:', error);
      // Handle error appropriately - maybe show a toast or redirect
    }
  }

  initForm(): void {
    // Ensure profile data is available before initializing form
    if (!this.profile) {
      console.warn('Profile data not available for form initialization');
      return;
    }

    this.profileForm = this.fb.group({
      personalInfo: this.fb.group({
        firstName: [this.profile.personalInfo.firstName, [Validators.required, Validators.minLength(2)]],
        middleName: [this.profile.personalInfo.middleName || ''],
        lastName: [this.profile.personalInfo.lastName, [Validators.required, Validators.minLength(2)]],
        email: [this.profile.personalInfo.email, [Validators.required, Validators.email]],
        phone: [this.profile.personalInfo.phone, [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
        dateOfBirth: [this.profile.personalInfo.dateOfBirth, Validators.required],
        gender: [this.profile.personalInfo.gender, Validators.required]
      }),
      professionalInfo: this.fb.group({
        licenseNumber: [this.profile.professionalInfo.licenseNumber],
        specialization: [this.profile.professionalInfo.specialization],
        qualifications: [this.profile.professionalInfo.qualifications],
        experience: [this.profile.professionalInfo.experience, [Validators.min(0), Validators.max(50)]],
        languages: [this.profile.professionalInfo.languages],
        certifications: [this.profile.professionalInfo.certifications],
        hospitalAffiliations: [this.profile.professionalInfo.hospitalAffiliations],
        // Medical License Information (optional)
        prcId: [this.profile.professionalInfo.prcId],
        ptrId: [this.profile.professionalInfo.ptrId],
        medicalLicenseLevel: [this.profile.professionalInfo.medicalLicenseLevel],
        philHealthAccreditation: [this.profile.professionalInfo.philHealthAccreditation],
        licenseExpiry: [this.profile.professionalInfo.licenseExpiry],
        isLicenseActive: [this.profile.professionalInfo.isLicenseActive],
        additionalCertifications: [this.profile.professionalInfo.additionalCertifications],
        licenseIssuedBy: [this.profile.professionalInfo.licenseIssuedBy],
        licenseIssuedDate: [this.profile.professionalInfo.licenseIssuedDate],
        renewalRequired: [this.profile.professionalInfo.renewalRequired]
      }),
      contactInfo: this.fb.group({
        address: [this.profile.contactInfo.address],
        city: [this.profile.contactInfo.city],
        state: [this.profile.contactInfo.state],
        zipCode: [this.profile.contactInfo.zipCode],
        country: [this.profile.contactInfo.country],
        emergencyContact: this.fb.group({
          name: [this.profile.contactInfo.emergencyContact.name],
          relationship: [this.profile.contactInfo.emergencyContact.relationship],
          phone: [this.profile.contactInfo.emergencyContact.phone, [Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
          email: [this.profile.contactInfo.emergencyContact.email, [Validators.email]]
        })
      }),
      bio: this.fb.group({
        summary: [this.profile.bio.summary, [Validators.minLength(10)]],
        expertise: [this.profile.bio.expertise],
        achievements: [this.profile.bio.achievements],
        researchInterests: [this.profile.bio.researchInterests]
      }),
      preferences: this.fb.group({
        consultationFee: [this.profile.preferences.consultationFee, [Validators.min(0)]],
        availability: [this.profile.preferences.availability],
        notificationSettings: this.fb.group({
          email: [this.profile.preferences.notificationSettings.email],
          sms: [this.profile.preferences.notificationSettings.sms],
          push: [this.profile.preferences.notificationSettings.push]
        }),
        timezone: [this.profile.preferences.timezone],
        language: [this.profile.preferences.language]
      })
    });

    console.log('Form initialized with values:', this.profileForm.value);
  }

  async onEdit(): Promise<void> {
    this.isEditing = true;
    // Refresh profile data from backend before populating form
    await this.loadProfile();
    
    // Debug: Log the current profile data
    console.log('Profile data loaded:', this.profile);
    console.log('Form values after population:', this.profileForm.value);
  }

  onCancel(): void {
    this.isEditing = false;
    this.profileForm.reset();
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
      professionalInfo: {
        ...this.profile.professionalInfo,
        ...this.profileForm.value.professionalInfo
      },
      contactInfo: {
        ...this.profile.contactInfo,
        ...this.profileForm.value.contactInfo
      },
      bio: {
        ...this.profile.bio,
        ...this.profileForm.value.bio
      },
      preferences: {
        ...this.profile.preferences,
        ...this.profileForm.value.preferences
      }
    };

    // Map to backend payload
    const p = this.profile;
    const payload: UpdateProfilePayload = {
      firstName: p.personalInfo.firstName,
      lastName: p.personalInfo.lastName,
      middleName: p.personalInfo.middleName || undefined,
      bio: p.bio.summary,
      contactNumber: p.personalInfo.phone,
      address: p.contactInfo.address,
      specialization: p.professionalInfo.specialization,
      qualifications: p.professionalInfo.qualifications,
      experience: p.professionalInfo.experience,
      gender: p.personalInfo.gender as any,
      dateOfBirth: p.personalInfo.dateOfBirth ? new Date(p.personalInfo.dateOfBirth).toISOString() : undefined,
      // Profile Picture
      profilePicture: p.personalInfo.profileImage || undefined,
      // Medical license fields
      prcId: p.professionalInfo.prcId || undefined,
      ptrId: p.professionalInfo.ptrId || undefined,
      medicalLicenseLevel: p.professionalInfo.medicalLicenseLevel || undefined,
      philHealthAccreditation: p.professionalInfo.philHealthAccreditation || undefined,
      licenseNumber: p.professionalInfo.licenseNumber || undefined,
      licenseExpiry: p.professionalInfo.licenseExpiry ? new Date(p.professionalInfo.licenseExpiry).toISOString() : undefined,
      isLicenseActive: p.professionalInfo.isLicenseActive,
      additionalCertifications: p.professionalInfo.additionalCertifications || undefined,
      licenseIssuedBy: p.professionalInfo.licenseIssuedBy || undefined,
      licenseIssuedDate: p.professionalInfo.licenseIssuedDate ? new Date(p.professionalInfo.licenseIssuedDate).toISOString() : undefined,
      renewalRequired: p.professionalInfo.renewalRequired,
    };

    try {
      const result = await this.authService.updateProfile(payload);
      if (result.success) {
        this.isEditing = false;
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
      return;
    }

    try {
      // Remove the profile picture from the User table via backend
      const result = await this.authService.updateProfile({
        profilePicture: undefined
      });
      
      if (result.success) {
        // Update local profile state
        this.profile.personalInfo.profileImage = undefined;
        this.selectedImage = null;
        this.imagePreview = null;
        this.avatarSrc = '9.png';
        
        // Update the form
        if (this.isEditing) {
          this.profileForm.patchValue({
            personalInfo: {
              ...this.profileForm.value.personalInfo,
              profileImage: undefined
            }
          });
        }
        
        this.triggerToast('Profile picture removed successfully', 'success');
      } else {
        this.triggerToast(result.message || 'Failed to remove profile picture', 'error');
      }
    } catch (error) {
      console.error('Error removing profile picture:', error);
      this.triggerToast('An error occurred while removing the profile picture', 'error');
    }
  }

  onIdDocumentSelect(event: any, documentType: string): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64String = e.target.result;
        switch (documentType) {
          case 'prcId':
            this.profile.idDocuments.prcIdImage = base64String;
            break;
          case 'ptrId':
            this.profile.idDocuments.ptrIdImage = base64String;
            break;
          case 'medicalLicense':
            this.profile.idDocuments.medicalLicenseImage = base64String;
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onRemoveIdDocument(documentType: string): void {
    switch (documentType) {
      case 'prcId':
        this.profile.idDocuments.prcIdImage = '';
        break;
      case 'ptrId':
        this.profile.idDocuments.ptrIdImage = '';
        break;
      case 'medicalLicense':
        this.profile.idDocuments.medicalLicenseImage = '';
        break;
    }
  }

  onAddItem(array: string[], newItem: string): void {
    if (newItem && newItem.trim()) {
      array.push(newItem.trim());
    }
  }

  onRemoveItem(array: string[], index: number): void {
    array.splice(index, 1);
  }

  onInputChange(array: string[], index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value !== undefined) {
      array[index] = target.value;
    }
  }

  onSelectChange(array: string[], index: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value !== undefined) {
      array[index] = target.value;
    }
  }

  onBack(): void {
    this.router.navigate(['/doctor/dashboard']);
  }

  async refreshProfile(): Promise<void> {
    // No need to refresh from server since updateProfile already updates the global state
    // The profile data is already up to date from the save operation
    console.log('Profile refresh completed - data already up to date');
  }


  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  getFieldError(formGroup: string, field: string): string {
    const control = this.profileForm.get(`${formGroup}.${field}`);
    if (control && control.touched && control.errors) {
      if (control.errors['required']) return `${field} is required`;
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['minlength']) return `${field} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['min']) return `${field} must be at least ${control.errors['min'].min}`;
      if (control.errors['max']) return `${field} must be at most ${control.errors['max'].max}`;
      if (control.errors['pattern']) return `Invalid ${field} format`;
    }
    return '';
  }

  // Computed properties for template
  get fullName(): string {
    const middleName = this.profile.personalInfo.middleName ? ` ${this.profile.personalInfo.middleName} ` : ' ';
    return `${this.profile.personalInfo.firstName}${middleName}${this.profile.personalInfo.lastName}`;
  }

  get age(): number {
    const today = new Date();
    const birthDate = new Date(this.profile.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  get experienceLabel(): string {
    const exp = this.profile.professionalInfo.experience;
    if (exp === 1) return '1 year';
    return `${exp} years`;
  }

  get consultationFeeLabel(): string {
    return `$${this.profile.preferences.consultationFee}`;
  }

  // Safe image URL for template binding
  get profileImageUrl(): SafeUrl {
    const authRaw = this.authService.currentUserValue?.profilePicture;
    const authHasDataUrl = typeof authRaw === 'string' && authRaw.trim().startsWith('data:image');
    const fromAuth = authHasDataUrl ? authRaw!.trim() : this.normalizeImageDataUrl(authRaw);
    const fromProfile = this.profile?.personalInfo?.profileImage;
    const src = (fromAuth && fromAuth.length > 0) ? fromAuth : (fromProfile && fromProfile.length > 0 ? fromProfile : '9.png');
    return this.sanitizer.bypassSecurityTrustUrl(src);
  }

  // Plain string source for <img [src]> to avoid any SafeUrl binding issues
  get profileImageSrc(): string {
    const authRaw = this.authService.currentUserValue?.profilePicture;
    const authHasDataUrl = typeof authRaw === 'string' && authRaw.trim().startsWith('data:image');
    const fromAuth = authHasDataUrl ? authRaw!.trim() : (this.normalizeImageDataUrl(authRaw) || '');
    const fromProfile = this.profile?.personalInfo?.profileImage || '';
    return fromAuth || fromProfile || '9.png';
  }

  // Prefer current user's profilePicture (DB) over local avatarSrc
  get effectiveAvatarSrc(): string {
    const raw = this.authService.currentUserValue?.profilePicture;
    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      const t = raw.trim();
      return t.startsWith('data:image') ? t : (this.normalizeImageDataUrl(t) || this.avatarSrc || '9.png');
    }
    return this.avatarSrc || '9.png';
  }

  get availabilityLabel(): string {
    return this.profile.preferences.availability.join(', ');
  }

  get notificationLabels(): string[] {
    const labels = [];
    if (this.profile.preferences.notificationSettings.email) labels.push('Email');
    if (this.profile.preferences.notificationSettings.sms) labels.push('SMS');
    if (this.profile.preferences.notificationSettings.push) labels.push('Push');
    return labels;
  }

  getMedicalLicenseLevelLabel(value: string): string {
    const option = this.medicalLicenseLevelOptions.find(l => l.value === value);
    return option ? option.label : value;
  }

  getPhilHealthAccreditationLabel(value: string): string {
    const option = this.philHealthAccreditationOptions.find(a => a.value === value);
    return option ? option.label : value;
  }

  getCertificationsList(): string[] {
    if (!this.profile.professionalInfo.additionalCertifications) {
      return [];
    }
    
    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(this.profile.professionalInfo.additionalCertifications);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // If not JSON, split by newlines
      return this.profile.professionalInfo.additionalCertifications
        .split('\n')
        .map(cert => cert.trim())
        .filter(cert => cert.length > 0);
    }
    
    return [];
  }

  viewDocument(documentType: string): void {
    let imageUrl = '';
    switch (documentType) {
      case 'prcId':
        imageUrl = this.profile.idDocuments.prcIdImage;
        break;
      case 'ptrId':
        imageUrl = this.profile.idDocuments.ptrIdImage;
        break;
      case 'medicalLicense':
        imageUrl = this.profile.idDocuments.medicalLicenseImage;
        break;
    }
    
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  }
}
