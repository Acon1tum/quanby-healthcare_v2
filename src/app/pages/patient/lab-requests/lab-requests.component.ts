import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LabRequestService, LabRequest, LabRequestFilter } from '../../../services/lab-request.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-patient-lab-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lab-requests.component.html',
  styleUrls: ['./lab-requests.component.scss']
})
export class PatientLabRequestsComponent implements OnInit, OnDestroy {
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
  showDetailsModal = false;
  selectedLabRequest: LabRequest | null = null;

  constructor(
    private labRequestService: LabRequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadLabRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.filter.patientId = user.id.toString();
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
  openDetailsModal(labRequest: LabRequest): void {
    this.selectedLabRequest = labRequest;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedLabRequest = null;
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

  // Check if lab request can be exported
  canExport(labRequest: LabRequest): boolean {
    return labRequest.status === 'COMPLETED' || labRequest.status === 'APPROVED';
  }

  // Get status description for patients
  getStatusDescription(status: LabRequest['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Your lab request is being reviewed by the doctor.';
      case 'APPROVED':
        return 'Your lab request has been approved. You can now visit the laboratory.';
      case 'REJECTED':
        return 'Your lab request has been rejected. Please contact your doctor for more information.';
      case 'COMPLETED':
        return 'Your lab tests have been completed. Results are available for download.';
      case 'CANCELLED':
        return 'Your lab request has been cancelled.';
      default:
        return 'Status unknown.';
    }
  }
}
