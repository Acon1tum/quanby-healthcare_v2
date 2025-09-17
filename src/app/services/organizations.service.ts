import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Organization interface
export interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorCount?: number;
  patientCount?: number;
}

// Doctor interface for organization doctors
export interface OrganizationDoctor {
  id: string;
  name: string;
  specialization: string;
  organizationId: string;
}

// API Response interface
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Generic pagination response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationsService {
  private apiUrl = 'http://localhost:3000/api'; // Update with your actual API URL

  constructor(private http: HttpClient) {}

  // Get authorization headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get all organizations
  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${this.apiUrl}/organizations`);
  }

  // Get organizations with pagination and optional filters
  getOrganizationsPaged(options: {
    page: number;
    limit: number;
    search?: string;
    status?: 'all' | 'active' | 'inactive';
  }): Observable<ApiResponse<PaginatedResponse<Organization>>> {
    let params = new HttpParams()
      .set('page', String(options.page))
      .set('limit', String(options.limit));

    if (options.search && options.search.trim()) {
      params = params.set('search', options.search.trim());
    }

    if (options.status && options.status !== 'all') {
      params = params.set('status', options.status);
    }

    return this.http.get<ApiResponse<PaginatedResponse<Organization>>>(
      `${this.apiUrl}/organizations`,
      { params }
    );
  }

  // Get organization by ID
  getOrganizationById(id: string): Observable<ApiResponse<Organization>> {
    return this.http.get<ApiResponse<Organization>>(`${this.apiUrl}/organizations/${id}`);
  }

  // Get doctors by organization
  getDoctorsByOrganization(organizationId: string): Observable<ApiResponse<OrganizationDoctor[]>> {
    return this.http.get<ApiResponse<OrganizationDoctor[]>>(`${this.apiUrl}/organizations/${organizationId}/doctors`);
  }

  // Create new organization
  createOrganization(organization: Partial<Organization>): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(
      `${this.apiUrl}/organizations`, 
      organization,
      { headers: this.getAuthHeaders() }
    );
  }

  // Update organization
  updateOrganization(id: string, organization: Partial<Organization>): Observable<ApiResponse<Organization>> {
    return this.http.put<ApiResponse<Organization>>(
      `${this.apiUrl}/organizations/${id}`, 
      organization,
      { headers: this.getAuthHeaders() }
    );
  }

  // Delete organization
  deleteOrganization(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/organizations/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Toggle organization status
  toggleOrganizationStatus(id: string, isActive: boolean): Observable<ApiResponse<Organization>> {
    return this.http.patch<ApiResponse<Organization>>(
      `${this.apiUrl}/organizations/${id}/status`, 
      { isActive },
      { headers: this.getAuthHeaders() }
    );
  }

  // Get organization statistics
  getOrganizationStatistics(): Observable<ApiResponse<{
    totalOrganizations: number;
    activeOrganizations: number;
    totalDoctors: number;
    totalPatients: number;
  }>> {
    return this.http.get<ApiResponse<{
      totalOrganizations: number;
      activeOrganizations: number;
      totalDoctors: number;
      totalPatients: number;
    }>>(`${this.apiUrl}/organizations/statistics`);
  }
}
