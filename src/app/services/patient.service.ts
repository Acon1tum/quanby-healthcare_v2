import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Patient {
  id: number;
  email: string;
  fullName: string;
  contactNumber: string;
  bloodType: string;
  createdAt: Date;
}

export interface PatientInfo {
  id: number;
  userId: number;
  fullName: string;
  gender: string;
  dateOfBirth: Date;
  contactNumber: string;
  address: string;
  weight: number;
  height: number;
  bloodType: string;
  medicalHistory: string | null;
  allergies: string | null;
  medications: string | null;
}

export interface PatientResponse {
  success: boolean;
  message: string;
  data: Patient[];
}

export interface PatientInfoResponse {
  success: boolean;
  message: string;
  data: PatientInfo;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly API_URL = `${environment.backendApi}/prescriptions`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all available patients (for doctors)
   */
  getAvailablePatients(): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(
      `${this.API_URL}/patients`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient by ID
   */
  getPatientById(patientId: number): Observable<PatientInfoResponse> {
    return this.http.get<PatientInfoResponse>(
      `${this.API_URL}/patient/${patientId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get patient information by user ID
   */
  getPatientInfoByUserId(userId: number): Observable<PatientInfoResponse> {
    return this.http.get<PatientInfoResponse>(
      `${this.API_URL}/patient-info/${userId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Search patients by name or email
   */
  searchPatients(query: string): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(
      `${this.API_URL}/search-patients?q=${encodeURIComponent(query)}`,
      { headers: this.getHeaders() }
    );
  }
}
