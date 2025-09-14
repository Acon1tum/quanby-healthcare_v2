import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';
import { OrganizationsService, Organization, OrganizationDoctor, ApiResponse } from '../../../services/organizations.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-org-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './org-management.component.html',
  styleUrl: './org-management.component.scss',
  standalone: true
})
export class OrgManagementComponent implements OnInit, OnDestroy {
  // Current date for template binding
  currentDate = new Date();
  currentUser: User | null = null;
  private userSubscription?: Subscription;
  
  // Organization data
  organizations: Organization[] = [];
  isLoadingOrganizations = false;
  organizationsError: string | null = null;
  
  // Organization statistics
  orgStats = {
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalDoctors: 0,
    totalPatients: 0
  };
  isLoadingStats = false;
  statsError: string | null = null;

  // Selected organization details
  selectedOrganization: Organization | null = null;
  organizationDoctors: OrganizationDoctor[] = [];
  isLoadingDoctors = false;
  doctorsError: string | null = null;

  // Search and filter
  searchTerm = '';
  filterStatus = 'all'; // all, active, inactive

  // Notifications
  notifications = [
    {
      id: 1,
      message: 'New organization registration: City General Hospital',
      time: '2 hours ago',
      type: 'info'
    },
    {
      id: 2,
      message: 'Organization verification completed for Metro Health Center',
      time: '4 hours ago',
      type: 'success'
    },
    {
      id: 3,
      message: 'Organization status change: Regional Medical Center',
      time: '1 day ago',
      type: 'warning'
    }
  ];

  quickActions = [
    { label: 'Add Organization', icon: 'add_business', action: 'add' },
    { label: 'View Reports', icon: 'assessment', action: 'reports' },
    { label: 'Manage Users', icon: 'people', action: 'users' },
    { label: 'System Settings', icon: 'settings', action: 'settings' }
  ];

