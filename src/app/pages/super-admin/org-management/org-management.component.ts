import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';
import { OrganizationsService, Organization, OrganizationDoctor, ApiResponse } from '../../../services/organizations.service';
import { Subscription } from 'rxjs';

// Types for form state
type FormDataModel = {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  isActive: boolean;
};

type StringFieldKey = Exclude<keyof FormDataModel, 'isActive'>;

type FieldErrors = Record<StringFieldKey, string>;
type FieldValid = Record<StringFieldKey, boolean>;

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

  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  modalTitle = '';
  isSubmitting = false;
  submitError: string | null = null;

  // Form data for modal
  formData: FormDataModel = {
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    isActive: true
  };

  // Form validation errors
  formErrors: FieldErrors = {
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  };

  // Field validation states
  fieldValid: FieldValid = {
    name: true,
    description: true,
    address: true,
    phone: true,
    email: true,
    website: true
  };

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

  // quick actions removed from UI
  quickActions = [] as Array<{ label: string; icon: string; action: string }>;

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
        this.openCreateModal();
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

  openCreateModal(): void {
    this.modalMode = 'create';
    this.modalTitle = 'Add New Organization';
    this.resetFormData();
    this.showModal = true;
    this.submitError = null;
  }

  editOrganization(organization: Organization): void {
    this.modalMode = 'edit';
    this.modalTitle = 'Edit Organization';
    this.formData = {
      name: organization.name,
      description: organization.description || '',
      address: organization.address || '',
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
      isActive: organization.isActive
    };
    this.showModal = true;
    this.submitError = null;
  }

  closeModal(): void {
    this.showModal = false;
    this.submitError = null;
    this.isSubmitting = false;
  }

  resetFormData(): void {
    this.formData = {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      isActive: true
    };
    this.clearFormErrors();
  }

  clearFormErrors(): void {
    this.formErrors = {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: ''
    };
    this.fieldValid = {
      name: true,
      description: true,
      address: true,
      phone: true,
      email: true,
      website: true
    };
  }

  // Validation methods
  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  validatePhone(phone: string): boolean {
    // Enforce exactly 11 digits numeric phone number
    const digitsOnly = phone.replace(/\D/g, '');
    return /^\d{11}$/.test(digitsOnly);
  }

  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  validateField(fieldName: StringFieldKey, value: string): void {
    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'Organization name is required';
        } else if (value.trim().length < 2) {
          isValid = false;
          errorMessage = 'Organization name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          isValid = false;
          errorMessage = 'Organization name must be less than 100 characters';
        } else if (this.isDuplicateName(value.trim())) {
          isValid = false;
          errorMessage = 'An organization with this name already exists';
        }
        break;

      case 'description':
        if (value.length > 500) {
          isValid = false;
          errorMessage = 'Description must be less than 500 characters';
        }
        break;

      case 'address':
        if (value && value.length > 200) {
          isValid = false;
          errorMessage = 'Address must be less than 200 characters';
        }
        break;

      case 'phone':
        if (value && !this.validatePhone(value)) {
          isValid = false;
          errorMessage = 'Phone number must be exactly 11 digits';
        }
        break;

      case 'email':
        if (value && !this.validateEmail(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address (e.g., user@example.com)';
        }
        break;

      case 'website':
        if (value && !this.validateUrl(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid URL (e.g., https://www.example.com)';
        }
        break;
    }

    this.fieldValid[fieldName] = isValid;
    this.formErrors[fieldName] = errorMessage;
  }

  isDuplicateName(name: string): boolean {
    if (this.modalMode === 'edit' && this.selectedOrganization?.name === name) {
      return false; // Same name for same organization is allowed
    }
    return this.organizations.some(org => 
      org.name.toLowerCase() === name.toLowerCase()
    );
  }

  onFieldChange(fieldName: StringFieldKey, value: string): void {
    this.formData[fieldName] = value;
    this.validateField(fieldName, value);
  }

  onInputChange(event: Event, fieldName: StringFieldKey): void {
    const target = event.target as HTMLInputElement;
    if (!target) {
      return;
    }
    
    const value = target.value || '';
    
    if (fieldName === 'phone') {
      // Keep only digits and limit to 11
      const digits = value.replace(/\D/g, '').slice(0, 11);
      this.onFieldChange(fieldName, digits);
      // Reflect sanitized value back into the input model
      this.formData.phone = digits;
      return;
    }
    this.onFieldChange(fieldName, value);
  }

  isFormValid(): boolean {
    return Object.values(this.fieldValid).every(valid => valid) && 
           this.formData.name.trim().length > 0;
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    // Validate all fields
    this.validateField('name', this.formData.name);
    this.validateField('description', this.formData.description);
    this.validateField('address', this.formData.address);
    this.validateField('phone', this.formData.phone);
    this.validateField('email', this.formData.email);
    this.validateField('website', this.formData.website);

    // Check if form is valid
    if (!this.isFormValid()) {
      this.submitError = 'Please fix the errors below before submitting';
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    if (this.modalMode === 'create') {
      this.createOrganization();
    } else {
      this.updateOrganization();
    }
  }

  createOrganization(): void {
    this.organizationsService.createOrganization(this.formData).subscribe({
      next: (response: ApiResponse<Organization>) => {
        if (response.success) {
          this.organizations.push(response.data);
          this.addSuccessNotification(`Organization "${response.data.name}" created successfully`);
          this.closeModal();
          this.loadOrganizationStatistics();
        } else {
          this.submitError = response.message || 'Failed to create organization';
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error creating organization:', error);
        this.submitError = 'Failed to create organization. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  updateOrganization(): void {
    if (!this.selectedOrganization) return;

    this.organizationsService.updateOrganization(this.selectedOrganization.id, this.formData).subscribe({
      next: (response: ApiResponse<Organization>) => {
        if (response.success) {
          // Update the organization in the list
          const index = this.organizations.findIndex(org => org.id === this.selectedOrganization!.id);
          if (index !== -1) {
            this.organizations[index] = response.data;
          }
          // Update selected organization
          this.selectedOrganization = response.data;
          this.addSuccessNotification(`Organization "${response.data.name}" updated successfully`);
          this.closeModal();
          this.loadOrganizationStatistics();
        } else {
          this.submitError = response.message || 'Failed to update organization';
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error updating organization:', error);
        this.submitError = 'Failed to update organization. Please try again.';
        this.isSubmitting = false;
      }
    });
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
          const status = response.data.isActive ? 'activated' : 'deactivated';
          this.addSuccessNotification(`Organization "${response.data.name}" ${status} successfully`);
        } else {
          this.addErrorNotification(`Failed to toggle organization status: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error toggling organization status:', error);
        this.addErrorNotification('Failed to toggle organization status. Please try again.');
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
            this.addSuccessNotification(`Organization "${organization.name}" deleted successfully`);
          } else {
            this.addErrorNotification(`Failed to delete organization: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Error deleting organization:', error);
          this.addErrorNotification('Failed to delete organization. Please try again.');
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

  // Notification management
  addSuccessNotification(message: string): void {
    const newNotification = {
      id: Date.now(),
      message: message,
      time: 'Just now',
      type: 'success'
    };
    this.notifications.unshift(newNotification);
    
    // Keep only the latest 10 notifications
    if (this.notifications.length > 10) {
      this.notifications = this.notifications.slice(0, 10);
    }
  }

  addErrorNotification(message: string): void {
    const newNotification = {
      id: Date.now(),
      message: message,
      time: 'Just now',
      type: 'error'
    };
    this.notifications.unshift(newNotification);
    
    // Keep only the latest 10 notifications
    if (this.notifications.length > 10) {
      this.notifications = this.notifications.slice(0, 10);
    }
  }

  addWarningNotification(message: string): void {
    const newNotification = {
      id: Date.now(),
      message: message,
      time: 'Just now',
      type: 'warning'
    };
    this.notifications.unshift(newNotification);
    
    // Keep only the latest 10 notifications
    if (this.notifications.length > 10) {
      this.notifications = this.notifications.slice(0, 10);
    }
  }

  removeNotification(notificationId: number): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }
}
