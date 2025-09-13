import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  async loadProfile(): Promise<void> {
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

    // Map backend user (User + DoctorInfo) to view model
    const doctor = user.doctorInfo || {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: 'OTHER',
      dateOfBirth: '',
      contactNumber: '',
      address: '',
      specialization: '',
      qualifications: '',
      experience: 0,
      // Medical License Information
      licenseNumber: '',
      prcId: '',
      ptrId: '',
      medicalLicenseLevel: '',
      philHealthAccreditation: '',
      licenseExpiry: '',
      isLicenseActive: false,
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
        profileImage: undefined
      },
      professionalInfo: {
        licenseNumber: (doctor as any).licenseNumber || '',
        specialization: doctor.specialization || '',
        qualifications: doctor.qualifications || '',
        experience: doctor.experience || 0,
        languages: [],
        certifications: [],
        hospitalAffiliations: [],
        // Medical License Information
        prcId: (doctor as any).prcId || '',
        ptrId: (doctor as any).ptrId || '',
        medicalLicenseLevel: (doctor as any).medicalLicenseLevel || '',
        philHealthAccreditation: (doctor as any).philHealthAccreditation || '',
        licenseExpiry: (doctor as any).licenseExpiry ? new Date((doctor as any).licenseExpiry) : new Date(),
        isLicenseActive: (doctor as any).isLicenseActive || false,
        additionalCertifications: (doctor as any).additionalCertifications || '',
        licenseIssuedBy: (doctor as any).licenseIssuedBy || '',
        licenseIssuedDate: (doctor as any).licenseIssuedDate ? new Date((doctor as any).licenseIssuedDate) : new Date(),
        renewalRequired: (doctor as any).renewalRequired || false
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
        summary: '',
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
        prcIdImage: (doctor as any).prcIdImage || '',
        ptrIdImage: (doctor as any).ptrIdImage || '',
        medicalLicenseImage: (doctor as any).medicalLicenseImage || '',
        additionalIdImages: (doctor as any).additionalIdImages ? JSON.parse((doctor as any).additionalIdImages) : [],
        idDocumentsVerified: (doctor as any).idDocumentsVerified || false,
        idDocumentsVerifiedBy: (doctor as any).idDocumentsVerifiedBy || '',
        idDocumentsVerifiedAt: (doctor as any).idDocumentsVerifiedAt ? new Date((doctor as any).idDocumentsVerifiedAt) : new Date()
      }
    };

    this.initForm();
  }

  initForm(): void {
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
        licenseNumber: [this.profile.professionalInfo.licenseNumber, [Validators.required, Validators.minLength(5)]],
        specialization: [this.profile.professionalInfo.specialization, Validators.required],
        qualifications: [this.profile.professionalInfo.qualifications, Validators.required],
        experience: [this.profile.professionalInfo.experience, [Validators.required, Validators.min(0), Validators.max(50)]],
        languages: [this.profile.professionalInfo.languages, Validators.required],
        certifications: [this.profile.professionalInfo.certifications, Validators.required],
        hospitalAffiliations: [this.profile.professionalInfo.hospitalAffiliations, Validators.required],
        // Medical License Information
        prcId: [this.profile.professionalInfo.prcId, [Validators.required, Validators.minLength(5)]],
        ptrId: [this.profile.professionalInfo.ptrId, [Validators.required, Validators.minLength(5)]],
        medicalLicenseLevel: [this.profile.professionalInfo.medicalLicenseLevel, Validators.required],
        philHealthAccreditation: [this.profile.professionalInfo.philHealthAccreditation, Validators.required],
        licenseExpiry: [this.profile.professionalInfo.licenseExpiry, Validators.required],
        isLicenseActive: [this.profile.professionalInfo.isLicenseActive],
        additionalCertifications: [this.profile.professionalInfo.additionalCertifications],
        licenseIssuedBy: [this.profile.professionalInfo.licenseIssuedBy],
        licenseIssuedDate: [this.profile.professionalInfo.licenseIssuedDate],
        renewalRequired: [this.profile.professionalInfo.renewalRequired]
      }),
      contactInfo: this.fb.group({
        address: [this.profile.contactInfo.address, Validators.required],
        city: [this.profile.contactInfo.city, Validators.required],
        state: [this.profile.contactInfo.state, Validators.required],
        zipCode: [this.profile.contactInfo.zipCode, Validators.required],
        country: [this.profile.contactInfo.country, Validators.required],
        emergencyContact: this.fb.group({
          name: [this.profile.contactInfo.emergencyContact.name, Validators.required],
          relationship: [this.profile.contactInfo.emergencyContact.relationship, Validators.required],
          phone: [this.profile.contactInfo.emergencyContact.phone, [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
          email: [this.profile.contactInfo.emergencyContact.email, [Validators.required, Validators.email]]
        })
      }),
      bio: this.fb.group({
        summary: [this.profile.bio.summary, [Validators.required, Validators.minLength(50)]],
        expertise: [this.profile.bio.expertise, Validators.required],
        achievements: [this.profile.bio.achievements, Validators.required],
        researchInterests: [this.profile.bio.researchInterests, Validators.required]
      }),
      preferences: this.fb.group({
        consultationFee: [this.profile.preferences.consultationFee, [Validators.required, Validators.min(0)]],
        availability: [this.profile.preferences.availability, Validators.required],
        notificationSettings: this.fb.group({
          email: [this.profile.preferences.notificationSettings.email],
          sms: [this.profile.preferences.notificationSettings.sms],
          push: [this.profile.preferences.notificationSettings.push]
        }),
        timezone: [this.profile.preferences.timezone, Validators.required],
        language: [this.profile.preferences.language, Validators.required]
      })
    });
  }

  onEdit(): void {
    this.isEditing = true;
    this.populateForm();
  }

  onCancel(): void {
    this.isEditing = false;
    this.profileForm.reset();
  }

  onSave(): void {
    if (this.profileForm.valid) {
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
      this.isEditing = false;
      console.log('Profile saved:', this.profile);
    } else {
      this.markFormGroupTouched();
    }
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onUploadImage(): void {
    if (this.selectedImage) {
      // In real app, this would upload to backend
      console.log('Uploading image:', this.selectedImage.name);
      // Simulate upload success
      this.profile.personalInfo.profileImage = this.imagePreview || this.profile.personalInfo.profileImage;
      this.selectedImage = null;
      this.imagePreview = null;
    }
  }

  onRemoveImage(): void {
    this.profile.personalInfo.profileImage = undefined;
    this.selectedImage = null;
    this.imagePreview = null;
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

  private populateForm(): void {
    this.profileForm.patchValue({
      personalInfo: {
        firstName: this.profile.personalInfo.firstName,
        middleName: this.profile.personalInfo.middleName || '',
        lastName: this.profile.personalInfo.lastName,
        email: this.profile.personalInfo.email,
        phone: this.profile.personalInfo.phone,
        dateOfBirth: this.profile.personalInfo.dateOfBirth,
        gender: this.profile.personalInfo.gender
      },
      professionalInfo: {
        licenseNumber: this.profile.professionalInfo.licenseNumber,
        specialization: this.profile.professionalInfo.specialization,
        qualifications: this.profile.professionalInfo.qualifications,
        experience: this.profile.professionalInfo.experience,
        languages: this.profile.professionalInfo.languages,
        certifications: this.profile.professionalInfo.certifications,
        hospitalAffiliations: this.profile.professionalInfo.hospitalAffiliations
      },
      contactInfo: {
        address: this.profile.contactInfo.address,
        city: this.profile.contactInfo.city,
        state: this.profile.contactInfo.state,
        zipCode: this.profile.contactInfo.zipCode,
        country: this.profile.contactInfo.country,
        emergencyContact: {
          name: this.profile.contactInfo.emergencyContact.name,
          relationship: this.profile.contactInfo.emergencyContact.relationship,
          phone: this.profile.contactInfo.emergencyContact.phone,
          email: this.profile.contactInfo.emergencyContact.email
        }
      },
      bio: {
        summary: this.profile.bio.summary,
        expertise: this.profile.bio.expertise,
        achievements: this.profile.bio.achievements,
        researchInterests: this.profile.bio.researchInterests
      },
      preferences: {
        consultationFee: this.profile.preferences.consultationFee,
        availability: this.profile.preferences.availability,
        notificationSettings: {
          email: this.profile.preferences.notificationSettings.email,
          sms: this.profile.preferences.notificationSettings.sms,
          push: this.profile.preferences.notificationSettings.push
        },
        timezone: this.profile.preferences.timezone,
        language: this.profile.preferences.language
      }
    });
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