  constructor(
    private router: Router, 
    private authService: AuthService,
    private organizationsService: OrganizationsService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user and guard access by role
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'SUPER_ADMIN') {
        this.authService.redirectBasedOnRole();
      } else {
        // Load data for the super admin
        this.loadOrganizations();
        this.loadOrganizationStatistics();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  loadOrganizations(): void {
    this.isLoadingOrganizations = true;
    this.organizationsError = null;
    
    this.organizationsService.getOrganizations().subscribe({
      next: (response: ApiResponse<Organization[]>) => {
        if (response.success) {
          this.organizations = response.data;
        } else {
          this.organizationsError = response.message || 'Failed to load organizations';
          this.organizations = [];
        }
        this.isLoadingOrganizations = false;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.isLoadingOrganizations = false;
        this.organizationsError = 'Failed to load organizations. Please try again.';
        this.organizations = [];
      }
    });
  }

  loadOrganizationStatistics(): void {
    this.isLoadingStats = true;
    this.statsError = null;
    
    this.organizationsService.getOrganizationStatistics().subscribe({
      next: (response: ApiResponse<{
        totalOrganizations: number;
        activeOrganizations: number;
        totalDoctors: number;
        totalPatients: number;
      }>) => {
        if (response.success) {
          this.orgStats = response.data;
        } else {
          this.statsError = response.message || 'Failed to load statistics';
          // Fallback to calculated stats from organizations
          this.orgStats = {
            totalOrganizations: this.organizations.length,
            activeOrganizations: this.organizations.filter(org => org.isActive).length,
            totalDoctors: this.organizations.reduce((sum, org) => sum + (org.doctorCount || 0), 0),
            totalPatients: this.organizations.reduce((sum, org) => sum + (org.patientCount || 0), 0)
          };
        }
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.isLoadingStats = false;
        this.statsError = 'Failed to load statistics.';
        // Fallback to calculated stats from organizations
        this.orgStats = {
          totalOrganizations: this.organizations.length,
          activeOrganizations: this.organizations.filter(org => org.isActive).length,
          totalDoctors: this.organizations.reduce((sum, org) => sum + (org.doctorCount || 0), 0),
          totalPatients: this.organizations.reduce((sum, org) => sum + (org.patientCount || 0), 0)
        };
      }
    });
  }

  loadOrganizationDoctors(organizationId: string): void {
    this.isLoadingDoctors = true;
    this.doctorsError = null;
    
    this.organizationsService.getDoctorsByOrganization(organizationId).subscribe({
      next: (response: ApiResponse<OrganizationDoctor[]>) => {
        if (response.success) {
          this.organizationDoctors = response.data;
        } else {
          this.doctorsError = response.message || 'Failed to load doctors';
          this.organizationDoctors = [];
        }
        this.isLoadingDoctors = false;
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
        this.isLoadingDoctors = false;
        this.doctorsError = 'Failed to load doctors. Please try again.';
        this.organizationDoctors = [];
      }
    });
  }

  selectOrganization(organization: Organization): void {
    this.selectedOrganization = organization;
    this.loadOrganizationDoctors(organization.id);
  }

  refreshOrganizations(): void {
    this.organizationsError = null;
    this.loadOrganizations();
    this.loadOrganizationStatistics();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getSuperAdminDisplayName(): string {
    if (!this.currentUser) return 'Super Admin';
    return 'Super Admin';
  }

  getFilteredOrganizations(): Organization[] {
    let filtered = this.organizations;
    
    // Filter by status
    if (this.filterStatus === 'active') {
      filtered = filtered.filter(org => org.isActive);
    } else if (this.filterStatus === 'inactive') {
      filtered = filtered.filter(org => !org.isActive);
    }
    
    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(term) ||
        org.description?.toLowerCase().includes(term) ||
        org.address?.toLowerCase().includes(term) ||
        org.email?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'success' : 'danger';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  handleQuickAction(action: string): void {
    switch (action) {
      case 'add':
        // Navigate to add organization page or open modal
        console.log('Add organization');
        break;
      case 'reports':
        // Navigate to reports page
        console.log('View reports');
        break;
      case 'users':
        // Navigate to user management
        console.log('Manage users');
        break;
      case 'settings':
        // Navigate to system settings
        console.log('System settings');
        break;
    }
  }

  editOrganization(organization: Organization): void {
    console.log('Edit organization:', organization);
    // TODO: Navigate to edit page or open edit modal
    // this.router.navigate(['/super-admin/organizations/edit', organization.id]);
  }

  toggleOrganizationStatus(organization: Organization): void {
    this.organizationsService.toggleOrganizationStatus(organization.id, !organization.isActive).subscribe({
      next: (response: ApiResponse<Organization>) => {
        if (response.success) {
          // Update the organization in the list
          const index = this.organizations.findIndex(org => org.id === organization.id);
          if (index !== -1) {
            this.organizations[index] = response.data;
          }
          // Update selected organization if it's the same
          if (this.selectedOrganization?.id === organization.id) {
            this.selectedOrganization = response.data;
          }
        } else {
          console.error('Failed to toggle organization status:', response.message);
        }
      },
      error: (error) => {
        console.error('Error toggling organization status:', error);
      }
    });
  }

  deleteOrganization(organization: Organization): void {
    if (confirm(`Are you sure you want to delete ${organization.name}?`)) {
      this.organizationsService.deleteOrganization(organization.id).subscribe({
        next: (response: ApiResponse<void>) => {
          if (response.success) {
            // Remove organization from the list
            this.organizations = this.organizations.filter(org => org.id !== organization.id);
            // Clear selected organization if it was deleted
            if (this.selectedOrganization?.id === organization.id) {
              this.selectedOrganization = null;
              this.organizationDoctors = [];
            }
            // Refresh statistics
            this.loadOrganizationStatistics();
          } else {
            console.error('Failed to delete organization:', response.message);
          }
        },
        error: (error) => {
          console.error('Error deleting organization:', error);
        }
      });
    }
  }

  trackByOrganizationId(index: number, organization: Organization): string {
    return organization.id;
  }

  trackByDoctorId(index: number, doctor: OrganizationDoctor): string {
    return doctor.id;
  }
}
