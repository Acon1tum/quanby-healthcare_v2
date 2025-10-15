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
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/super-admin/dashboard'
          },
          {
            label: 'Notifications',
            icon: 'notifications',
            route: '/super-admin/notifications'
          },
          {
            label: 'Organization Management',
            icon: 'settings',
            route: '/super-admin/org-management'
          },
          
          {
            label: 'Doctor Management',
            icon: 'medical_services',
            route: '/super-admin/doctor-management'
          },
          
          {
            label: 'Patient Management',
            icon: 'people',
            route: '/super-admin/patient-management'
          },
          
          {
            label: 'Audit Logs',
            icon: 'history',
            route: '/super-admin/audit-logs'
          },
          
          {
            label: 'Reports',
            icon: 'bar_chart',
            route: '/super-admin/reports'
          },
          
        ];
      case 'ADMIN':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/admin/dashboard'
          },
          {
            label: 'Notifications',
            icon: 'notifications',
            route: '/admin/notifications'
          },
          {
            label: 'My Profile',
            icon: 'person',
            route: '/admin/my-profile'
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
                label: 'Doctor Management',
                icon: 'medical_services',
                route: '/admin/system-administration/doctor-management'
              },
              {
                label: 'Reports',
                icon: 'bar_chart',
                route: '/admin/system-administration/reports'
              },
              {
                label: 'Audit Logs',
                icon: 'history',
                route: '/admin/system-administration/audit-logs'
              }
            ]
          },
        ];

      case 'DOCTOR':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/doctor/dashboard'
          },
          {
            label: 'Notifications',
            icon: 'notifications',
            route: '/doctor/notifications'
          },
          {
            label: 'My Profile',
            icon: 'person',
            route: '/doctor/my-profile'
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
            route: '/doctor/patient-records'
          },
          {
            label: 'Lab Request Management',
            icon: 'science',
            route: '/doctor/lab-requests'
          },
        ];

      case 'PATIENT':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/patient/dashboard'
          },
          {
            label: 'Notifications',
            icon: 'notifications',
            route: '/patient/notifications'
          },
          {
            label: 'My Profile',
            icon: 'person',
            route: '/patient/my-profile'
          },
          {
            label: 'Meet Doctor',
            icon: 'video_call',
            route: '/patient/meet'
          },
          {
            label: 'Schedule',
            icon: 'event',
            route: '/patient/schedule'
          },
          {
            label: 'Medical Records',
            icon: 'folder',
            route: '/patient/medical-record'
          },
          {
            label: 'Self Check',
            icon: 'check_circle',
            route: '/patient/self-check'
          },
          {
            label: 'Lab Request Management',
            icon: 'science',
            route: '/patient/lab-requests'
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
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'DOCTOR':
        return 'Doctor';
      case 'PATIENT':
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
