import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PatientItem {
  id: string;
  email: string;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
  } | null;
  patientInfo: {
    fullName: string;
    gender: string;
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
    philHealthIdVerified: boolean;
  } | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CreatePatientRequest {
  email: string;
  password: string;
  organizationId?: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  weight?: number;
  height?: number;
  bloodType: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  philHealthId?: string;
  philHealthStatus?: string;
  philHealthCategory?: string;
  philHealthExpiry?: string;
  philHealthMemberSince?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
  emergencyContactAddress?: string;
  insuranceProviderName?: string;
  insurancePolicyNumber?: string;
  insuranceContact?: string;
}

export interface UpdatePatientRequest {
  organizationId?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  address?: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  philHealthId?: string;
  philHealthStatus?: string;
  philHealthCategory?: string;
  philHealthExpiry?: string;
  philHealthMemberSince?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
  emergencyContactAddress?: string;
  insuranceProviderName?: string;
  insurancePolicyNumber?: string;
  insuranceContact?: string;
}

export interface ListPatientsQuery {
  page?: number;
  limit?: number;
  search?: string;
  organizationId?: string;
}

export interface PatientMedicalHistory {
  id: string;
  patientId: string;
  consultationId: string | null;
  creatorId: string;
  title: string;
  description: string;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  consultation?: {
    id: string;
    consultationCode: string;
    startTime: string;
    doctor: {
      id: string;
      doctorInfo: {
        firstName: string;
        lastName: string;
        specialization: string;
      };
    };
  };
  creator: {
    id: string;
    role: string;
    doctorInfo?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface PatientAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId: string | null;
  status: string;
  requestedDate: string;
  requestedTime: string;
  reason: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: {
    id: string;
    doctorInfo: {
      firstName: string;
      lastName: string;
      specialization: string;
    };
  };
  consultation?: {
    id: string;
    consultationCode: string;
    startTime: string;
    endTime: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PatientManagementService {
  private readonly API_URL = `${environment.backendApi}/patients`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get paginated list of patients for management
   */
  getPatientsPaged(query: ListPatientsQuery): Observable<ApiResponse<PaginatedResponse<PatientItem>>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.search) params.set('search', query.search);
    if (query.organizationId) params.set('organizationId', query.organizationId);

    return this.http.get<ApiResponse<PaginatedResponse<PatientItem>>>(
      `${this.API_URL}?${params.toString()}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient by ID for management
   */
  getPatientById(patientId: string): Observable<ApiResponse<PatientItem>> {
    return this.http.get<ApiResponse<PatientItem>>(
      `${this.API_URL}/${patientId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Create a new patient
   */
  createPatient(patientData: CreatePatientRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}`,
      patientData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update an existing patient
   */
  updatePatient(patientId: string, patientData: UpdatePatientRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/${patientId}`,
      patientData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Delete a patient
   */
  deletePatient(patientId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.API_URL}/${patientId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient medical history
   */
  getPatientMedicalHistory(patientId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedResponse<PatientMedicalHistory>>> {
    return this.http.get<ApiResponse<PaginatedResponse<PatientMedicalHistory>>>(
      `${this.API_URL}/${patientId}/medical-history?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient appointments
   */
  getPatientAppointments(patientId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedResponse<PatientAppointment>>> {
    return this.http.get<ApiResponse<PaginatedResponse<PatientAppointment>>>(
      `${this.API_URL}/${patientId}/appointments?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Search patients by various criteria
   */
  searchPatients(searchTerm: string, organizationId?: string): Observable<ApiResponse<PaginatedResponse<PatientItem>>> {
    const params = new URLSearchParams();
    params.set('search', searchTerm);
    if (organizationId) params.set('organizationId', organizationId);

    return this.http.get<ApiResponse<PaginatedResponse<PatientItem>>>(
      `${this.API_URL}?${params.toString()}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patients by organization
   */
  getPatientsByOrganization(organizationId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedResponse<PatientItem>>> {
    return this.http.get<ApiResponse<PaginatedResponse<PatientItem>>>(
      `${this.API_URL}?organizationId=${organizationId}&page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient statistics
   */
  getPatientStatistics(): Observable<ApiResponse<{
    totalPatients: number;
    patientsByOrganization: { organizationId: string; organizationName: string; count: number }[];
    patientsByGender: { gender: string; count: number }[];
    patientsByBloodType: { bloodType: string; count: number }[];
    recentRegistrations: { date: string; count: number }[];
  }>> {
    return this.http.get<ApiResponse<any>>(
      `${this.API_URL}/statistics`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Export patients data
   */
  exportPatients(format: 'csv' | 'excel' = 'csv', organizationId?: string): Observable<Blob> {
    const params = new URLSearchParams();
    params.set('format', format);
    if (organizationId) params.set('organizationId', organizationId);

    return this.http.get(
      `${this.API_URL}/export?${params.toString()}`,
      { 
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Bulk update patients
   */
  bulkUpdatePatients(patientIds: string[], updateData: Partial<UpdatePatientRequest>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/bulk-update`,
      { patientIds, updateData },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Bulk delete patients
   */
  bulkDeletePatients(patientIds: string[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.API_URL}/bulk-delete`,
      { 
        headers: this.getHeaders(),
        body: { patientIds }
      }
    );
  }

  /**
   * Validate patient data before creation/update
   */
  validatePatientData(patientData: CreatePatientRequest | UpdatePatientRequest): Observable<ApiResponse<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/validate`,
      patientData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient activity log
   */
  getPatientActivityLog(patientId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedResponse<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    performedAt: string;
    metadata: any;
  }>>> {
    return this.http.get<ApiResponse<PaginatedResponse<any>>>(
      `${this.API_URL}/${patientId}/activity-log?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }
}
