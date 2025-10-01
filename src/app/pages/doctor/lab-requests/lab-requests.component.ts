import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LabRequestService, LabRequest, LabRequestFilter } from '../../../services/lab-request.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-doctor-lab-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lab-requests.component.html',
  styleUrls: ['./lab-requests.component.scss']
})
export class DoctorLabRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  labRequests: LabRequest[] = [];
  filteredLabRequests: LabRequest[] = [];
  currentUser: any = null;
  loading = false;
  error = '';
  success = '';

  // Filter properties
  filter: LabRequestFilter = {};
  statusFilter = '';
  dateFrom = '';
  dateTo = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Modal states
  showCreateModal = false;
  showDetailsModal = false;
  selectedLabRequest: LabRequest | null = null;
  
  // Dropdown state for action menus
  openDropdownId: string | null = null;
  dropdownPosition = { top: '0px', right: '0px' };

  // Form data
  newLabRequest = {
    patientId: '',
    organizationId: '',
    note: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    requestedTests: '',
    instructions: ''
  };

  // Available options
  patients: any[] = [];
  organizations: any[] = [];

  constructor(
    private labRequestService: LabRequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadLabRequests();
    this.loadPatients();
    this.loadOrganizations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.filter.doctorId = user.id.toString();
      }
    });
  }

  loadLabRequests(): void {
    this.loading = true;
    this.error = '';

    this.labRequestService.getLabRequests(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.labRequests = requests;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load lab requests. Please try again.';
          this.loading = false;
          console.error('Error loading lab requests:', error);
        }
      });
  }

  loadPatients(): void {
    // This would typically come from a patient service
    // For now, we'll use mock data or get from existing patient records
    this.patients = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
    ];
  }

  loadOrganizations(): void {
    // This would typically come from an organization service
    this.organizations = [
      { id: '1', name: 'City Medical Lab' },
      { id: '2', name: 'Regional Diagnostic Center' }
    ];
  }

  applyFilters(): void {
    let filtered = [...this.labRequests];

    if (this.statusFilter) {
      filtered = filtered.filter(request => request.status === this.statusFilter);
    }

    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      filtered = filtered.filter(request => request.createdAt && new Date(request.createdAt) >= fromDate);
    }

    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      filtered = filtered.filter(request => request.createdAt && new Date(request.createdAt) <= toDate);
    }

    this.filteredLabRequests = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }

  // Pagination methods
  get paginatedRequests(): LabRequest[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredLabRequests.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Modal methods
  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetNewLabRequest();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetNewLabRequest();
  }

  openDetailsModal(labRequest: LabRequest): void {
    this.selectedLabRequest = labRequest;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedLabRequest = null;
  }

  // Form methods
  resetNewLabRequest(): void {
    this.newLabRequest = {
      patientId: '',
      organizationId: '',
      note: '',
      priority: 'NORMAL',
      requestedTests: '',
      instructions: ''
    };
  }

  // CRUD operations
  createLabRequest(): void {
    if (!this.newLabRequest.patientId || !this.newLabRequest.organizationId) {
      this.error = 'Please select a patient and organization.';
      return;
    }

    this.loading = true;
    this.error = '';

    const labRequestData = {
      patientId: this.newLabRequest.patientId,
      doctorId: this.currentUser.id,
      organizationId: this.newLabRequest.organizationId,
      note: this.newLabRequest.note,
      status: 'PENDING' as const,
      priority: this.newLabRequest.priority,
      requestedTests: this.newLabRequest.requestedTests,
      instructions: this.newLabRequest.instructions
    };

    this.labRequestService.createLabRequest(labRequestData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdRequest) => {
          this.success = 'Lab request created successfully.';
          this.loadLabRequests();
          this.closeCreateModal();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to create lab request. Please try again.';
          this.loading = false;
          console.error('Error creating lab request:', error);
        }
      });
  }

  // Update lab request status with automatic workflow
  updateLabRequestStatus(labRequest: LabRequest, newStatus: LabRequest['status']): void {
    this.loading = true;
    this.error = '';

    this.labRequestService.updateLabRequestStatus(labRequest.id!, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.success = `Lab request status updated to ${this.labRequestService.getStatusDisplayName(newStatus)}.`;
          this.loadLabRequests();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to update lab request status. Please try again.';
          this.loading = false;
          console.error('Error updating lab request status:', error);
        }
      });
  }

  // Start processing lab request (move to IN_PROGRESS)
  startProcessing(labRequest: LabRequest): void {
    this.updateLabRequestStatus(labRequest, 'IN_PROGRESS');
  }

  // Mark lab request as completed
  markAsCompleted(labRequest: LabRequest): void {
    this.updateLabRequestStatus(labRequest, 'COMPLETED');
  }

  // Put lab request on hold
  putOnHold(labRequest: LabRequest): void {
    this.updateLabRequestStatus(labRequest, 'ON_HOLD');
  }

  // Cancel lab request
  cancelRequest(labRequest: LabRequest): void {
    if (confirm('Are you sure you want to cancel this lab request?')) {
      this.updateLabRequestStatus(labRequest, 'CANCELLED');
    }
  }

  // Reject lab request
  rejectRequest(labRequest: LabRequest): void {
    if (confirm('Are you sure you want to reject this lab request?')) {
      this.updateLabRequestStatus(labRequest, 'REJECTED');
    }
  }

  deleteLabRequest(labRequest: LabRequest): void {
    if (!confirm('Are you sure you want to delete this lab request?')) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.labRequestService.deleteLabRequest(labRequest.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Lab request deleted successfully.';
          this.loadLabRequests();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to delete lab request. Please try again.';
          this.loading = false;
          console.error('Error deleting lab request:', error);
        }
      });
  }

  // Export methods
  exportAsPDF(labRequest: LabRequest): void {
    this.loading = true;
    this.error = '';

    this.labRequestService.exportLabRequestAsPDF(labRequest.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (html) => {
          const filename = `lab-request-${labRequest.id}-${new Date().toISOString().split('T')[0]}.pdf`;
          this.labRequestService.downloadPDF(html, filename);
          this.success = 'PDF export opened in new window. Use browser print to save as PDF.';
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to export PDF. Please try again.';
          this.loading = false;
          console.error('Error exporting PDF:', error);
        }
      });
  }

  // Utility methods
  getStatusDisplayName(status: LabRequest['status']): string {
    return this.labRequestService.getStatusDisplayName(status);
  }

  getStatusColorClass(status: LabRequest['status']): string {
    return this.labRequestService.getStatusColorClass(status);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString();
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }

  // Toggle dropdown menu
  toggleDropdown(requestId: string, event: MouseEvent): void {
    if (this.openDropdownId === requestId) {
      this.openDropdownId = null;
    } else {
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      
      this.dropdownPosition = {
        top: `${rect.bottom}px`,
        right: `${window.innerWidth - rect.right}px`
      };
      
      this.openDropdownId = requestId;
    }
  }

  // Close dropdown
  closeDropdown(): void {
    this.openDropdownId = null;
  }

  // Check if dropdown is open
  isDropdownOpen(requestId: string): boolean {
    return this.openDropdownId === requestId;
  }
}
