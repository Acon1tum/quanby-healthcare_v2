import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Diagnosis {
  id: number;
  patientId: number;
  doctorId: number;
  consultationId?: number;
  diagnosisCode?: string;
  diagnosisName: string;
  description?: string;
  severity: DiagnosisSeverity;
  status: DiagnosisStatus;
  onsetDate?: Date;
  diagnosedAt: Date;
  resolvedAt?: Date;
  notes?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: number;
    email: string;
    patientInfo?: {
      fullName: string;
    };
  };
  doctor?: {
    id: number;
    email: string;
    doctorInfo?: {
      firstName: string;
      lastName: string;
    };
  };
  consultation?: {
    id: number;
    consultationCode: string;
  };
}

export enum DiagnosisSeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL'
}

export enum DiagnosisStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CHRONIC = 'CHRONIC',
  SUSPECTED = 'SUSPECTED',
  RULED_OUT = 'RULED_OUT'
}

export interface CreateDiagnosisRequest {
  patientId: number;
  consultationId?: number;
  diagnosisCode?: string;
  diagnosisName: string;
  description?: string;
  severity?: DiagnosisSeverity;
  status?: DiagnosisStatus;
  onsetDate?: Date;
  resolvedAt?: Date;
  notes?: string;
  isPrimary?: boolean;
}

export interface UpdateDiagnosisRequest {
  diagnosisCode?: string;
  diagnosisName?: string;
  description?: string;
  severity?: DiagnosisSeverity;
  status?: DiagnosisStatus;
  onsetDate?: Date;
  resolvedAt?: Date;
  notes?: string;
  isPrimary?: boolean;
}

export interface DiagnosisResponse {
  success: boolean;
  message: string;
  data?: Diagnosis | Diagnosis[];
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosesService {
  private readonly API_URL = `${environment.backendApi}/diagnoses`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Create a new diagnosis
   */
  createDiagnosis(diagnosisData: CreateDiagnosisRequest): Observable<DiagnosisResponse> {
    return this.http.post<DiagnosisResponse>(
      `${this.API_URL}/create`,
      diagnosisData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get diagnoses for a specific patient
   */
  getPatientDiagnoses(patientId: number): Observable<DiagnosisResponse> {
    return this.http.get<DiagnosisResponse>(
      `${this.API_URL}/patient/${patientId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get diagnoses by a specific doctor
   */
  getDoctorDiagnoses(): Observable<DiagnosisResponse> {
    return this.http.get<DiagnosisResponse>(
      `${this.API_URL}/doctor`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update diagnosis
   */
  updateDiagnosis(diagnosisId: number, updateData: UpdateDiagnosisRequest): Observable<DiagnosisResponse> {
    return this.http.put<DiagnosisResponse>(
      `${this.API_URL}/${diagnosisId}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Delete diagnosis
   */
  deleteDiagnosis(diagnosisId: number): Observable<DiagnosisResponse> {
    return this.http.delete<DiagnosisResponse>(
      `${this.API_URL}/${diagnosisId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Validate diagnosis data
   */
  validateDiagnosisData(data: CreateDiagnosisRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.patientId) {
      errors.push('Patient ID is required');
    }

    if (!data.diagnosisName || data.diagnosisName.trim() === '') {
      errors.push('Diagnosis name is required');
    }

    if (data.onsetDate && data.resolvedAt && new Date(data.onsetDate) > new Date(data.resolvedAt)) {
      errors.push('Onset date cannot be after resolved date');
    }

    if (data.resolvedAt && new Date(data.resolvedAt) > new Date()) {
      errors.push('Resolved date cannot be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
