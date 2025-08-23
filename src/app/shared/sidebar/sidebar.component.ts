import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  children?: NavigationItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  userRole: string = '';
  currentUser: any = null;
  navigationItems: NavigationItem[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Get user role from auth service
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userRole = user.role;
        this.navigationItems = this.getNavigationItems(user.role);
      }
    });
  }

  getNavigationItems(role: string): NavigationItem[] {
    switch (role.toLowerCase()) {
      case 'admin':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/admin/dashboard'
          },
          {
            label: 'Schedule Management',
            icon: 'schedule',
            route: '/admin/schedule-management'
          },
          {
            label: 'System Administration',
            icon: 'settings',
            route: '/admin/system-administration',
            expanded: true,
            children: [
              {
                label: 'Audit Logs',
                icon: 'history',
                route: '/admin/system-administration/audit-logs'
              },
              {
                label: 'Doctor Management',
                icon: 'medical_services',
                route: '/admin/system-administration/doctor-management'
              },
              {
                label: 'Patient Management',
                icon: 'people',
                route: '/admin/system-administration/patient-management'
              },
              {
                label: 'Reports',
                icon: 'bar_chart',
                route: '/admin/system-administration/reports'
              }
            ]
          },
          {
            label: 'My Profile',
            icon: 'person',
            route: '/admin/my-profile'
          }
        ];

      case 'doctor':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/doctor/dashboard'
          },
          {
            label: 'Meet Patients',
            icon: 'video_call',
            route: '/doctor/meet'
          },
          {
            label: 'My Schedule',
            icon: 'schedule',
            route: '/doctor/schedule'
          },
          {
            label: 'Patient Records',
            icon: 'folder',
            route: '/doctor/patients'
          },
          {
            label: 'My Profile',
            icon: 'person',
            route: '/doctor/my-profile'
          }
        ];

      case 'patient':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/patient/dashboard'
          },
          {
            label: 'Meet Doctor',
            icon: 'video_call',
            route: '/patient/meet'
          },
          {
            label: 'My Appointments',
            icon: 'event',
            route: '/patient/appointments'
          },
          {
            label: 'Medical Records',
            icon: 'folder',
            route: '/patient/records'
          },
          {
            label: 'My Profile',
            icon: 'person',
            route: '/patient/my-profile'
          }
        ];

      default:
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/dashboard'
          }
        ];
    }
  }

  getRoleDisplayName(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'doctor':
        return 'Doctor';
      case 'patient':
        return 'Patient';
      default:
        return 'User';
    }
  }

  toggleSection(item: NavigationItem): void {
    if (item.children) {
      item.expanded = !item.expanded;
    }
  }

  logout(): void {
    // Implement logout logic
    this.authService.logout();
  }
}
