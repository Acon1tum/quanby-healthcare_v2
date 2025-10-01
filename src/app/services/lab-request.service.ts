import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LabRequest {
  id?: string;
  patientId: string;
  doctorId: string;
  organizationId: string;
  note?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'ON_HOLD';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requestedTests?: string;
  instructions?: string;
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
  note?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'ON_HOLD';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requestedTests?: string; // JSON string containing requested lab tests
  instructions?: string; // Special instructions for the lab
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
  exportLabRequestAsPDF(id: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/${id}/export/pdf`, { 
      headers: this.getHeaders(),
      responseType: 'text'
    });
  }

  // Download/Print PDF from HTML
  downloadPDF(html: string, filename: string): void {
    // Open HTML in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
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
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      case 'REJECTED': return 'Rejected';
      case 'ON_HOLD': return 'On Hold';
      default: return status;
    }
  }

  // Get status color class
  getStatusColorClass(status: LabRequest['status']): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      case 'REJECTED': return 'status-rejected';
      case 'ON_HOLD': return 'status-on-hold';
      default: return 'status-default';
    }
  }
}
