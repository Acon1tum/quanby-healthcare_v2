import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'PATIENT';
  token?: string;
  refreshToken?: string;
  profilePicture?: string;
  profilePictureVerified?: boolean;
  profilePictureVerifiedBy?: string;
  profilePictureVerifiedAt?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
  doctorInfo?: {
    id: string;
    userId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
    dateOfBirth?: string;
    contactNumber?: string;
    address?: string;
    bio?: string;
    specialization?: string;
    qualifications?: string;
    experience?: number;
    // Medical License Information
    prcId?: string;
    ptrId?: string;
    medicalLicenseLevel?: string;
    philHealthAccreditation?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    isLicenseActive?: boolean;
    // Additional License Information
    additionalCertifications?: string;
    licenseIssuedBy?: string;
    licenseIssuedDate?: string;
    renewalRequired?: boolean;
    // ID Document Uploads (Base64 encoded)
    prcIdImage?: string;
    ptrIdImage?: string;
    medicalLicenseImage?: string;
    additionalIdImages?: string;
    idDocumentsVerified?: boolean;
    idDocumentsVerifiedBy?: string;
    idDocumentsVerifiedAt?: string;
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
    philHealthId?: string;
    philHealthStatus?: string;
    philHealthCategory?: string;
    philHealthExpiry?: string;
    philHealthMemberSince?: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPatientPayload {
  email: string;
  password: string;
  role: 'PATIENT';
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  weight: number;
  height: number;
  bloodType: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
  emergencyContactAddress?: string;
  insuranceProviderName?: string;
  insurancePolicyNumber?: string;
  insuranceContact?: string;
}

export interface BackendLoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      email: string;
      role: 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'PATIENT';
      profilePicture?: string;
      profilePictureVerified?: boolean;
      profilePictureVerifiedBy?: string;
      profilePictureVerifiedAt?: string;
      organizationId?: string;
      createdAt?: string;
      updatedAt?: string;
      doctorInfo?: any;
      patientInfo?: any;
    };
    token: string;
    refreshToken: string;
  };
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  bio?: string;
  contactNumber?: string;
  address?: string;
  specialization?: string;
  qualifications?: string;
  experience?: number;
  fullName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  dateOfBirth?: string; // ISO string
  weight?: number;
  height?: number;
  bloodType?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  // Profile Picture (for all users)
  profilePicture?: string;
  // Doctor license fields
  prcId?: string;
  ptrId?: string;
  medicalLicenseLevel?: string;
  philHealthAccreditation?: string;
  licenseNumber?: string;
  licenseExpiry?: string; // ISO string
  isLicenseActive?: boolean;
  additionalCertifications?: string;
  licenseIssuedBy?: string;
  licenseIssuedDate?: string; // ISO string
  renewalRequired?: boolean;
  // ID Document Uploads (optional)
  prcIdImage?: string;
  ptrIdImage?: string;
  medicalLicenseImage?: string;
  additionalIdImages?: string;
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
      try {
        const parsed = JSON.parse(savedUser);
        // Normalize stored profilePicture so it can render immediately
        if (parsed && parsed.profilePicture && typeof parsed.profilePicture === 'string') {
          const t = parsed.profilePicture.trim();
          if (!t.startsWith('data:')) {
            parsed.profilePicture = `data:image/png;base64,${t}`;
          }
        }
        this.currentUserSubject.next(parsed);
      } catch {
        this.currentUserSubject.next(JSON.parse(savedUser));
      }
    }
  }

  async registerPatient(payload: RegisterPatientPayload): Promise<{ success: boolean; message: string }>{
    try {
      const response = await firstValueFrom(this.http.post<any>(`${this.API_URL}/auth/register`, payload, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' })
      }));

      const ok = response?.success !== false;
      return { success: ok, message: response?.message || (ok ? 'Registration successful' : 'Registration failed') };
    } catch (e: any) {
      return { success: false, message: e?.error?.message || 'Registration failed' };
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

      const normalizeImage = (img?: string) => {
        if (!img) return undefined;
        const t = (img || '').trim();
        if (t.startsWith('data:')) return t;
        // Detect mime type from base64 signature
        const prefix = t.slice(0, 10);
        let mime = 'image/png';
        if (t.startsWith('/9j/')) mime = 'image/jpeg'; // JPEG
        else if (t.startsWith('iVBORw0KGgo')) mime = 'image/png'; // PNG
        else if (t.startsWith('R0lG')) mime = 'image/gif'; // GIF
        else if (t.startsWith('Qk')) mime = 'image/bmp'; // BMP
        else if (prefix.includes('PHN2Zy') || t.startsWith('PD94bWwg')) mime = 'image/svg+xml'; // SVG (base64 of <svg or xml)
        return `data:${mime};base64,${t}`;
      };

      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        token: this.accessToken || undefined,
        refreshToken: this.refreshToken || undefined,
        profilePicture: normalizeImage(userData.profilePicture),
        profilePictureVerified: userData.profilePictureVerified,
        profilePictureVerifiedBy: userData.profilePictureVerifiedBy,
        profilePictureVerifiedAt: userData.profilePictureVerifiedAt,
        organizationId: userData.organizationId,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        doctorInfo: userData.doctorInfo ? {
          id: userData.doctorInfo.id,
          userId: userData.doctorInfo.userId,
          firstName: userData.doctorInfo.firstName,
          middleName: userData.doctorInfo.middleName,
          lastName: userData.doctorInfo.lastName,
          gender: userData.doctorInfo.gender,
          dateOfBirth: userData.doctorInfo.dateOfBirth,
          contactNumber: userData.doctorInfo.contactNumber,
          address: userData.doctorInfo.address,
          bio: userData.doctorInfo.bio,
          specialization: userData.doctorInfo.specialization,
          qualifications: userData.doctorInfo.qualifications,
          experience: userData.doctorInfo.experience,
          // Medical License Information
          prcId: userData.doctorInfo.prcId,
          ptrId: userData.doctorInfo.ptrId,
          medicalLicenseLevel: userData.doctorInfo.medicalLicenseLevel,
          philHealthAccreditation: userData.doctorInfo.philHealthAccreditation,
          licenseNumber: userData.doctorInfo.licenseNumber,
          licenseExpiry: userData.doctorInfo.licenseExpiry,
          isLicenseActive: userData.doctorInfo.isLicenseActive,
          // Additional License Information
          additionalCertifications: userData.doctorInfo.additionalCertifications,
          licenseIssuedBy: userData.doctorInfo.licenseIssuedBy,
          licenseIssuedDate: userData.doctorInfo.licenseIssuedDate,
          renewalRequired: userData.doctorInfo.renewalRequired,
          // ID Document Uploads
          prcIdImage: userData.doctorInfo.prcIdImage,
          ptrIdImage: userData.doctorInfo.ptrIdImage,
          medicalLicenseImage: userData.doctorInfo.medicalLicenseImage,
          additionalIdImages: userData.doctorInfo.additionalIdImages,
          idDocumentsVerified: userData.doctorInfo.idDocumentsVerified,
          idDocumentsVerifiedBy: userData.doctorInfo.idDocumentsVerifiedBy,
          idDocumentsVerifiedAt: userData.doctorInfo.idDocumentsVerifiedAt,
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
          philHealthId: userData.patientInfo.philHealthId,
          philHealthStatus: userData.patientInfo.philHealthStatus,
          philHealthCategory: userData.patientInfo.philHealthCategory,
          philHealthExpiry: userData.patientInfo.philHealthExpiry,
          philHealthMemberSince: userData.patientInfo.philHealthMemberSince,
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
          philHealthId: userData.patient.philHealthId,
          philHealthStatus: userData.patient.philHealthStatus,
          philHealthCategory: userData.patient.philHealthCategory,
          philHealthExpiry: userData.patient.philHealthExpiry,
          philHealthMemberSince: userData.patient.philHealthMemberSince,
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

  get userRole(): 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'PATIENT' | null {
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
        // Normalize image helper
        const normalizeImage = (img?: string) => {
          if (!img) return undefined;
          const t = (img || '').trim();
          if (t.startsWith('data:')) return t;
          // Minimal detection; most common is jpeg/png
          let mime = 'image/png';
          if (t.startsWith('/9j/')) mime = 'image/jpeg';
          else if (t.startsWith('iVBORw0KGgo')) mime = 'image/png';
          return `data:${mime};base64,${t}`;
        };

        const user: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          role: response.data.user.role,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          profilePicture: normalizeImage(response.data.user.profilePicture),
          profilePictureVerified: response.data.user.profilePictureVerified,
          profilePictureVerifiedBy: response.data.user.profilePictureVerifiedBy,
          profilePictureVerifiedAt: response.data.user.profilePictureVerifiedAt,
          organizationId: response.data.user.organizationId,
          createdAt: response.data.user.createdAt,
          updatedAt: response.data.user.updatedAt,
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

  async updateProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; message: string }>{
    try {
      const headers = this.getAuthHeaders();
      const response = await firstValueFrom(this.http.put<any>(`${this.API_URL}/auth/profile`, payload, { headers }));

      const ok = response?.success !== false;

      // Don't automatically refresh the global user state to avoid affecting sidebar
      // Let the individual components handle their own refresh if needed
      if (ok) {
        // Only update the current user's doctorInfo or patientInfo if we have the updated data
        const currentUser = this.currentUserValue;
        if (currentUser && response?.data) {
          const updatedUser = { ...currentUser };
          
          if (currentUser.role === 'DOCTOR' && response.data.doctorInfo) {
            updatedUser.doctorInfo = { ...currentUser.doctorInfo, ...response.data.doctorInfo };
          } else if (currentUser.role === 'PATIENT' && response.data.patientInfo) {
            updatedUser.patientInfo = { ...currentUser.patientInfo, ...response.data.patientInfo };
          }
          
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
      }

      return { success: ok, message: response?.message || (ok ? 'Profile updated successfully' : 'Profile update failed') };
    } catch (e: any) {
      return { success: false, message: e?.error?.message || 'Profile update failed' };
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
      case 'SUPER_ADMIN':
        this.router.navigate(['/admin/dashboard']); // Super admin uses admin dashboard
        break;
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
  hasRole(requiredRole: 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'PATIENT'): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    
    if (requiredRole === 'SUPER_ADMIN') {
      return user.role === 'SUPER_ADMIN';
    } else if (requiredRole === 'ADMIN') {
      return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    } else if (requiredRole === 'DOCTOR') {
      return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'DOCTOR';
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
