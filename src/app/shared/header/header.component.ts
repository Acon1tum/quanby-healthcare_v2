import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../auth/auth.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  children?: NavigationItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  @ViewChild('profileDropdown') profileDropdown!: ElementRef;
  @ViewChild('mobileMenu') mobileMenu!: ElementRef;
  @ViewChild('sidebarDropdown') sidebarDropdown!: ElementRef;

  isMobileMenuOpen = false;
  isProfileDropdownOpen = false;
  isSidebarOpen = false;
  currentUser: User | null = null;
  isLoggedIn = false;
  hasSidebar = false; // Detect if sidebar is present
  navigationItems: NavigationItem[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
      if (user) {
        this.navigationItems = this.getNavigationItems(user.role);
      }
    });
    
    // Check if we're on a page with sidebar (admin pages)
    this.checkForSidebar();
  }

  private checkForSidebar(): void {
    // Check if current route contains admin paths that typically have sidebars
    const currentRoute = this.router.url;
    this.hasSidebar = currentRoute.includes('/admin') || 
                     currentRoute.includes('/doctor') || 
                     currentRoute.includes('/patient');
  }

  navigateToFaceScan(): void {
    this.router.navigate(['/face-scan']);
    this.closeMobileMenu();
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
    this.closeMobileMenu();
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
    this.closeMobileMenu();
  }

  navigateToProfile(): void {
    if (this.currentUser) {
      switch (this.currentUser.role) {
        case 'ADMIN':
          this.router.navigate(['/admin/my-profile']);
          break;
        case 'DOCTOR':
          this.router.navigate(['/doctor/my-profile']);
          break;
        case 'PATIENT':
          this.router.navigate(['/patient/my-profile']);
          break;
      }
    }
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.updateBodyScroll();
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.updateBodyScroll();
  }

  private updateBodyScroll(): void {
    if (typeof document !== 'undefined') {
      if (this.isMobileMenuOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
    }
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    
    if (this.currentUser.role === 'DOCTOR' && this.currentUser.doctorInfo) {
      return `${this.currentUser.doctorInfo.firstName} ${this.currentUser.doctorInfo.lastName}`;
    } else if (this.currentUser.role === 'PATIENT' && this.currentUser.patientInfo) {
      return this.currentUser.patientInfo.fullName;
    } else if (this.currentUser.role === 'ADMIN') {
      return 'Administrator';
    }
    
    return this.currentUser.email;
  }

  // Mobile dropdown methods
  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    if (this.isProfileDropdownOpen) {
      this.isSidebarOpen = false;
    }
  }

  closeProfileDropdown(): void {
    this.isProfileDropdownOpen = false;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    if (this.isSidebarOpen) {
      this.isProfileDropdownOpen = false;
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleSection(item: NavigationItem): void {
    if (item.children) {
      item.expanded = !item.expanded;
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeProfileDropdown();
    this.closeSidebar();
  }

  // Click outside listener to close dropdowns
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Close profile dropdown if clicking outside
    if (this.isProfileDropdownOpen && this.profileDropdown) {
      const profileDropdownElement = this.profileDropdown.nativeElement;
      const profileButton = target.closest('.mobile-profile-button');
      
      if (!profileDropdownElement.contains(target) && !profileButton) {
        this.closeProfileDropdown();
      }
    }
    
    // Close mobile menu if clicking outside
    if (this.isMobileMenuOpen && this.mobileMenu) {
      const mobileMenuElement = this.mobileMenu.nativeElement;
      const mobileMenuButton = target.closest('.mobile-menu-button');
      
      if (!mobileMenuElement.contains(target) && !mobileMenuButton) {
        this.closeMobileMenu();
      }
    }
    
    // Close sidebar dropdown if clicking outside
    if (this.isSidebarOpen && this.sidebarDropdown) {
      const sidebarDropdownElement = this.sidebarDropdown.nativeElement;
      const sidebarButton = target.closest('.mobile-sidebar-button');
      
      if (!sidebarDropdownElement.contains(target) && !sidebarButton) {
        this.closeSidebar();
      }
    }
  }

  // Navigation items based on user role
  getNavigationItems(role: string): NavigationItem[] {
    switch (role) {
      case 'ADMIN':
        return [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/admin/dashboard'
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
            expanded: false,
            children: [
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
            route: '/doctor/patients'
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
} 