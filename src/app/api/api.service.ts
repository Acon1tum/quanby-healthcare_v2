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

// Audit Log Interfaces
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  category: string;
  level: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  timestamp: string;
  severity: string;
  user?: {
    id: string;
    email: string;
    role: string;
    organization?: {
      id: string;
      name: string;
    };
  };
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  description: string;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string;
  userAgent: string;
  details: any;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  timestamp: string;
  user?: {
    id: string;
    email: string;
    role: string;
    organization?: {
      id: string;
      name: string;
    };
  };
  resolvedByUser?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface AuditStatistics {
  totalLogs: number;
  totalSecurityEvents: number;
  unresolvedSecurityEvents: number;
  logsByCategory: { [key: string]: number };
  logsByLevel: { [key: string]: number };
  recentActivity: any[];
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

  // ===== AUDIT LOGS API METHODS =====

  // Get audit logs with filtering and pagination
  getAuditLogs(params: any = {}): Observable<{ success: boolean; data: { items: AuditLog[]; total: number; page: number; limit: number; totalPages: number } }> {
    const queryParams = new URLSearchParams(params).toString();
    return this.http.get<{ success: boolean; data: { items: AuditLog[]; total: number; page: number; limit: number; totalPages: number } }>(
      `${environment.backendApi}/audit/logs?${queryParams}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get audit log by ID
  getAuditLogById(id: string): Observable<{ success: boolean; data: AuditLog }> {
    return this.http.get<{ success: boolean; data: AuditLog }>(
      `${environment.backendApi}/audit/logs/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get security events with filtering and pagination
  getSecurityEvents(params: any = {}): Observable<{ success: boolean; data: { items: SecurityEvent[]; total: number; page: number; limit: number; totalPages: number } }> {
    const queryParams = new URLSearchParams(params).toString();
    return this.http.get<{ success: boolean; data: { items: SecurityEvent[]; total: number; page: number; limit: number; totalPages: number } }>(
      `${environment.backendApi}/audit/security-events?${queryParams}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Resolve security event
  resolveSecurityEvent(id: string, resolutionNotes: string): Observable<{ success: boolean; data: SecurityEvent }> {
    return this.http.put<{ success: boolean; data: SecurityEvent }>(
      `${environment.backendApi}/audit/security-events/${id}/resolve`,
      { resolutionNotes },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get audit statistics
  getAuditStatistics(): Observable<{ success: boolean; data: AuditStatistics }> {
    return this.http.get<{ success: boolean; data: AuditStatistics }>(
      `${environment.backendApi}/audit/statistics`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // ===== SUPER ADMIN API METHODS =====

  // Get system statistics
  getSystemStatistics(timeRange: string = '30d'): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${environment.backendApi}/super-admin/statistics?timeRange=${timeRange}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get system health
  getSystemHealth(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${environment.backendApi}/super-admin/health`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get organizations with statistics
  getOrganizationsWithStats(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${environment.backendApi}/super-admin/organizations`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get recent activities
  getRecentActivities(limit: number = 20): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${environment.backendApi}/super-admin/activities?limit=${limit}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get user statistics
  getUserStatistics(timeRange: string = '30d'): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${environment.backendApi}/super-admin/users/statistics?timeRange=${timeRange}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Get security events (super admin endpoint)
  getSuperAdminSecurityEvents(limit: number = 10, resolved?: boolean): Observable<{ success: boolean; data: any[] }> {
    let url = `${environment.backendApi}/super-admin/security/events?limit=${limit}`;
    if (resolved !== undefined) {
      url += `&resolved=${resolved}`;
    }
    return this.http.get<{ success: boolean; data: any[] }>(
      url,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Resolve security event (super admin endpoint)
  resolveSuperAdminSecurityEvent(eventId: string, resolutionNotes: string): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.patch<{ success: boolean; data: any; message: string }>(
      `${environment.backendApi}/super-admin/security/events/${eventId}/resolve`,
      { resolutionNotes },
      { headers: this.authService.getAuthHeaders() }
    );
  }
}
