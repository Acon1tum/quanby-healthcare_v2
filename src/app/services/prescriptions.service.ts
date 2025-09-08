import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Prescription {
  id?: number;
  patientId: number;
  doctorId: number;
  consultationId?: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  refills: number;
  isActive: boolean;
  prescribedAt: Date;
  expiresAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  patient?: any;
  doctor?: any;
  consultation?: any;
}

export interface CreatePrescriptionRequest {
  patientId: number;
  consultationId?: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  refills?: number;
  expiresAt?: Date;
  notes?: string;
}

export interface UpdatePrescriptionRequest {
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  refills?: number;
  expiresAt?: Date;
  notes?: string;
  isActive?: boolean;
}

export interface Patient {
  id: number;
  email: string;
  fullName: string;
  contactNumber: string;
  bloodType: string;
  createdAt: Date;
}

export interface PrescriptionResponse {
  success: boolean;
  message: string;
  data?: Prescription | Prescription[];
}

export interface PatientsResponse {
  success: boolean;
  message: string;
  data?: Patient[];
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionsService {
  private readonly API_URL = `${environment.backendApi}/prescriptions`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get available patients for prescription
   */
  getAvailablePatients(): Observable<PatientsResponse> {
    return this.http.get<PatientsResponse>(
      `${this.API_URL}/patients`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Create a new prescription
   */
  createPrescription(prescriptionData: CreatePrescriptionRequest): Observable<PrescriptionResponse> {
    return this.http.post<PrescriptionResponse>(
      `${this.API_URL}/create`,
      prescriptionData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get prescriptions for a specific patient
   */
  getPatientPrescriptions(patientId: number): Observable<PrescriptionResponse> {
    return this.http.get<PrescriptionResponse>(
      `${this.API_URL}/patient/${patientId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get prescriptions by a specific doctor
   */
  getDoctorPrescriptions(doctorId: number): Observable<PrescriptionResponse> {
    return this.http.get<PrescriptionResponse>(
      `${this.API_URL}/doctor/${doctorId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get prescription by ID
   */
  getPrescriptionById(prescriptionId: number): Observable<PrescriptionResponse> {
    return this.http.get<PrescriptionResponse>(
      `${this.API_URL}/${prescriptionId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update prescription
   */
  updatePrescription(prescriptionId: number, updateData: UpdatePrescriptionRequest): Observable<PrescriptionResponse> {
    return this.http.put<PrescriptionResponse>(
      `${this.API_URL}/${prescriptionId}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Delete prescription
   */
  deletePrescription(prescriptionId: number): Observable<PrescriptionResponse> {
    return this.http.delete<PrescriptionResponse>(
      `${this.API_URL}/${prescriptionId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get prescriptions for a specific consultation
   */
  getConsultationPrescriptions(consultationId: number): Observable<PrescriptionResponse> {
    return this.http.get<PrescriptionResponse>(
      `${this.API_URL}/consultation/${consultationId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get current user's prescriptions (for patients)
   */
  getMyPrescriptions(): Observable<PrescriptionResponse> {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role === 'PATIENT') {
      return this.getPatientPrescriptions(currentUser.id);
    } else if (currentUser.role === 'DOCTOR') {
      return this.getDoctorPrescriptions(currentUser.id);
    }
    throw new Error('Invalid user role for getting prescriptions');
  }

  /**
   * Validate prescription data before sending to API
   */
  validatePrescriptionData(data: CreatePrescriptionRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.patientId || data.patientId <= 0) {
      errors.push('Patient ID is required and must be valid');
    }

    if (!data.medicationName || data.medicationName.trim() === '') {
      errors.push('Medication name is required');
    }

    if (!data.dosage || data.dosage.trim() === '') {
      errors.push('Dosage is required');
    }

    if (!data.frequency || data.frequency.trim() === '') {
      errors.push('Frequency is required');
    }

    if (!data.duration || data.duration.trim() === '') {
      errors.push('Duration is required');
    }

    if (data.quantity !== undefined && (isNaN(data.quantity) || data.quantity <= 0)) {
      errors.push('Quantity must be a positive number');
    }

    if (data.refills !== undefined && (isNaN(data.refills) || data.refills < 0)) {
      errors.push('Refills cannot be negative');
    }

    if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
      errors.push('Expiration date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format prescription for display
   */
  formatPrescriptionForDisplay(prescription: Prescription): string {
    return `${prescription.medicationName} ${prescription.dosage} - ${prescription.frequency} for ${prescription.duration}`;
  }

  /**
   * Check if prescription is expired
   */
  isPrescriptionExpired(prescription: Prescription): boolean {
    if (!prescription.expiresAt) return false;
    return new Date(prescription.expiresAt) < new Date();
  }

  /**
   * Check if prescription is active
   */
  isPrescriptionActive(prescription: Prescription): boolean {
    return prescription.isActive && !this.isPrescriptionExpired(prescription);
  }
}
