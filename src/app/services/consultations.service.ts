import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Consultation {
  id: number;
  doctorId: number;
  patientId: number;
  startTime: Date;
  endTime?: Date;
  consultationCode: string;
  isPublic: boolean;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  followUpDate?: Date;
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
}

export interface CreateDirectConsultationRequest {
  patientId: number;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  followUpDate?: Date;
}

export interface ConsultationResponse {
  success: boolean;
  message: string;
  data?: Consultation;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultationsService {
  private readonly API_URL = `${environment.backendApi}/consultations`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Create a direct consultation from doctor-meet context
   */
  createDirectConsultation(consultationData: CreateDirectConsultationRequest): Observable<ConsultationResponse> {
    return this.http.post<ConsultationResponse>(
      `${this.API_URL}/create-direct`,
      consultationData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get consultation details by ID
   */
  getConsultation(consultationId: number): Observable<ConsultationResponse> {
    return this.http.get<ConsultationResponse>(
      `${this.API_URL}/${consultationId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update consultation
   */
  updateConsultation(consultationId: number, updateData: Partial<CreateDirectConsultationRequest>): Observable<ConsultationResponse> {
    return this.http.put<ConsultationResponse>(
      `${this.API_URL}/${consultationId}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }
}
