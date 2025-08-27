import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthTestService {
  private readonly API_URL = environment.backendApi;

  constructor(private http: HttpClient) {}

  /**
   * Test backend connectivity
   */
  async testBackendConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Test a simple endpoint - you might need to create a health check endpoint
      const response = await firstValueFrom(this.http.get(`${this.API_URL.replace('/api', '')}/health`));
      return {
        success: true,
        message: 'Backend is reachable',
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Backend connection failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Test login with sample credentials
   */
  async testLogin(email: string, password: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await firstValueFrom(this.http.post(`${this.API_URL}/auth/login`, {
        email,
        password
      }));
      
      return {
        success: true,
        message: 'Login test successful',
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Login test failed: ${error.error?.message || error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Get test credentials from seed data
   */
  getTestCredentials(): Array<{ role: string; email: string; password: string; description: string }> {
    return [
      {
        role: 'Admin',
        email: 'admin@qhealth.com',
        password: 'admin123',
        description: 'Full system access'
      },
      {
        role: 'Doctor',
        email: 'dr.smith@qhealth.com',
        password: 'doctor123',
        description: 'Cardiologist - Interventional Cardiology'
      },
      {
        role: 'Doctor',
        email: 'dr.johnson@qhealth.com',
        password: 'doctor123',
        description: 'Dermatologist - Cosmetic Dermatology'
      },
      {
        role: 'Patient',
        email: 'patient.anderson@email.com',
        password: 'patient123',
        description: 'Patient account'
      }
    ];
  }
}
