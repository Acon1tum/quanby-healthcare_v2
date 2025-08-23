import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

interface AdminProfile {
  id: number;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  bio: string;
  profileImage?: string;
  role: string;
  department: string;
  employeeId: string;
  hireDate: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

@Component({
  selector: 'app-admin-my-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-my-profile.component.html',
  styleUrl: './admin-my-profile.component.scss'
})
export class AdminMyProfileComponent implements OnInit {
  profile: AdminProfile | null = null;
  isEditing = false;
  isChangingPassword = false;
  isSaving = false;
  isLoading = true;
  
  profileForm: FormGroup;
  passwordForm: FormGroup;
  
  // Profile image handling
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  
  // Available options
  genderOptions = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' }
  ];
  
  languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' }
  ];
  
  timezoneOptions = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'EST', label: 'EST (Eastern Standard Time)' },
    { value: 'CST', label: 'CST (Central Standard Time)' },
    { value: 'MST', label: 'MST (Mountain Standard Time)' },
    { value: 'PST', label: 'PST (Pacific Standard Time)' },
    { value: 'GMT', label: 'GMT (Greenwich Mean Time)' }
  ];

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      middleName: [''],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      bio: ['', [Validators.required, Validators.minLength(20)]],
      department: ['', Validators.required],
      emergencyContactName: ['', Validators.required],
      emergencyContactRelationship: ['', Validators.required],
      emergencyContactPhone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      language: ['', Validators.required],
      timezone: ['', Validators.required],
      emailNotifications: [true],
      smsNotifications: [false],
      pushNotifications: [true]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    
    // Simulate API call delay
    setTimeout(() => {
      this.profile = {
        id: 1,
        email: 'admin@qhealth.com',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Administrator',
        gender: 'MALE',
        dateOfBirth: '1985-06-15',
        contactNumber: '+1 (555) 123-4567',
        address: '123 Healthcare Drive, Medical District, City, State 12345',
        bio: 'Experienced healthcare administrator with over 10 years of experience in managing healthcare systems, coordinating patient care, and ensuring operational efficiency. Passionate about improving healthcare delivery and patient outcomes.',
        profileImage: 'assets/images/admin-avatar.jpg',
        role: 'System Administrator',
        department: 'Information Technology',
        employeeId: 'ADM-001',
        hireDate: '2020-01-15',
        emergencyContact: {
          name: 'Sarah Administrator',
          relationship: 'Spouse',
          phone: '+1 (555) 987-6543'
        },
        preferences: {
          language: 'en',
          timezone: 'EST',
          notifications: {
            email: true,
            sms: false,
            push: true
          }
        }
      };
      
      this.populateForm();
      this.isLoading = false;
    }, 1000);
  }

  populateForm(): void {
    if (this.profile) {
      this.profileForm.patchValue({
        firstName: this.profile.firstName,
        middleName: this.profile.middleName,
        lastName: this.profile.lastName,
        gender: this.profile.gender,
        dateOfBirth: this.profile.dateOfBirth,
        contactNumber: this.profile.contactNumber,
        address: this.profile.address,
        bio: this.profile.bio,
        department: this.profile.department,
        emergencyContactName: this.profile.emergencyContact.name,
        emergencyContactRelationship: this.profile.emergencyContact.relationship,
        emergencyContactPhone: this.profile.emergencyContact.phone,
        language: this.profile.preferences.language,
        timezone: this.profile.preferences.timezone,
        emailNotifications: this.profile.preferences.notifications.email,
        smsNotifications: this.profile.preferences.notifications.sms,
        pushNotifications: this.profile.preferences.notifications.push
      });
    }
  }

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.populateForm();
    this.selectedImage = null;
    this.imagePreview = null;
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      this.isSaving = true;
      
      // Simulate API call delay
      setTimeout(() => {
        if (this.profile) {
          const formValue = this.profileForm.value;
          
          // Update profile object
          this.profile = {
            ...this.profile,
            firstName: formValue.firstName,
            middleName: formValue.middleName,
            lastName: formValue.lastName,
            gender: formValue.gender,
            dateOfBirth: formValue.dateOfBirth,
            contactNumber: formValue.contactNumber,
            address: formValue.address,
            bio: formValue.bio,
            department: formValue.department,
            emergencyContact: {
              name: formValue.emergencyContactName,
              relationship: formValue.emergencyContactRelationship,
              phone: formValue.emergencyContactPhone
            },
            preferences: {
              language: formValue.language,
              timezone: formValue.timezone,
              notifications: {
                email: formValue.emailNotifications,
                sms: formValue.smsNotifications,
                push: formValue.pushNotifications
              }
            }
          };
          
          // Handle image upload if selected
          if (this.selectedImage) {
            // In real app, upload image to server
            console.log('Uploading image:', this.selectedImage.name);
          }
          
          this.isEditing = false;
          this.isSaving = false;
          this.selectedImage = null;
          this.imagePreview = null;
          
          // Show success message
          alert('Profile updated successfully!');
        }
      }, 1500);
    } else {
      this.markFormGroupTouched();
    }
  }

  openPasswordChange(): void {
    this.isChangingPassword = true;
    this.passwordForm.reset();
  }

  closePasswordChange(): void {
    this.isChangingPassword = false;
    this.passwordForm.reset();
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      this.isSaving = true;
      
      // Simulate API call delay
      setTimeout(() => {
        this.isSaving = false;
        this.isChangingPassword = false;
        this.passwordForm.reset();
        
        // Show success message
        alert('Password changed successfully!');
      }, 1500);
    } else {
      this.markFormGroupTouched();
    }
  }

  // Custom validators
  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Helper methods
  markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  getFullName(): string {
    if (this.profile) {
      const parts = [this.profile.firstName];
      if (this.profile.middleName) parts.push(this.profile.middleName);
      parts.push(this.profile.lastName);
      return parts.join(' ');
    }
    return '';
  }

  getAge(): number {
    if (this.profile?.dateOfBirth) {
      const birthDate = new Date(this.profile.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    }
    return 0;
  }

  getYearsOfService(): number {
    if (this.profile?.hireDate) {
      const hireDate = new Date(this.profile.hireDate);
      const today = new Date();
      let years = today.getFullYear() - hireDate.getFullYear();
      const monthDiff = today.getMonth() - hireDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hireDate.getDate())) {
        years--;
      }
      
      return years;
    }
    return 0;
  }

  // Form getters for easy access
  get firstName() { return this.profileForm.get('firstName'); }
  get lastName() { return this.profileForm.get('lastName'); }
  get contactNumber() { return this.profileForm.get('contactNumber'); }
  get address() { return this.profileForm.get('address'); }
  get bio() { return this.profileForm.get('bio'); }
  get currentPassword() { return this.passwordForm.get('currentPassword'); }
  get newPassword() { return this.passwordForm.get('newPassword'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }

  // Computed properties for template display
  get languageLabel(): string {
    if (!this.profile) return '';
    const option = this.languageOptions.find(l => l.value === this.profile!.preferences.language);
    return option ? option.label : '';
  }

  get timezoneLabel(): string {
    if (!this.profile) return '';
    const option = this.timezoneOptions.find(t => t.value === this.profile!.preferences.timezone);
    return option ? option.label : '';
  }

  get notificationLabels(): string {
    if (!this.profile) return '';
    const notifications = [];
    if (this.profile.preferences.notifications.email) notifications.push('Email');
    if (this.profile.preferences.notifications.sms) notifications.push('SMS');
    if (this.profile.preferences.notifications.push) notifications.push('Push');
    return notifications.join(', ') || 'None';
  }
}
