import { Component, OnInit, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../auth/auth.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

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
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('profileDropdown') profileDropdown!: ElementRef;
  @ViewChild('mobileMenu') mobileMenu!: ElementRef;
  @ViewChild('sidebarDropdown') sidebarDropdown!: ElementRef;
  @ViewChild('notificationDropdown') notificationDropdown!: ElementRef;

  isMobileMenuOpen = false;
  isProfileDropdownOpen = false;
  isSidebarOpen = false;
  isNotificationDropdownOpen = false;
  currentUser: User | null = null;
  isLoggedIn = false;
  hasSidebar = false; // Detect if sidebar is present
  navigationItems: NavigationItem[] = [];
  notificationCount = 0;
  notifications: Notification[] = [];
  isLoadingNotifications = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user
    const userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
      if (user) {
        this.navigationItems = this.getNavigationItems(user.role);
        // Load notifications when user logs in
        this.loadNotifications();
      }
    });
    this.subscriptions.push(userSub);
    
    // Subscribe to notifications
    const notificationsSub = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
    this.subscriptions.push(notificationsSub);

    // Subscribe to unread count
    const unreadCountSub = this.notificationService.unreadCount$.subscribe(
      count => {
        this.notificationCount = count;
      }
    );
    this.subscriptions.push(unreadCountSub);
    
    // Check if we're on a page with sidebar (admin pages)
    this.checkForSidebar();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load notifications from backend
   */
  loadNotifications(): void {
    if (!this.isLoggedIn) return;
    
    this.isLoadingNotifications = true;
    this.notificationService.getNotifications({ limit: 10, isArchived: false })
      .subscribe({
        next: () => {
          this.isLoadingNotifications = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.isLoadingNotifications = false;
        }
      });
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        error: (error) => console.error('Error marking notification as read:', error)
      });
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.closeNotificationDropdown();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: (response) => {
        console.log(response.message);
      },
      error: (error) => console.error('Error marking all notifications as read:', error)
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: (response) => {
        console.log(response.message);
      },
      error: (error) => console.error('Error deleting notification:', error)
    });
  }

  /**
   * Get time ago for notification
   */
  getTimeAgo(date: string): string {
    return this.notificationService.getTimeAgo(date);
  }

  /**
   * Get priority color for notification
   */
  getPriorityColor(notification: Notification): string {
    return this.notificationService.getPriorityColor(notification.priority);
  }

  private checkForSidebar(): void {
    // Check if current route contains admin paths that typically have sidebars
    const currentRoute = this.router.url;
    this.hasSidebar = currentRoute.includes('/admin') || 
                     currentRoute.includes('/doctor') || 
                     currentRoute.includes('/patient') ||
                     currentRoute.includes('/super-admin');
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
        case 'SUPER_ADMIN':
          this.router.navigate(['/super-admin/my-profile']);
          break;
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
      const firstName = this.currentUser.doctorInfo.firstName || '';
      const lastName = this.currentUser.doctorInfo.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || this.currentUser.email || 'Doctor';
    } else if (this.currentUser.role === 'PATIENT' && this.currentUser.patientInfo) {
      return this.currentUser.patientInfo.fullName || this.currentUser.email || 'Patient';
    } else if (this.currentUser.role === 'ADMIN') {
      return 'Administrator';
    } else if (this.currentUser.role === 'SUPER_ADMIN') {
      return 'Super Administrator';
    }
    
    return this.currentUser.email || 'User';
  }

  // Mobile dropdown methods
  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    if (this.isProfileDropdownOpen) {
      this.isSidebarOpen = false;
      this.isNotificationDropdownOpen = false;
    }
  }

  closeProfileDropdown(): void {
    this.isProfileDropdownOpen = false;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    if (this.isSidebarOpen) {
      this.isProfileDropdownOpen = false;
      this.isNotificationDropdownOpen = false;
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  // Notification dropdown methods
  toggleNotificationDropdown(): void {
    this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
    if (this.isNotificationDropdownOpen) {
      this.isProfileDropdownOpen = false;
      this.isSidebarOpen = false;
      // Refresh notifications when dropdown is opened
      this.loadNotifications();
    }
  }

  closeNotificationDropdown(): void {
    this.isNotificationDropdownOpen = false;
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
    
    // Close notification dropdown if clicking outside
    if (this.isNotificationDropdownOpen && this.notificationDropdown) {
      const notificationDropdownElement = this.notificationDropdown.nativeElement;
      const notificationButton = target.closest('.notification-button');
      
      if (!notificationDropdownElement.contains(target) && !notificationButton) {
        this.closeNotificationDropdown();
      }
    }
  }

  // Navigation items based on user role
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
            icon: 'business',
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
          }
        ];
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
            route: '/doctor/patient-records'
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