import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginCredentials } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isLoggedIn) {
      this.authService.redirectBasedOnRole();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const credentials: LoginCredentials = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value
      };

      const result = await this.authService.login(credentials);

      if (result.success && result.user) {
        this.successMessage = result.message;
        
        // Store remember me preference
        if (this.loginForm.get('rememberMe')?.value) {
          localStorage.setItem('rememberMe', 'true');
        }

        // Redirect based on user role
        setTimeout(() => {
          this.authService.redirectBasedOnRole();
        }, 1000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      if (field.errors?.['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  // Demo login methods for testing
  loginAsAdmin(): void {
    this.loginForm.patchValue({
      email: 'admin@metrogeneral.com',
      password: 'admin123'
    });
    this.onSubmit();
  }

  loginAsDoctor(): void {
    this.loginForm.patchValue({
      email: 'dr.williams@metrogeneral.com',
      password: 'doctor123'
    });
    this.onSubmit();
  }

  loginAsPatient(): void {
    this.loginForm.patchValue({
      email: 'patient.anderson@email.com',
      password: 'patient123'
    });
    this.onSubmit();
  }

  loginAsSuperAdmin(): void {
    this.loginForm.patchValue({
      email: 'superadmin@qhealth.com',
      password: 'superadmin123'
    });
    this.onSubmit();
  }
}
