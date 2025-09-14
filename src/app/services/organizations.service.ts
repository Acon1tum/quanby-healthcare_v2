import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class OrganizationsService {
  private apiUrl = 'http://localhost:3000/api'; // Update with your actual API URL

  constructor(private http: HttpClient) {}

  // Get all organizations
  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${this.apiUrl}/organizations`);
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
    return this.http.post<ApiResponse<Organization>>(`${this.apiUrl}/organizations`, organization);
  }

  // Update organization
  updateOrganization(id: string, organization: Partial<Organization>): Observable<ApiResponse<Organization>> {
    return this.http.put<ApiResponse<Organization>>(`${this.apiUrl}/organizations/${id}`, organization);
  }

  // Delete organization
  deleteOrganization(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/organizations/${id}`);
  }

  // Toggle organization status
  toggleOrganizationStatus(id: string, isActive: boolean): Observable<ApiResponse<Organization>> {
    return this.http.patch<ApiResponse<Organization>>(`${this.apiUrl}/organizations/${id}/status`, { isActive });
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
