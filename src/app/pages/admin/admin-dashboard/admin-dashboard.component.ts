import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalConsultations: number;
  totalRevenue: number;
  activeAppointments: number;
  pendingReports: number;
}

interface RecentActivity {
  id: number;
  type: 'consultation' | 'registration' | 'appointment' | 'report';
  description: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
  user: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalPatients: 0,
    totalDoctors: 0,
    totalConsultations: 0,
    totalRevenue: 0,
    activeAppointments: 0,
    pendingReports: 0
  };

  recentActivities: RecentActivity[] = [];
  quickActions: QuickAction[] = [];

  isLoading = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupQuickActions();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    
    // Simulate API call delay
    setTimeout(() => {
      this.stats = {
        totalPatients: 1247,
        totalDoctors: 89,
        totalConsultations: 3456,
        totalRevenue: 125000,
        activeAppointments: 23,
        pendingReports: 12
      };

      this.recentActivities = [
        {
          id: 1,
          type: 'consultation',
          description: 'Dr. Smith completed consultation with John Doe',
          timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          status: 'completed',
          user: 'Dr. Smith'
        },
        {
          id: 2,
          type: 'registration',
          description: 'New patient Sarah Johnson registered',
          timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          status: 'completed',
          user: 'Sarah Johnson'
        },
        {
          id: 3,
          type: 'appointment',
          description: 'Appointment scheduled for Dr. Wilson',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'pending',
          user: 'Dr. Wilson'
        },
        {
          id: 4,
          type: 'report',
          description: 'Monthly health report generated',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          status: 'completed',
          user: 'System'
        },
        {
          id: 5,
          type: 'consultation',
          description: 'Dr. Brown consultation cancelled',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          status: 'cancelled',
          user: 'Dr. Brown'
        }
      ];

      this.isLoading = false;
    }, 1000);
  }

  setupQuickActions(): void {
    this.quickActions = [
      {
        title: 'Add Patient',
        description: 'Register a new patient',
        icon: 'person_add',
        route: '/admin/system-administration/patient-management',
        color: '#3b82f6'
      },
      {
        title: 'Add Doctor',
        description: 'Register a new doctor',
        icon: 'medical_services',
        route: '/admin/system-administration/doctor-management',
        color: '#10b981'
      },
      {
        title: 'Schedule Management',
        description: 'Manage appointments and schedules',
        icon: 'schedule',
        route: '/admin/schedule-management',
        color: '#f59e0b'
      },
      {
        title: 'Generate Reports',
        description: 'Create and view system reports',
        icon: 'assessment',
        route: '/admin/system-administration/reports',
        color: '#8b5cf6'
      },
      {
        title: 'Audit Logs',
        description: 'View system activity logs',
        icon: 'history',
        route: '/admin/system-administration/audit-logs',
        color: '#ef4444'
      },
      {
        title: 'System Settings',
        description: 'Configure system parameters',
        icon: 'settings',
        route: '/admin/system-administration',
        color: '#6b7280'
      }
    ];
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'consultation':
        return 'video_call';
      case 'registration':
        return 'person_add';
      case 'appointment':
        return 'schedule';
      case 'report':
        return 'assessment';
      default:
        return 'info';
    }
  }

  getActivityIconColor(type: string): string {
    switch (type) {
      case 'consultation':
        return '#3b82f6';
      case 'registration':
        return '#10b981';
      case 'appointment':
        return '#f59e0b';
      case 'report':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
