import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, RegisterPatientPayload } from '../auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting = false;
  step: 1 | 2 = 1;
  patientForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]],
      confirmPassword: ['', [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });

    this.patientForm = this.fb.group({
      // Basic demographics
      gender: ['', [Validators.required]],
      dateOfBirth: ['', [Validators.required]],
      contactNumber: ['', [Validators.required]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      weight: ['', [Validators.required, Validators.min(1)]],
      height: ['', [Validators.required, Validators.min(1)]],
      bloodType: ['', [Validators.required]],

      // Emergency contact
      emergencyContactName: [''],
      emergencyContactRelationship: [''],
      emergencyContactNumber: [''],
      emergencyContactAddress: [''],

      // Medical history
      medicalHistory: [''],
      allergies: [''],
      medications: [''],

      // Insurance
      insuranceProviderName: [''],
      insurancePolicyNumber: [''],
      insuranceContact: ['']
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isSubmitting = true;
      
      // Simulate API call
      setTimeout(() => {
        console.log('Registration form submitted:', this.registerForm.value);
        this.isSubmitting = false;
        // Proceed to step 2 (patient details)
        this.step = 2;
      }, 2000);
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched();
    }
  }

  async submitPatientInfo() {
    if (this.patientForm.invalid) {
      this.markFormGroupTouched(this.patientForm);
      return;
    }

    this.isSubmitting = true;
    const account = this.registerForm.value;
    const patient = this.patientForm.value;

    const payload: RegisterPatientPayload = {
      email: account.email,
      password: account.password,
      role: 'PATIENT',
      fullName: account.fullName,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      contactNumber: patient.contactNumber,
      address: patient.address,
      weight: Number(patient.weight),
      height: Number(patient.height),
      bloodType: patient.bloodType,
      medicalHistory: patient.medicalHistory || undefined,
      allergies: patient.allergies || undefined,
      medications: patient.medications || undefined,
      emergencyContactName: patient.emergencyContactName || undefined,
      emergencyContactRelationship: patient.emergencyContactRelationship || undefined,
      emergencyContactNumber: patient.emergencyContactNumber || undefined,
      emergencyContactAddress: patient.emergencyContactAddress || undefined,
      insuranceProviderName: patient.insuranceProviderName || undefined,
      insurancePolicyNumber: patient.insurancePolicyNumber || undefined,
      insuranceContact: patient.insuranceContact || undefined,
    };

    const res = await this.authService.registerPatient(payload);
    this.isSubmitting = false;
    if (res.success) {
      this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
    } else {
      alert(res.message);
    }
  }

  private markFormGroupTouched(group: FormGroup = this.registerForm) {
    Object.keys(group.controls).forEach(key => {
      const control = group.get(key);
      control?.markAsTouched();
    });
  }
}
