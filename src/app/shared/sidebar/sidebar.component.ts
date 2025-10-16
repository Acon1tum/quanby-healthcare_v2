import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { filter } from 'rxjs/operators';

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
export class SidebarComponent implements OnInit, OnDestroy {
  userRole: string = '';
  currentUser: any = null;
  navigationItems: NavigationItem[] = [];
  isDarkMode: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize dark mode from localStorage or system preference
    this.initializeDarkMode();
    
    // Listen for route changes to reapply dark mode logic
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.applyDarkMode();
      });
    
    // Get user role from auth service
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userRole = user.role;
        this.navigationItems = this.getNavigationItems(user.role);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up any subscriptions if needed
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
          
          {
            label: 'Settings',
            icon: 'settings',
            route: '/super-admin/settings'
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

  initializeDarkMode(): void {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      this.isDarkMode = savedTheme === 'true';
    } else {
      // Check system preference
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyDarkMode();
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyDarkMode();
    // Save preference to localStorage
    localStorage.setItem('darkMode', this.isDarkMode.toString());
  }

  applyDarkMode(): void {
    const body = document.body;
    const html = document.documentElement;
    const currentUrl = window.location.pathname;
    
    // Don't apply dark mode to public pages (login, register, landing, face-scan)
    const isPublicPage = currentUrl.includes('/login') || 
                        currentUrl.includes('/register') || 
                        currentUrl === '/' || 
                        currentUrl.includes('/landing') ||
                        currentUrl.includes('/face-scan');
    
    if (this.isDarkMode && !isPublicPage) {
      body.classList.add('dark-mode');
      html.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
      html.classList.remove('dark-mode');
    }
  }
}
