import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LabRequest {
  id?: string;
  patientId: string;
  doctorId: string;
  organizationId: string;
  consultationId?: string;
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  requestedDate: Date;
  approvedDate?: Date;
  completedDate?: Date;
  testResults?: string;
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  // Additional fields for display
  patientName?: string;
  doctorName?: string;
  organizationName?: string;
}

export interface LabRequestForm {
  patientId: string;
  doctorId: string;
  organizationId: string;
  consultationId?: string;
  notes: string;
}

export interface LabRequestFilter {
  status?: string;
  patientId?: string;
  doctorId?: string;
  organizationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LabRequestService {
  private apiUrl = `${environment.backendApi}/lab-requests`;
  private labRequestsSubject = new BehaviorSubject<LabRequest[]>([]);
  public labRequests$ = this.labRequestsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    // Try different token keys that might be used
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('🔍 Lab Request Service - Token from localStorage:', token ? 'EXISTS' : 'MISSING');
    console.log('🔍 Lab Request Service - Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
    console.log('🔍 Lab Request Service - Full token:', token);
    
    if (!token) {
      console.error('❌ No JWT token found in localStorage');
      console.error('❌ Available localStorage keys:', Object.keys(localStorage));
      console.error('❌ Tried keys: accessToken, token, authToken');
    }
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    console.log('🔍 Lab Request Service - Headers being sent:', headers);
    
    return headers;
  }

  // Get all lab requests (with optional filtering)
  getLabRequests(filter?: LabRequestFilter): Observable<LabRequest[]> {
    let url = this.apiUrl;
    if (filter) {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.patientId) params.append('patientId', filter.patientId);
      if (filter.doctorId) params.append('doctorId', filter.doctorId);
      if (filter.organizationId) params.append('organizationId', filter.organizationId);
      if (filter.dateFrom) params.append('dateFrom', filter.dateFrom.toISOString());
      if (filter.dateTo) params.append('dateTo', filter.dateTo.toISOString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<LabRequest[]>(url, { headers: this.getHeaders() });
  }

  // Get lab request by ID
  getLabRequestById(id: string): Observable<LabRequest> {
    return this.http.get<LabRequest>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Create new lab request
  createLabRequest(labRequest: LabRequestForm): Observable<LabRequest> {
    console.log('🔍 Lab Request Service - Creating lab request:', labRequest);
    console.log('🔍 Lab Request Service - API URL:', this.apiUrl);
    console.log('🔍 Lab Request Service - Headers:', this.getHeaders());
    
    return this.http.post<LabRequest>(this.apiUrl, labRequest, { headers: this.getHeaders() });
  }

  // Update lab request
  updateLabRequest(id: string, labRequest: Partial<LabRequest>): Observable<LabRequest> {
    return this.http.put<LabRequest>(`${this.apiUrl}/${id}`, labRequest, { headers: this.getHeaders() });
  }

  // Update lab request status
  updateLabRequestStatus(id: string, status: LabRequest['status'], notes?: string): Observable<LabRequest> {
    return this.http.patch<LabRequest>(`${this.apiUrl}/${id}/status`, 
      { status, notes }, 
      { headers: this.getHeaders() }
    );
  }

  // Add test results to lab request
  addTestResults(id: string, results: string, attachments?: string[]): Observable<LabRequest> {
    return this.http.patch<LabRequest>(`${this.apiUrl}/${id}/results`, 
      { testResults: results, attachments }, 
      { headers: this.getHeaders() }
    );
  }

  // Delete lab request
  deleteLabRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Get lab requests for specific patient
  getPatientLabRequests(patientId: string): Observable<LabRequest[]> {
    return this.http.get<LabRequest[]>(`${this.apiUrl}/patient/${patientId}`, { headers: this.getHeaders() });
  }

  // Get lab requests for specific doctor
  getDoctorLabRequests(doctorId: string): Observable<LabRequest[]> {
    return this.http.get<LabRequest[]>(`${this.apiUrl}/doctor/${doctorId}`, { headers: this.getHeaders() });
  }

  // Export lab request as PDF
  exportLabRequestAsPDF(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/export/pdf`, { 
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Download PDF
  downloadPDF(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Refresh lab requests data
  refreshLabRequests(filter?: LabRequestFilter): void {
    this.getLabRequests(filter).subscribe({
      next: (labRequests) => {
        this.labRequestsSubject.next(labRequests);
      },
      error: (error) => {
        console.error('Error refreshing lab requests:', error);
      }
    });
  }

  // Get status display name
  getStatusDisplayName(status: LabRequest['status']): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  // Get status color class
  getStatusColorClass(status: LabRequest['status']): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-default';
    }
  }
}
