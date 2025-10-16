import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AuthService, User } from '../../auth/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="dashboard-layout">
      <!-- Header -->
      <app-header></app-header>
      
      <div class="dashboard-content">
        <!-- Sidebar -->
        <app-sidebar></app-sidebar>
        
        <!-- Main Content Area -->
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: background-color 0.2s ease;
    }
    
    .dashboard-content {
      display: flex;
      flex: 1;
      margin-top: 0; /* Header is sticky */
    }
    
    .main-content {
      flex: 1;
      margin-left: 265px; /* Sidebar width - reduced from 280px */
      padding: 1rem; /* Reduced from 2rem */
      background: #f8f9fa;
      min-height: calc(100vh - 80px); /* Viewport height minus header */
      transition: background-color 0.2s ease;
    }
    
    @media (max-width: 768px) {
      .main-content {
        margin-left: 0;
        padding: 1rem;
      }
    }

    /* Dark Mode Styles for Dashboard Layout */
    :host-context(.dark-mode) {
      .dashboard-layout {
        background: #0f172a !important;
      }
      
      .main-content {
        background: #0f172a !important;
      }
    }

    /* Also apply dark mode when body has dark-mode class */
    :host-context(body.dark-mode) {
      .dashboard-layout {
        background: #0f172a !important;
      }
      
      .main-content {
        background: #0f172a !important;
      }
    }

    /* Also apply dark mode when html has dark-mode class */
    :host-context(html.dark-mode) {
      .dashboard-layout {
        background: #0f172a !important;
      }
      
      .main-content {
        background: #0f172a !important;
      }
    }
  `]
})
export class DashboardLayoutComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }
}
