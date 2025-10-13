import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';
import { AppointmentsService, Appointment } from '../../../services/appointments.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [CommonModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.scss',
  standalone: true
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  // Current date for template binding
  currentDate = new Date();
  currentUser: User | null = null;
  private userSubscription?: Subscription;
  private appointmentsSubscription?: Subscription;
  
  // Real appointment data from service
  upcomingAppointments: Appointment[] = [];
  isLoadingAppointments = false;
  appointmentsError: string | null = null;

  // Patient statistics
  patientStats = {
    totalPatients: 0,
    activePatients: 0,
    newPatients: 0,
    consultationsToday: 0
  };
  isLoadingStats = false;
  statsError: string | null = null;

  notifications = [
    {
      id: 1,
      message: 'New patient registration: Emily Davis',
      time: '1 hour ago',
      type: 'info'
    },
    {
      id: 2,
      message: 'Lab results ready for patient John Smith',
      time: '3 hours ago',
      type: 'success'
    },
    {
      id: 3,
      message: 'Appointment reminder: 3 consultations in 2 hours',
      time: '30 minutes ago',
      type: 'warning'
    }
  ];

  quickActions = [
    { label: 'View Schedule', icon: 'calendar_today', route: '/doctor/schedule' },
    { label: 'Start Consultation', icon: 'video_call', route: '/doctor/meet' },
    { label: 'Patient Records', icon: 'folder', route: '/doctor/patients' },
    { label: 'My Profile', icon: 'person', route: '/doctor/my-profile' }
  ];

  recentPatients: any[] = [];
  isLoadingRecentPatients = false;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private appointmentsService: AppointmentsService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user and guard access by role
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'DOCTOR') {
        this.authService.redirectBasedOnRole();
      } else {
        // Load data for the logged-in doctor
        this.loadDoctorAppointments();
        this.loadPatientStatistics();
        this.loadRecentPatients();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.appointmentsSubscription?.unsubscribe();
  }

  loadDoctorAppointments(): void {
    if (!this.currentUser?.id) return;
    
    this.isLoadingAppointments = true;
    this.appointmentsSubscription = this.appointmentsService
      .getMyAppointments({ limit: 20 })
      .subscribe({
        next: (response) => {
          if (response?.success && Array.isArray(response.data)) {
            // Map backend data to component format
            this.upcomingAppointments = response.data
              .filter((appointment: any) => {
                // Only show confirmed appointments that are today or in the future
                const appointmentDate = new Date(appointment.requestedDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                appointmentDate.setHours(0, 0, 0, 0);
                
                return appointmentDate >= today && 
                       appointment.status === 'CONFIRMED' &&
                       appointment.type !== 'In-Person';
              })
              .map((appointment: any) => ({
                id: appointment.id,
                patientName: appointment.patient?.patientInfo?.fullName || 
                           appointment.patient?.email || 
                           'Unknown Patient',
                patientId: appointment.patient?.id || 0,
                specialty: appointment.doctor?.doctorInfo?.specialization || 'General Practice',
                date: appointment.requestedDate,
                time: appointment.requestedTime || '09:00',
                type: this.mapAppointmentType(appointment.type),
                status: this.mapAppointmentStatus(appointment.status),
                doctorId: appointment.doctor?.id || 0,
                notes: appointment.notes || ''
              }))
              .sort((a: Appointment, b: Appointment) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 10); // Limit to 10 upcoming appointments
          } else {
            this.upcomingAppointments = [];
          }
          this.isLoadingAppointments = false;
          console.log('Loaded appointments:', this.upcomingAppointments);
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
          this.isLoadingAppointments = false;
          this.appointmentsError = 'Failed to load appointments. Please try again.';
          this.upcomingAppointments = [];
        }
      });
  }

  // Method to refresh appointments (can be called manually or on certain events)
  refreshAppointments(): void {
    this.appointmentsError = null;
    this.loadDoctorAppointments();
  }

  loadPatientStatistics(): void {
    if (!this.currentUser?.id) return;
    
    this.isLoadingStats = true;
    this.statsError = null;
    
    // Load all appointments to calculate statistics
    this.appointmentsService.getMyAppointments({ limit: 100 }).subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          const appointments = response.data;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Calculate statistics
          const uniquePatients = new Set(appointments.map((apt: any) => apt.patient?.id).filter(Boolean));
          const todayAppointments = appointments.filter((apt: any) => {
            const aptDate = new Date(apt.requestedDate);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === today.getTime() && apt.status === 'CONFIRMED';
          });
          
          // Get new patients this month
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0, 0, 0, 0);
          
          const newPatientsThisMonth = appointments.filter((apt: any) => {
            const aptDate = new Date(apt.requestedDate);
            return aptDate >= thisMonth && apt.status === 'CONFIRMED';
          });
          
          this.patientStats = {
            totalPatients: uniquePatients.size,
            activePatients: uniquePatients.size, // For now, assume all are active
            newPatients: newPatientsThisMonth.length,
            consultationsToday: todayAppointments.length
          };
        }
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.isLoadingStats = false;
        this.statsError = 'Failed to load statistics.';
        // Keep default values (0) on error
      }
    });
  }

  loadRecentPatients(): void {
    if (!this.currentUser?.id) return;
    
    this.isLoadingRecentPatients = true;
    
    this.appointmentsService.getMyAppointments({ limit: 50 }).subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          const appointments = response.data;
          
          // Group appointments by patient and get the most recent ones
          const patientMap = new Map();
          
          appointments.forEach((appointment: any) => {
            const patientId = appointment.patient?.id;
            const patientName = appointment.patient?.patientInfo?.fullName || 
                              appointment.patient?.email || 
                              'Unknown Patient';
            
            if (patientId && patientName !== 'Unknown Patient') {
              if (!patientMap.has(patientId)) {
                patientMap.set(patientId, {
                  id: patientId,
                  name: patientName,
                  appointments: []
                });
              }
              patientMap.get(patientId).appointments.push(appointment);
            }
          });
          
          // Convert to array and sort by most recent appointment
          this.recentPatients = Array.from(patientMap.values())
            .map(patient => {
              // Sort appointments by date (most recent first)
              patient.appointments.sort((a: any, b: any) => 
                new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime()
              );
              
              const lastAppointment = patient.appointments[0];
              const nextAppointment = patient.appointments.find((apt: any) => 
                new Date(apt.requestedDate) > new Date() && apt.status === 'CONFIRMED'
              );
              
              return {
                id: patient.id,
                name: patient.name,
                lastVisit: lastAppointment?.requestedDate || null,
                nextAppointment: nextAppointment?.requestedDate || null,
                status: 'active'
              };
            })
            .sort((a, b) => new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime())
            .slice(0, 5); // Show top 5 recent patients
        }
        this.isLoadingRecentPatients = false;
      },
      error: (error) => {
        console.error('Error loading recent patients:', error);
        this.isLoadingRecentPatients = false;
        this.recentPatients = [];
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getDoctorDisplayName(): string {
    if (!this.currentUser) return 'Doctor';
    if (this.currentUser.role === 'DOCTOR' && this.currentUser.doctorInfo) {
      const first = this.currentUser.doctorInfo.firstName || '';
      const last = this.currentUser.doctorInfo.lastName || '';
      const full = `${first} ${last}`.trim();
      return full ? `Dr. ${full}` : 'Doctor';
    }
    return 'Doctor';
  }

  getAppointmentStatus(appointment: Appointment): string {
    const today = new Date();
    const appointmentDate = new Date(appointment.date);
    if (appointmentDate < today) return 'past';
    if (appointmentDate.getDate() === today.getDate()) return 'today';
    return 'upcoming';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  }

  private mapAppointmentType(backendType: string): 'Video Consultation' | 'In-Person' | 'Phone Consultation' {
    switch (backendType?.toLowerCase()) {
      case 'video':
      case 'video_consultation':
        return 'Video Consultation';
      case 'phone':
      case 'phone_consultation':
        return 'Phone Consultation';
      case 'in_person':
      case 'in-person':
        return 'In-Person';
      default:
        return 'Video Consultation'; // Default fallback
    }
  }

  private mapAppointmentStatus(backendStatus: string): 'confirmed' | 'pending' | 'cancelled' {
    switch (backendStatus?.toLowerCase()) {
      case 'confirmed':
        return 'confirmed';
      case 'pending':
        return 'pending';
      case 'cancelled':
      case 'rejected':
        return 'cancelled';
      default:
        return 'pending'; // Default fallback
    }
  }

  trackByAppointmentId(index: number, appointment: Appointment): number {
    return appointment.id;
  }

  trackByPatientId(index: number, patient: any): number {
    return patient.id;
  }
}
