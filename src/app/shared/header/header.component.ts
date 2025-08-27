import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isMobileMenuOpen = false;
  currentUser: User | null = null;
  isLoggedIn = false;
  hasSidebar = false; // Detect if sidebar is present

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
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
} 