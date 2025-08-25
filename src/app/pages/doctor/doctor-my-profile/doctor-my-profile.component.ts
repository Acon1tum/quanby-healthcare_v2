import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.initForm();
  }

  loadProfile(): void {
    // Mock data - in real app, this would come from a service
    this.profile = {
      personalInfo: {
        firstName: 'Dr. Sarah',
        middleName: 'Elizabeth',
        lastName: 'Johnson',
        email: 'sarah.johnson@quanbyhealth.com',
        phone: '+1 (555) 123-4567',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'Female',
        profileImage: '/assets/doctor-avatar.jpg'
      },
      professionalInfo: {
        licenseNumber: 'MD123456789',
        specialization: 'Cardiology',
        qualifications: 'MBBS, MD (Cardiology), FACC',
        experience: 12,
        languages: ['English', 'Spanish'],
        certifications: ['Board Certified Cardiologist', 'Advanced Cardiac Life Support'],
        hospitalAffiliations: ['Quanby Medical Center', 'City General Hospital']
      },
      contactInfo: {
        address: '123 Medical Plaza, Suite 400',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA',
        emergencyContact: {
          name: 'Michael Johnson',
          relationship: 'Spouse',
          phone: '+1 (555) 987-6543',
          email: 'michael.johnson@email.com'
        }
      },
      bio: {
        summary: 'Experienced cardiologist with over 12 years of practice specializing in interventional cardiology, heart failure management, and preventive cardiology. Committed to providing patient-centered care with the latest evidence-based treatments.',
        expertise: ['Interventional Cardiology', 'Heart Failure Management', 'Preventive Cardiology', 'Echocardiography'],
        achievements: ['Fellow of the American College of Cardiology', 'Top Doctor Award 2023', 'Published 25+ research papers'],
        researchInterests: ['Heart Failure Biomarkers', 'Preventive Cardiology', 'Cardiac Imaging Advances']
      },
      preferences: {
        consultationFee: 250,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        notificationSettings: {
          email: true,
          sms: false,
          push: true
        },
        timezone: 'UTC-08:00',
        language: 'English'
      },
      systemInfo: {
        lastLogin: new Date('2024-01-15T10:30:00'),
        accountCreated: new Date('2022-06-01T09:00:00'),
        status: 'Active',
        verificationStatus: 'Verified'
      }
    };
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
        hospitalAffiliations: [this.profile.professionalInfo.hospitalAffiliations, Validators.required]
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
}
