import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  children?: MenuItem[];
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
  @Input() userRole: 'admin' | 'doctor' | 'patient' = 'patient';
  
  menuItems: MenuItem[] = [];
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.setMenuItems();
  }
  
  setMenuItems() {
    switch (this.userRole) {
      case 'admin':
        this.menuItems = [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/admin/dashboard'
          },
          {
            label: 'Schedule Management',
            icon: 'event',
            route: '/admin/schedule-management'
          },
          {
            label: 'System Administration',
            icon: 'settings',
            route: '/admin/system-administration',
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
                icon: 'assessment',
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
        break;
        
      case 'doctor':
        this.menuItems = [
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
            label: 'My Profile',
            icon: 'person',
            route: '/doctor/my-profile'
          },
          {
            label: 'Schedule',
            icon: 'event',
            route: '/doctor/schedule'
          }
        ];
        break;
        
      case 'patient':
        this.menuItems = [
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
            label: 'My Profile',
            icon: 'person',
            route: '/patient/my-profile'
          },
          {
            label: 'Schedule',
            icon: 'event',
            route: '/patient/schedule'
          }
        ];
        break;
    }
  }
  
  toggleSubmenu(item: MenuItem) {
    if (item.children) {
      item.expanded = !item.expanded;
    }
  }
  
  logout(): void {
    this.authService.logout();
  }
}
