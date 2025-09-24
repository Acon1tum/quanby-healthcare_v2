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
  showResultsModal = false;
  selectedLabRequest: LabRequest | null = null;

  // Form data
  newLabRequest = {
    patientId: '',
    organizationId: '',
    notes: ''
  };

  testResults = {
    results: '',
    attachments: [] as string[]
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
      filtered = filtered.filter(request => new Date(request.requestedDate) >= fromDate);
    }

    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      filtered = filtered.filter(request => new Date(request.requestedDate) <= toDate);
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

  openResultsModal(labRequest: LabRequest): void {
    this.selectedLabRequest = labRequest;
    this.testResults.results = labRequest.testResults || '';
    this.showResultsModal = true;
  }

  closeResultsModal(): void {
    this.showResultsModal = false;
    this.selectedLabRequest = null;
    this.resetTestResults();
  }

  // Form methods
  resetNewLabRequest(): void {
    this.newLabRequest = {
      patientId: '',
      organizationId: '',
      notes: ''
    };
  }

  resetTestResults(): void {
    this.testResults = {
      results: '',
      attachments: []
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
      ...this.newLabRequest,
      doctorId: this.currentUser.id,
      status: 'PENDING' as const
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

  updateLabRequestStatus(labRequest: LabRequest, status: LabRequest['status']): void {
    this.loading = true;
    this.error = '';

    this.labRequestService.updateLabRequestStatus(labRequest.id!, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.success = `Lab request ${status.toLowerCase()} successfully.`;
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

  addTestResults(): void {
    if (!this.selectedLabRequest || !this.testResults.results.trim()) {
      this.error = 'Please enter test results.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.labRequestService.addTestResults(
      this.selectedLabRequest.id!,
      this.testResults.results,
      this.testResults.attachments
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.success = 'Test results added successfully.';
          this.loadLabRequests();
          this.closeResultsModal();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to add test results. Please try again.';
          this.loading = false;
          console.error('Error adding test results:', error);
        }
      });
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
        next: (blob) => {
          const filename = `lab-request-${labRequest.id}-${new Date().toISOString().split('T')[0]}.pdf`;
          this.labRequestService.downloadPDF(blob, filename);
          this.success = 'PDF exported successfully.';
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
}
