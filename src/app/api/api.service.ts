import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface Consultation {
  id: number;
  startTime: string;
  endTime?: string;
  consultationCode: string;
  isPublic: boolean;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  followUpDate?: string;
  doctor?: {
    doctorInfo?: {
      firstName?: string;
      lastName?: string;
      specialization?: string;
    };
  };
  healthScan?: any;
}

export interface MedicalRecordsSummary {
  patientInfo: any;
  consultations: Consultation[];
  healthScans: any[];
  medicalHistory: any[];
  healthTrends: any;
  summary: {
    totalConsultations: number;
    totalHealthScans: number;
    totalMedicalRecords: number;
    lastConsultation: string | null;
    lastHealthScan: string | null;
    lastMedicalRecord: string | null;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'SUPER_ADMIN';
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
  profilePicture: string | null;
  profilePictureVerified: boolean;
  profilePictureVerifiedBy: string | null;
  profilePictureVerifiedAt: string | null;
  organization?: {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  doctorInfo?: {
    id: string;
    userId: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string;
    contactNumber: string;
    address: string;
    bio: string;
    specialization: string;
    qualifications: string;
    experience: number;
    prcId: string | null;
    ptrId: string | null;
    medicalLicenseLevel: string | null;
    philHealthAccreditation: string | null;
    licenseNumber: string | null;
    licenseExpiry: string | null;
    isLicenseActive: boolean;
    additionalCertifications: string | null;
    licenseIssuedBy: string | null;
    licenseIssuedDate: string | null;
    renewalRequired: boolean;
    prcIdImage: string | null;
    ptrIdImage: string | null;
    medicalLicenseImage: string | null;
    additionalIdImages: string | null;
    idDocumentsVerified: boolean;
    idDocumentsVerifiedBy: string | null;
    idDocumentsVerifiedAt: string | null;
  };
  patientInfo?: {
    id: string;
    userId: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string;
    contactNumber: string;
    address: string;
    weight: number;
    height: number;
    bloodType: string;
    medicalHistory: string | null;
    allergies: string | null;
    medications: string | null;
    philHealthId: string | null;
    philHealthStatus: string | null;
    philHealthCategory: string | null;
    philHealthExpiry: string | null;
    philHealthMemberSince: string | null;
    philHealthIdImage: string | null;
    philHealthIdVerified: boolean;
    philHealthIdVerifiedBy: string | null;
    philHealthIdVerifiedAt: string | null;
    emergencyContact?: {
      id: string;
      patientId: string;
      contactName: string;
      relationship: string;
      contactNumber: string;
      contactAddress: string | null;
    };
    insuranceInfo?: {
      id: string;
      patientId: string;
      providerName: string;
      policyNumber: string;
      insuranceContact: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Get medical records summary (includes consultations)
  getMedicalRecordsSummary(patientId: number): Observable<{ success: boolean; data: MedicalRecordsSummary }> {
    return this.http.get<{ success: boolean; data: MedicalRecordsSummary }>(
      `${environment.backendApi}/medical-records/patient/${patientId}/summary`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get consultation details
  getConsultation(consultationId: number): Observable<{ success: boolean; data: Consultation }> {
    return this.http.get<{ success: boolean; data: Consultation }>(
      `${environment.backendApi}/consultations/${consultationId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Join consultation with code
  joinConsultation(consultationCode: string): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(
      `${environment.backendApi}/consultations/join`,
      { consultationCode },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Update consultation privacy (public/private)
  setConsultationPrivacy(consultationId: number, isPublic: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${environment.backendApi}/consultations/${consultationId}/privacy`,
      { isPublic },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get current user profile
  getCurrentUserProfile(): Observable<{ success: boolean; data: UserProfile }> {
    return this.http.get<{ success: boolean; data: UserProfile }>(
      `${environment.backendApi}/auth/profile`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Update user profile
  updateUserProfile(profileData: Partial<UserProfile>): Observable<{ success: boolean; data: UserProfile }> {
    return this.http.put<{ success: boolean; data: UserProfile }>(
      `${environment.backendApi}/auth/profile`,
      profileData,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Change password
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.backendApi}/auth/change-password`,
      { currentPassword, newPassword },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get organization by ID
  getOrganizationById(organizationId: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${environment.backendApi}/organizations/${organizationId}`
    );
  }

  // Get doctors by organization
  getDoctorsByOrganization(organizationId: string): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${environment.backendApi}/organizations/${organizationId}/doctors`
    );
  }

  // Get doctors (filtered by admin's organization automatically)
  getDoctors(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${environment.backendApi}/doctors`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get doctor by ID with schedules
  getDoctorById(doctorId: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${environment.backendApi}/doctors/${doctorId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get doctor availability/schedule by doctor ID
  getDoctorAvailability(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.backendApi}/appointments/doctor/${doctorId}/availability`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get all doctors with their schedules for admin management
  getDoctorsWithSchedules(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${environment.backendApi}/doctors`,
      { headers: this.authService.getAuthHeaders() }
    );
  }
}
