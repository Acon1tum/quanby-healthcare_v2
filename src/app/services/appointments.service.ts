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
}
