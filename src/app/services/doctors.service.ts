import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DoctorInfoDTO {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  specialization: string;
  qualifications?: string;
  experience?: number;
  contactNumber?: string;
}

export interface DoctorItem {
  id: string;
  email: string;
  organizationId?: string | null;
  organization?: { id: string; name: string } | null;
  doctorInfo?: DoctorInfoDTO | null;
}

@Injectable({ providedIn: 'root' })
export class DoctorsService {
  private apiUrl = environment.backendApi;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getCurrentUserOrganizationId(): string | null {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.organizationId || null;
  }

  private isAdminUser(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'ADMIN';
  }

  private isSuperAdminUser(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'SUPER_ADMIN';
  }

  getDoctorsPaged(options: { page: number; limit: number; search?: string; organizationId?: string; }): Observable<ApiResponse<PaginatedResponse<DoctorItem>>> {
    let params = new HttpParams()
      .set('page', String(options.page))
      .set('limit', String(options.limit));

    if (options.search && options.search.trim()) params = params.set('search', options.search.trim());
    
    // Organization filtering logic:
    // - If user is ADMIN: only show doctors from their organization (ignore options.organizationId)
    // - If user is SUPER_ADMIN: allow filtering by organizationId parameter
    // - If user is not authenticated or other roles: allow filtering by organizationId parameter
    if (this.isAdminUser()) {
      // Admin users can only see doctors from their own organization
      const userOrgId = this.getCurrentUserOrganizationId();
      if (userOrgId) {
        params = params.set('organizationId', userOrgId);
      }
    } else if (this.isSuperAdminUser() && options.organizationId) {
      // Super admin can filter by any organization
      params = params.set('organizationId', options.organizationId);
    } else if (!this.isAdminUser() && !this.isSuperAdminUser() && options.organizationId) {
      // Other users can filter by organization if specified
      params = params.set('organizationId', options.organizationId);
    }

    return this.http.get<ApiResponse<PaginatedResponse<DoctorItem>>>(`${this.apiUrl}/doctors`, { params });
  }

  getDoctorById(id: string): Observable<ApiResponse<DoctorItem>> {
    return this.http.get<ApiResponse<DoctorItem>>(`${this.apiUrl}/doctors/${id}`);
  }

  createDoctor(payload: any): Observable<ApiResponse<{ id: string; email: string }>> {
    // If user is admin, ensure they can only create doctors in their organization
    if (this.isAdminUser()) {
      const userOrgId = this.getCurrentUserOrganizationId();
      if (userOrgId) {
        payload.organizationId = userOrgId;
      }
    }
    
    return this.http.post<ApiResponse<{ id: string; email: string }>>(`${this.apiUrl}/doctors`, payload, { headers: this.getAuthHeaders() });
  }

  updateDoctor(id: string, payload: any): Observable<ApiResponse<{ id: string }>> {
    // If user is admin, prevent them from changing the organization
    if (this.isAdminUser()) {
      // Remove organizationId from payload to prevent admin from changing it
      const { organizationId, ...adminPayload } = payload;
      return this.http.put<ApiResponse<{ id: string }>>(`${this.apiUrl}/doctors/${id}`, adminPayload, { headers: this.getAuthHeaders() });
    }
    
    return this.http.put<ApiResponse<{ id: string }>>(`${this.apiUrl}/doctors/${id}`, payload, { headers: this.getAuthHeaders() });
  }

  deleteDoctor(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/doctors/${id}`, { headers: this.getAuthHeaders() });
  }

  // Helper method to check if current user can access a specific doctor
  canAccessDoctor(doctor: DoctorItem): boolean {
    if (this.isSuperAdminUser()) {
      return true; // Super admin can access any doctor
    }
    
    if (this.isAdminUser()) {
      const userOrgId = this.getCurrentUserOrganizationId();
      return doctor.organizationId === userOrgId;
    }
    
    return true; // Other roles (doctors, patients) can access doctors
  }

  // Helper method to check if current user can create doctors
  canCreateDoctor(): boolean {
    return this.isAdminUser() || this.isSuperAdminUser();
  }

  // Helper method to check if current user can update/delete a specific doctor
  canModifyDoctor(doctor: DoctorItem): boolean {
    if (this.isSuperAdminUser()) {
      return true; // Super admin can modify any doctor
    }
    
    if (this.isAdminUser()) {
      const userOrgId = this.getCurrentUserOrganizationId();
      return doctor.organizationId === userOrgId;
    }
    
    return false; // Other roles cannot modify doctors
  }
}


