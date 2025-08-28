import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-dashboard',
  imports: [CommonModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.scss',
  standalone: true
})
export class PatientDashboardComponent implements OnInit {
  // Current date for template binding
  currentDate = new Date();
  
  // Mock data for dashboard
  upcomingAppointments = [
    {
      id: 1,
      doctorName: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      date: '2024-01-15',
      time: '10:00 AM',
      type: 'Video Consultation'
    },
    {
      id: 2,
      doctorName: 'Dr. Michael Chen',
      specialty: 'Dermatology',
      date: '2024-01-18',
      time: '2:30 PM',
      type: 'In-Person'
    }
  ];

  recentHealthMetrics = {
    bloodPressure: '120/80',
    heartRate: '72 bpm',
    temperature: '98.6°F',
    weight: '70 kg',
    bmi: '22.5'
  };

  notifications = [
    {
      id: 1,
      message: 'Your appointment with Dr. Johnson has been confirmed',
      time: '2 hours ago',
      type: 'success'
    },
    {
      id: 2,
      message: 'New lab results are available',
      time: '1 day ago',
      type: 'info'
    },
    {
      id: 3,
      message: 'Reminder: Take your medication',
      time: '3 hours ago',
      type: 'warning'
    }
  ];

  quickActions = [
    { label: 'Book Appointment', icon: 'calendar_today', route: '/patient/schedule' },
    { label: 'Start Consultation', icon: 'video_call', route: '/patient/meet' },
    { label: 'View Profile', icon: 'person', route: '/patient/profile' },
    { label: 'Health Records', icon: 'folder', route: '/patient/records' }
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
}
