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
}
