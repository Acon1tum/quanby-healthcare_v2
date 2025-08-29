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

  patientStats = {
    totalPatients: 156,
    activePatients: 89,
    newPatients: 12,
    consultationsToday: 8
  };

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
    { label: 'My Profile', icon: 'person', route: '/doctor/profile' }
  ];

  recentPatients = [
    {
      id: 1,
      name: 'John Smith',
      lastVisit: '2024-01-10',
      nextAppointment: '2024-01-15',
      status: 'active'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      lastVisit: '2024-01-08',
      nextAppointment: '2024-01-15',
      status: 'active'
    },
    {
      id: 3,
      name: 'Mike Wilson',
      lastVisit: '2024-01-05',
      nextAppointment: '2024-01-16',
      status: 'active'
    }
  ];

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
        // Load appointments for the logged-in doctor
        this.loadDoctorAppointments();
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
      .getUpcomingAppointments(this.currentUser.id)
      .subscribe({
        next: (appointments) => {
          this.upcomingAppointments = appointments;
          this.isLoadingAppointments = false;
          console.log('Loaded appointments:', appointments);
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
          this.isLoadingAppointments = false;
          // Fallback to empty array on error
          this.upcomingAppointments = [];
        }
      });
  }

  // Method to refresh appointments (can be called manually or on certain events)
  refreshAppointments(): void {
    this.loadDoctorAppointments();
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
}
