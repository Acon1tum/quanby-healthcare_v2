import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getDoctorsPaged(options: { page: number; limit: number; search?: string; organizationId?: string; }): Observable<ApiResponse<PaginatedResponse<DoctorItem>>> {
    let params = new HttpParams()
      .set('page', String(options.page))
      .set('limit', String(options.limit));

    if (options.search && options.search.trim()) params = params.set('search', options.search.trim());
    if (options.organizationId) params = params.set('organizationId', options.organizationId);

    return this.http.get<ApiResponse<PaginatedResponse<DoctorItem>>>(`${this.apiUrl}/doctors`, { params });
  }

  getDoctorById(id: string): Observable<ApiResponse<DoctorItem>> {
    return this.http.get<ApiResponse<DoctorItem>>(`${this.apiUrl}/doctors/${id}`);
  }

  createDoctor(payload: any): Observable<ApiResponse<{ id: string; email: string }>> {
    return this.http.post<ApiResponse<{ id: string; email: string }>>(`${this.apiUrl}/doctors`, payload, { headers: this.getAuthHeaders() });
  }

  updateDoctor(id: string, payload: any): Observable<ApiResponse<{ id: string }>> {
    return this.http.put<ApiResponse<{ id: string }>>(`${this.apiUrl}/doctors/${id}`, payload, { headers: this.getAuthHeaders() });
  }

  deleteDoctor(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/doctors/${id}`, { headers: this.getAuthHeaders() });
  }
}


