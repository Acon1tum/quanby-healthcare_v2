import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Appointment {
  id: number;
  patientName: string;
  patientId: number;
  specialty: string;
  date: string;
  time: string;
  type: 'Video Consultation' | 'In-Person' | 'Phone Consultation';
  status: 'confirmed' | 'pending' | 'cancelled';
  doctorId: number;
  notes?: string;
}

export interface DoctorAppointmentsResponse {
  success: boolean;
  message: string;
  data: Appointment[];
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private readonly API_URL = environment.backendApi;

  constructor(private http: HttpClient) {}

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  getDoctorAppointments(doctorId: number): Observable<Appointment[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<DoctorAppointmentsResponse>(
      `${this.API_URL}/appointments/doctor/${doctorId}`,
      { headers }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching appointments:', error);
        return of([]);
      })
    );
  }

  getUpcomingAppointments(doctorId: number): Observable<Appointment[]> {
    return this.getDoctorAppointments(doctorId).pipe(
      map(appointments => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        return appointments
          .filter(appointment => {
            const appointmentDate = new Date(appointment.date);
            appointmentDate.setHours(0, 0, 0, 0); // Reset time to start of day
            
            return appointmentDate >= today && 
                   appointment.status === 'confirmed' &&
                   appointment.type !== 'In-Person';
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }),
      catchError(error => {
        console.error('Error filtering upcoming appointments:', error);
        return of([]);
      })
    );
  }

  // Doctor weekly availability APIs
  getMyAvailability(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.API_URL}/appointments/my/availability`, { headers });
  }

  updateMyAvailability(days: Array<{ dayOfWeek: string; isAvailable: boolean; startTime?: string; endTime?: string; }>): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/appointments/my/availability`, { days }, { headers });
  }

  requestRescheduleForDay(dayOfWeek: string, reason: string, newDate?: string, newTime?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.API_URL}/appointments/my/reschedule-day`, { dayOfWeek, reason, newDate, newTime }, { headers });
  }

  // Authenticated doctor's appointments
  getMyAppointments(params?: { status?: string; page?: number; limit?: number }): Observable<any> {
    const headers = this.getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get(`${this.API_URL}/appointments/my-appointments${qs ? `?${qs}` : ''}`, { headers });
  }

  updateAppointmentStatus(appointmentId: string, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED', notes?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.API_URL}/appointments/${appointmentId}/status`, { status, notes }, { headers });
  }

  // Patient actions
  cancelMyAppointment(appointmentId: string, reason?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.API_URL}/appointments/${appointmentId}/cancel`, { reason }, { headers });
  }

  requestReschedule(appointmentId: string, newDate: string, newTime: string, reason: string, notes?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.API_URL}/appointments/${appointmentId}/reschedule`, { newDate, newTime, reason, notes }, { headers });
  }

  createAppointmentRequest(payload: {
    patientId: number;
    doctorId: number;
    requestedDate: string; // YYYY-MM-DD
    requestedTime: string; // HH:mm
    reason: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    notes?: string;
  }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.API_URL}/appointments/request`, payload, { headers });
  }

  getAvailableDoctors(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.API_URL}/appointments/doctors`, { headers });
  }

  getDoctorAvailability(doctorId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.API_URL}/appointments/doctor/${doctorId}/availability`, { headers });
  }

  // Organizations API methods
  getOrganizations(): Observable<any> {
    return this.http.get(`${this.API_URL}/organizations`);
  }

  getDoctorsByOrganization(organizationId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/organizations/${organizationId}/doctors`);
  }
}
