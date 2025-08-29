import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  token?: string;
  refreshToken?: string;
  doctorInfo?: {
    firstName: string;
    lastName: string;
    specialization: string;
    middleName?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
    dateOfBirth?: string;
    contactNumber?: string;
    address?: string;
    qualifications?: string;
    experience?: number;
  };
  patientInfo?: {
    fullName: string;
    gender: string;
    dateOfBirth: string;
    contactNumber?: string;
    address?: string;
    weight?: number;
    height?: number;
    bloodType?: string;
    medicalHistory?: string;
    allergies?: string[];
    medications?: string[];
    emergencyContact?: {
      contactName: string;
      relationship: string;
      contactNumber: string;
      contactAddress?: string;
    };
    insuranceInfo?: {
      providerName: string;
      policyNumber: string;
      insuranceContact: string;
    };
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface BackendLoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      email: string;
      role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
      doctorInfo?: any;
      patientInfo?: any;
    };
    token: string;
    refreshToken: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private readonly API_URL = environment.backendApi;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Check if user is already logged in from localStorage
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('accessToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    
    if (savedUser && savedToken) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  async getProfile(): Promise<User | null> {
    try {
      const headers = this.getAuthHeaders();
      const response = await firstValueFrom(this.http.get<any>(`${this.API_URL}/auth/profile`, { headers }));

      if (!response) return null;

      // Some backends wrap in { success, data }; support both
      const payload = response.data?.user ? response.data : response;
      const userData = payload.user || payload;

      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        token: this.accessToken || undefined,
        refreshToken: this.refreshToken || undefined,
        doctorInfo: userData.doctorInfo ? {
          firstName: userData.doctorInfo.firstName,
          middleName: userData.doctorInfo.middleName,
          lastName: userData.doctorInfo.lastName,
          gender: userData.doctorInfo.gender,
          dateOfBirth: userData.doctorInfo.dateOfBirth,
          contactNumber: userData.doctorInfo.contactNumber,
          address: userData.doctorInfo.address,
          specialization: userData.doctorInfo.specialization,
          qualifications: userData.doctorInfo.qualifications,
          experience: userData.doctorInfo.experience,
        } : undefined,
        patientInfo: userData.patientInfo ? {
          fullName: userData.patientInfo.fullName,
          gender: userData.patientInfo.gender,
          dateOfBirth: userData.patientInfo.dateOfBirth,
          contactNumber: userData.patientInfo.contactNumber,
          address: userData.patientInfo.address,
          weight: userData.patientInfo.weight,
          height: userData.patientInfo.height,
          bloodType: userData.patientInfo.bloodType,
          medicalHistory: userData.patientInfo.medicalHistory,
          allergies: userData.patientInfo.allergies,
          medications: userData.patientInfo.medications,
          emergencyContact: userData.patientInfo.emergencyContact,
          insuranceInfo: userData.patientInfo.insuranceInfo,
        } : (userData.patient ? { // support alternative shape
          fullName: userData.patient.fullName,
          gender: userData.patient.gender,
          dateOfBirth: userData.patient.dateOfBirth,
          contactNumber: userData.patient.contactNumber,
          address: userData.patient.address,
          weight: userData.patient.weight,
          height: userData.patient.height,
          bloodType: userData.patient.bloodType,
          medicalHistory: userData.patient.medicalHistory,
          allergies: userData.patient.allergies,
          medications: userData.patient.medications,
          emergencyContact: userData.patient.emergencyContact,
          insuranceInfo: userData.patient.insuranceInfo,
        } : undefined),
      };

      // Update current user cache with fresher profile info
      const current = this.currentUserValue;
      const merged = { ...(current || {}), ...mappedUser } as User;
      this.currentUserSubject.next(merged);
      localStorage.setItem('currentUser', JSON.stringify(merged));

      return merged;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return null;
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserValue && !!localStorage.getItem('accessToken');
  }

  get userRole(): 'ADMIN' | 'DOCTOR' | 'PATIENT' | null {
    return this.currentUserValue?.role || null;
  }

  get accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const response = await firstValueFrom(this.http.post<BackendLoginResponse>(
        `${this.API_URL}/auth/login`,
        credentials
      ));

      if (response?.success && response.data) {
        const user: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          role: response.data.user.role,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          doctorInfo: response.data.user.doctorInfo,
          patientInfo: response.data.user.patientInfo
        };

        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        this.currentUserSubject.next(user);
        
        return {
          success: true,
          message: response.message,
          user
        };
      } else {
        return {
          success: false,
          message: response?.message || 'Login failed'
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.status === 401) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      } else if (error.status === 400) {
        return {
          success: false,
          message: error.error?.message || 'Invalid request data'
        };
      } else {
        return {
          success: false,
          message: 'An error occurred during login. Please try again.'
        };
      }
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = this.refreshToken;
      if (!refreshToken) {
        return false;
      }

      const response = await firstValueFrom(this.http.post<BackendLoginResponse>(
        `${this.API_URL}/auth/refresh`,
        { refreshToken }
      ));

      if (response?.success && response.data) {
        // Update stored tokens
        localStorage.setItem('accessToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        // Update user object with new token
        const currentUser = this.currentUserValue;
        if (currentUser) {
          currentUser.token = response.data.token;
          currentUser.refreshToken = response.data.refreshToken;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          this.currentUserSubject.next(currentUser);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.refreshToken;
      if (refreshToken) {
        // Call backend logout endpoint
        await firstValueFrom(this.http.post(`${this.API_URL}/auth/logout`, { refreshToken }));
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state regardless of backend response
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      this.currentUserSubject.next(null);
      
      // Redirect to login page
      this.router.navigate(['/login']);
    }
  }

  redirectBasedOnRole(): void {
    const user = this.currentUserValue;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    switch (user.role) {
      case 'ADMIN':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'DOCTOR':
        this.router.navigate(['/doctor/dashboard']);
        break;
      case 'PATIENT':
        this.router.navigate(['/patient/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  // Check if user has required role
  hasRole(requiredRole: 'ADMIN' | 'DOCTOR' | 'PATIENT'): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    
    if (requiredRole === 'ADMIN') {
      return user.role === 'ADMIN';
    } else if (requiredRole === 'DOCTOR') {
      return user.role === 'ADMIN' || user.role === 'DOCTOR';
    } else {
      return true; // All roles can access patient-level features
    }
  }

  // Get HTTP headers with authorization token
  getAuthHeaders(): HttpHeaders {
    const token = this.accessToken;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  // Check if token is expired and refresh if needed
  async checkAndRefreshToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      // Decode JWT token to check expiration
      const tokenPayload = JSON.parse(atob(this.accessToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // If token expires in less than 5 minutes, refresh it
      if (tokenPayload.exp && (tokenPayload.exp - currentTime) < 300) {
        return await this.refreshAccessToken();
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return await this.refreshAccessToken();
    }
  }
}
