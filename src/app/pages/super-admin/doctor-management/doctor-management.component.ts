import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorsService, DoctorItem, PaginatedResponse, ApiResponse } from '../../../services/doctors.service';
import { OrganizationsService, Organization } from '../../../services/organizations.service';

@Component({
  selector: 'app-doctor-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-management.component.html',
  styleUrl: './doctor-management.component.scss',
  standalone: true
})
export class DoctorManagementComponent implements OnInit {
  isLoading = false;
  error: string | null = null;
  doctors: DoctorItem[] = [];

  // pagination & filters
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;
  search = '';
  organizationId: string | undefined;

  // selection
  selectedDoctor: DoctorItem | null = null;

  // modal
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  formData: any = {
    email: '',
    password: '',
    organizationId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    specialization: '',
    qualifications: '',
    experience: 0,
    contactNumber: '',
    address: '',
    bio: ''
  };

  // organizations for select
  organizations: Organization[] = [];
  isLoadingOrganizations = false;
  notifications: { id: number; type: 'success' | 'error'; message: string }[] = [];

  constructor(private doctorsService: DoctorsService, private organizationsService: OrganizationsService) {}

  ngOnInit(): void {
    this.fetch();
    this.loadOrganizations();
  }

  fetch(): void {
    this.isLoading = true;
    this.error = null;
    this.doctorsService.getDoctorsPaged({ page: this.page, limit: this.limit, search: this.search, organizationId: this.organizationId })
      .subscribe({
        next: (res: ApiResponse<PaginatedResponse<DoctorItem>>) => {
          if (res.success) {
            this.doctors = res.data.items;
            this.total = res.data.total;
            this.page = res.data.page;
            this.limit = res.data.limit;
            this.totalPages = res.data.totalPages;
          } else {
            this.error = res.message || 'Failed to load doctors';
          }
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load doctors';
          this.isLoading = false;
        }
      });
  }

  loadOrganizations(): void {
    this.isLoadingOrganizations = true;
    this.organizationsService.getOrganizations().subscribe({
      next: (res) => {
        if (res.success) {
          this.organizations = res.data;
        }
        this.isLoadingOrganizations = false;
      },
      error: () => { this.isLoadingOrganizations = false; }
    });
  }

  searchChanged(): void {
    this.page = 1;
    this.fetch();
  }

  changePage(delta: number): void {
    const next = this.page + delta;
    if (next < 1 || next > this.totalPages) return;
    this.page = next;
    this.fetch();
  }

  openCreate(): void {
    this.modalMode = 'create';
    this.formData = { email: '', password: '', organizationId: '', firstName: '', middleName: '', lastName: '', specialization: '', qualifications: '', experience: 0, contactNumber: '', address: '', bio: '' };
    this.showModal = true;
  }

  openEdit(doctor: DoctorItem): void {
    this.modalMode = 'edit';
    this.selectedDoctor = doctor;
    this.formData = {
      organizationId: doctor.organizationId || '',
      firstName: doctor.doctorInfo?.firstName || '',
      middleName: doctor.doctorInfo?.middleName || '',
      lastName: doctor.doctorInfo?.lastName || '',
      specialization: doctor.doctorInfo?.specialization || '',
      qualifications: doctor.doctorInfo?.qualifications || '',
      experience: doctor.doctorInfo?.experience || 0,
      contactNumber: doctor.doctorInfo?.contactNumber || '',
      address: '',
      bio: ''
    };
    this.showModal = true;
  }

  save(): void {
    if (this.modalMode === 'create') {
      this.doctorsService.createDoctor(this.formData).subscribe({
        next: (res) => { if (res.success) { this.showModal = false; this.fetch(); this.pushNotification('success', 'Doctor created successfully'); } else { this.error = res.message || 'Failed to create doctor'; this.pushNotification('error', this.error || 'Failed to create doctor'); } },
        error: (err) => { this.error = err?.error?.message || 'Failed to create doctor'; this.pushNotification('error', this.error || 'Failed to create doctor'); }
      });
    } else if (this.selectedDoctor) {
      this.doctorsService.updateDoctor(this.selectedDoctor.id, this.formData).subscribe({
        next: (res) => { if (res.success) { this.showModal = false; this.fetch(); this.pushNotification('success', 'Doctor updated successfully'); } else { this.error = res.message || 'Failed to update doctor'; this.pushNotification('error', this.error || 'Failed to update doctor'); } },
        error: (err) => { this.error = err?.error?.message || 'Failed to update doctor'; this.pushNotification('error', this.error || 'Failed to update doctor'); }
      });
    }
  }

  delete(doctor: DoctorItem): void {
    if (!confirm('Delete this doctor?')) return;
    this.doctorsService.deleteDoctor(doctor.id).subscribe({
      next: (res) => { if (res.success) { this.fetch(); this.pushNotification('success', 'Doctor deleted successfully'); } else { this.error = res.message || 'Failed to delete doctor'; this.pushNotification('error', this.error || 'Failed to delete doctor'); } },
      error: (err) => { this.error = err?.error?.message || 'Failed to delete doctor'; this.pushNotification('error', this.error || 'Failed to delete doctor'); }
    });
  }

  pushNotification(type: 'success' | 'error', message: string): void {
    const id = Date.now();
    this.notifications.push({ id, type, message });
    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 3000);
  }
}
