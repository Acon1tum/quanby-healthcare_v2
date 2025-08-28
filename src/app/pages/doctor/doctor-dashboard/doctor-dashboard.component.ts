import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [CommonModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.scss',
  standalone: true
})
export class DoctorDashboardComponent implements OnInit {
  // Current date for template binding
  currentDate = new Date();
  
  // Mock data for dashboard
  upcomingAppointments = [
    {
      id: 1,
      patientName: 'John Smith',
      specialty: 'Cardiology',
      date: '2024-01-15',
      time: '10:00 AM',
      type: 'Video Consultation',
      status: 'confirmed'
    },
    {
      id: 2,
      patientName: 'Sarah Johnson',
      specialty: 'Dermatology',
      date: '2024-01-15',
      time: '2:30 PM',
      type: 'In-Person',
      status: 'pending'
    },
    {
      id: 3,
      patientName: 'Mike Wilson',
      specialty: 'General Medicine',
      date: '2024-01-16',
      time: '9:00 AM',
      type: 'Video Consultation',
      status: 'confirmed'
    }
  ];

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize dashboard data
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

  getAppointmentStatus(appointment: any): string {
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
