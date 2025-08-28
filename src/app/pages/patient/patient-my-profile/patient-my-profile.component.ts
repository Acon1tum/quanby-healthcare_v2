import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';

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
  profile!: PatientProfile;
  isEditing = false;
  selectedImage: File | null = null;
  age: number = 0;

  // Form groups
  profileForm!: FormGroup;

  // Options for dropdowns
  genderOptions = ['MALE', 'FEMALE', 'OTHER'];
  bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  languageOptions = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi'];
  communicationOptions = ['Email', 'Phone', 'SMS', 'In-App'];

  constructor(
    private fb: FormBuilder,
    private router: Router
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
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        gender: 'MALE',
        dateOfBirth: '1990-01-01',
        contactNumber: '+1 (555) 123-4567',
        address: '123 Main Street, City, State 12345',
        weight: 70,
        height: 175,
        bloodType: 'O+',
        medicalHistory: 'No significant medical history',
        allergies: ['Penicillin', 'Peanuts'],
        medications: ['Vitamin D', 'Omega-3'],
        profileImage: undefined
      },
      emergencyContact: {
        contactName: 'Jane Doe',
        relationship: 'Spouse',
        contactNumber: '+1 (555) 987-6543',
        contactAddress: '123 Main Street, City, State 12345'
      },
      insuranceInfo: {
        providerName: 'Blue Cross Blue Shield',
        policyNumber: 'BCBS123456789',
        insuranceContact: '+1 (800) 555-0123'
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

  private loadProfile(): void {
    // In a real app, this would load from a service
    this.profileForm.patchValue(this.profile);
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
}
