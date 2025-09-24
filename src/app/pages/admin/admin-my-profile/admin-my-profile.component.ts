import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService, UserProfile } from '../../../api/api.service';

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
  profile: UserProfile | null = null;
  organization: any = null;
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

  constructor(private fb: FormBuilder, private apiService: ApiService) {
    this.profileForm = this.fb.group({
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      contactNumber: [''],
      address: ['', [Validators.required, Validators.minLength(10)]],
      bio: ['', [Validators.required, Validators.minLength(20)]],
      department: [''],
      // Organization fields
      orgName: [''],
      orgStatus: [''],
      orgDescription: [''],
      orgAddress: [''],
      orgPhone: [''],
      orgEmail: [''],
      orgWebsite: [''],
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
    
    this.apiService.getCurrentUserProfile().subscribe({
      next: (response) => {
        if (response.success) {
          this.profile = response.data;
          console.log('Profile loaded:', this.profile);
          console.log('OrganizationId:', this.profile.organizationId);
          console.log('Organization data:', this.profile.organization);
          
          // Set organization data directly from profile if available
          if (this.profile.organization) {
            this.organization = this.profile.organization;
            console.log('Organization set from profile:', this.organization);
            // Populate form after organization is set
            this.populateForm();
          } else if (this.profile.organizationId) {
            console.log('Loading organization for ID:', this.profile.organizationId);
            this.loadOrganization();
          } else {
            console.log('No organizationId found in profile');
            // Populate form even without organization
            this.populateForm();
          }
        } else {
          console.error('Failed to load profile:', response);
          alert('Failed to load profile data');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        alert('Error loading profile data');
        this.isLoading = false;
      }
    });
  }

  loadOrganization(): void {
    if (this.profile?.organizationId) {
      console.log('Making API call to get organization:', this.profile.organizationId);
      this.apiService.getOrganizationById(this.profile.organizationId).subscribe({
        next: (response) => {
          console.log('Organization API response:', response);
          if (response.success) {
            this.organization = response.data;
            console.log('Organization loaded successfully:', this.organization);
            // Populate form after organization is loaded
            this.populateForm();
          } else {
            console.error('Failed to load organization:', response);
            // Still populate form even if organization loading fails
            this.populateForm();
          }
        },
        error: (error) => {
          console.error('Error loading organization:', error);
          // Still populate form even if organization loading fails
          this.populateForm();
        }
      });
    }
  }

  populateForm(): void {
    if (this.profile) {
      console.log('Populating form with profile data:', this.profile);
      console.log('User email:', this.profile.email);
      console.log('Organization data:', this.organization);
      
      // For admin users, we'll use basic user info and create a simplified form
      const isDoctor = this.profile.doctorInfo;
      const isPatient = this.profile.patientInfo;
      
      // Format date for input field (YYYY-MM-DD format)
      const formatDateForInput = (dateString: string | undefined): string => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };
      
      this.profileForm.patchValue({
        gender: isDoctor ? this.profile.doctorInfo?.gender : (isPatient ? this.profile.patientInfo?.gender : ''),
        dateOfBirth: formatDateForInput(isDoctor ? this.profile.doctorInfo?.dateOfBirth : (isPatient ? this.profile.patientInfo?.dateOfBirth : '')),
        contactNumber: this.profile.email || '',
        address: isDoctor ? this.profile.doctorInfo?.address : (isPatient ? this.profile.patientInfo?.address : ''),
        bio: isDoctor ? this.profile.doctorInfo?.bio : '',
        department: this.organization?.name || 'No Organization',
        // Organization fields
        orgName: this.organization?.name || '',
        orgStatus: this.organization?.isActive ? 'Active' : 'Inactive',
        orgDescription: this.organization?.description || '',
        orgAddress: this.organization?.address || '',
        orgPhone: this.organization?.phone || '',
        orgEmail: this.organization?.email || '',
        orgWebsite: this.organization?.website || '',
        emergencyContactName: isPatient ? this.profile.patientInfo?.emergencyContact?.contactName : '',
        emergencyContactRelationship: isPatient ? this.profile.patientInfo?.emergencyContact?.relationship : '',
        emergencyContactPhone: isPatient ? this.profile.patientInfo?.emergencyContact?.contactNumber : '',
        language: 'en', // Default values for admin
        timezone: 'UTC',
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      });
      
      console.log('Form populated with values:', this.profileForm.value);
      console.log('Contact number (email) field value:', this.profileForm.get('contactNumber')?.value);
    }
  }

  startEditing(): void {
    this.isEditing = true;
    // Refresh profile data from backend before populating form
    this.loadProfile();
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
      
      const formValue = this.profileForm.value;
      
      // Prepare update data based on user role
      const updateData: any = {};
      
      if (this.profile?.role === 'DOCTOR' && this.profile.doctorInfo) {
        updateData.bio = formValue.bio;
        updateData.contactNumber = formValue.contactNumber;
        updateData.address = formValue.address;
        updateData.specialization = formValue.department;
      } else if (this.profile?.role === 'PATIENT' && this.profile.patientInfo) {
        updateData.contactNumber = formValue.contactNumber;
        updateData.address = formValue.address;
        updateData.emergencyContact = {
          contactName: formValue.emergencyContactName,
          relationship: formValue.emergencyContactRelationship,
          contactNumber: formValue.emergencyContactPhone
        };
      } else {
        // For admin users, we'll update basic info
        // Note: contactNumber field now displays organization email, so we don't save it
        updateData.address = formValue.address;
      }
      
      this.apiService.updateUserProfile(updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.profile = response.data;
            this.isEditing = false;
            this.isSaving = false;
            this.selectedImage = null;
            this.imagePreview = null;
            alert('Profile updated successfully!');
          } else {
            console.error('Failed to update profile:', response);
            alert('Failed to update profile');
            this.isSaving = false;
          }
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          alert('Error updating profile');
          this.isSaving = false;
        }
      });
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
      
      const formValue = this.passwordForm.value;
      
      this.apiService.changePassword(formValue.currentPassword, formValue.newPassword).subscribe({
        next: (response) => {
          if (response.success) {
            this.isSaving = false;
            this.isChangingPassword = false;
            this.passwordForm.reset();
            alert('Password changed successfully!');
          } else {
            console.error('Failed to change password:', response);
            alert('Failed to change password');
            this.isSaving = false;
          }
        },
        error: (error) => {
          console.error('Error changing password:', error);
          alert('Error changing password');
          this.isSaving = false;
        }
      });
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
      if (this.profile.doctorInfo) {
        const parts = [this.profile.doctorInfo.firstName];
        if (this.profile.doctorInfo.middleName) parts.push(this.profile.doctorInfo.middleName);
        parts.push(this.profile.doctorInfo.lastName);
        return parts.join(' ');
      } else if (this.profile.patientInfo) {
        return this.profile.patientInfo.fullName;
      } else {
        return 'Administrator';
      }
    }
    return '';
  }

  getAge(): number {
    if (this.profile) {
      const dateOfBirth = this.profile.doctorInfo?.dateOfBirth || this.profile.patientInfo?.dateOfBirth;
      if (dateOfBirth) {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      }
    }
    return 0;
  }

  getYearsOfService(): number {
    if (this.profile?.createdAt) {
      const hireDate = new Date(this.profile.createdAt);
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
  get contactNumber() { return this.profileForm.get('contactNumber'); }
  get address() { return this.profileForm.get('address'); }
  get bio() { return this.profileForm.get('bio'); }
  get currentPassword() { return this.passwordForm.get('currentPassword'); }
  get newPassword() { return this.passwordForm.get('newPassword'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }

  // Computed properties for template display
  get languageLabel(): string {
    return 'English'; // Default for now
  }

  get timezoneLabel(): string {
    return 'UTC'; // Default for now
  }

  get notificationLabels(): string {
    return 'Email, Push'; // Default for now
  }

  get roleLabel(): string {
    if (!this.profile) return '';
    switch (this.profile.role) {
      case 'DOCTOR': return 'Doctor';
      case 'PATIENT': return 'Patient';
      case 'ADMIN': return 'Administrator';
      case 'SUPER_ADMIN': return 'Super Administrator';
      default: return 'User';
    }
  }

  get departmentLabel(): string {
    if (!this.profile) return '';
    if (this.profile.doctorInfo) {
      return this.profile.doctorInfo.specialization;
    } else if (this.profile.patientInfo) {
      return 'Patient';
    } else {
      // For admin users, show organization name instead of department
      console.log('Getting department label - organization:', this.organization);
      console.log('Getting department label - organization name:', this.organization?.name);
      return this.organization?.name || 'Administration';
    }
  }

  get organizationName(): string {
    return this.organization?.name || 'No Organization';
  }

  get organizationDescription(): string {
    return this.organization?.description || '';
  }

  get organizationAddress(): string {
    return this.organization?.address || '';
  }
}
