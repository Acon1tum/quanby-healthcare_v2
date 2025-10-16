import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientManagementService, PatientItem, PaginatedResponse, ApiResponse, CreatePatientRequest, UpdatePatientRequest } from '../../../services/patient-management.service';
import { OrganizationsService, Organization } from '../../../services/organizations.service';

@Component({
  selector: 'app-patient-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-management.component.html',
  styleUrl: './patient-management.component.scss',
  standalone: true
})
export class PatientManagementComponent implements OnInit {
  isLoading = false;
  error: string | null = null;
  patients: PatientItem[] = [];

  // pagination & filters
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;
  search = '';
  organizationId: string | undefined;

  // selection
  selectedPatient: PatientItem | null = null;

  // modal
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  formData: any = {
    email: '',
    password: '',
    organizationId: '',
    fullName: '',
    gender: '',
    dateOfBirth: '',
    contactNumber: '',
    address: '',
    weight: 0,
    height: 0,
    bloodType: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    philHealthId: '',
    philHealthStatus: '',
    philHealthCategory: '',
    philHealthExpiry: '',
    philHealthMemberSince: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactNumber: '',
    emergencyContactAddress: '',
    insuranceProviderName: '',
    insurancePolicyNumber: '',
    insuranceContact: ''
  };

  // organizations for select
  organizations: Organization[] = [];
  isLoadingOrganizations = false;
  notifications: { id: number; type: 'success' | 'error'; message: string }[] = [];

  // gender options
  genderOptions = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' }
  ];

  // blood type options
  bloodTypeOptions = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ];

  constructor(private patientManagementService: PatientManagementService, private organizationsService: OrganizationsService) {}

  ngOnInit(): void {
    this.fetch();
    this.loadOrganizations();
  }

  fetch(): void {
    this.isLoading = true;
    this.error = null;
    this.patientManagementService.getPatientsPaged({ page: this.page, limit: this.limit, search: this.search, organizationId: this.organizationId })
      .subscribe({
        next: (res: ApiResponse<PaginatedResponse<PatientItem>>) => {
          if (res.success) {
            this.patients = res.data.items;
            this.total = res.data.total;
            this.page = res.data.page;
            this.limit = res.data.limit;
            this.totalPages = res.data.totalPages;
          } else {
            this.error = res.message || 'Failed to load patients';
          }
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load patients';
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
    this.formData = {
      email: '',
      password: '',
      organizationId: '',
      fullName: '',
      gender: '',
      dateOfBirth: '',
      contactNumber: '',
      address: '',
      weight: 0,
      height: 0,
      bloodType: '',
      medicalHistory: '',
      allergies: '',
      medications: '',
      philHealthId: '',
      philHealthStatus: '',
      philHealthCategory: '',
      philHealthExpiry: '',
      philHealthMemberSince: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactNumber: '',
      emergencyContactAddress: '',
      insuranceProviderName: '',
      insurancePolicyNumber: '',
      insuranceContact: ''
    };
    this.showModal = true;
  }

  openEdit(patient: PatientItem): void {
    this.modalMode = 'edit';
    this.selectedPatient = patient;
    this.formData = {
      organizationId: patient.organizationId || '',
      fullName: patient.patientInfo?.fullName || '',
      gender: patient.patientInfo?.gender || '',
      dateOfBirth: patient.patientInfo?.dateOfBirth ? new Date(patient.patientInfo.dateOfBirth).toISOString().split('T')[0] : '',
      contactNumber: patient.patientInfo?.contactNumber || '',
      address: patient.patientInfo?.address || '',
      weight: patient.patientInfo?.weight || 0,
      height: patient.patientInfo?.height || 0,
      bloodType: patient.patientInfo?.bloodType || '',
      medicalHistory: patient.patientInfo?.medicalHistory || '',
      allergies: patient.patientInfo?.allergies || '',
      medications: patient.patientInfo?.medications || '',
      philHealthId: patient.patientInfo?.philHealthId || '',
      philHealthStatus: patient.patientInfo?.philHealthStatus || '',
      philHealthCategory: '',
      philHealthExpiry: '',
      philHealthMemberSince: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactNumber: '',
      emergencyContactAddress: '',
      insuranceProviderName: '',
      insurancePolicyNumber: '',
      insuranceContact: ''
    };
    this.showModal = true;
  }

  save(): void {
    if (this.modalMode === 'create') {
      const createData: CreatePatientRequest = {
        email: this.formData.email,
        password: this.formData.password,
        organizationId: this.formData.organizationId || undefined,
        fullName: this.formData.fullName,
        gender: this.formData.gender,
        dateOfBirth: this.formData.dateOfBirth,
        contactNumber: this.formData.contactNumber,
        address: this.formData.address,
        weight: this.formData.weight || undefined,
        height: this.formData.height || undefined,
        bloodType: this.formData.bloodType,
        medicalHistory: this.formData.medicalHistory || undefined,
        allergies: this.formData.allergies || undefined,
        medications: this.formData.medications || undefined,
        philHealthId: this.formData.philHealthId || undefined,
        philHealthStatus: this.formData.philHealthStatus || undefined,
        philHealthCategory: this.formData.philHealthCategory || undefined,
        philHealthExpiry: this.formData.philHealthExpiry || undefined,
        philHealthMemberSince: this.formData.philHealthMemberSince || undefined,
        emergencyContactName: this.formData.emergencyContactName || undefined,
        emergencyContactRelationship: this.formData.emergencyContactRelationship || undefined,
        emergencyContactNumber: this.formData.emergencyContactNumber || undefined,
        emergencyContactAddress: this.formData.emergencyContactAddress || undefined,
        insuranceProviderName: this.formData.insuranceProviderName || undefined,
        insurancePolicyNumber: this.formData.insurancePolicyNumber || undefined,
        insuranceContact: this.formData.insuranceContact || undefined
      };

      this.patientManagementService.createPatient(createData).subscribe({
        next: (res) => {
          if (res.success) {
            this.showModal = false;
            this.fetch();
            this.pushNotification('success', 'Patient created successfully');
          } else {
            this.error = res.message || 'Failed to create patient';
            this.pushNotification('error', this.error || 'Failed to create patient');
          }
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to create patient';
          this.pushNotification('error', this.error || 'Failed to create patient');
        }
      });
    } else if (this.selectedPatient) {
      const updateData: UpdatePatientRequest = {
        organizationId: this.formData.organizationId || undefined,
        fullName: this.formData.fullName,
        gender: this.formData.gender,
        dateOfBirth: this.formData.dateOfBirth,
        contactNumber: this.formData.contactNumber,
        address: this.formData.address,
        weight: this.formData.weight || undefined,
        height: this.formData.height || undefined,
        bloodType: this.formData.bloodType,
        medicalHistory: this.formData.medicalHistory || undefined,
        allergies: this.formData.allergies || undefined,
        medications: this.formData.medications || undefined,
        philHealthId: this.formData.philHealthId || undefined,
        philHealthStatus: this.formData.philHealthStatus || undefined,
        philHealthCategory: this.formData.philHealthCategory || undefined,
        philHealthExpiry: this.formData.philHealthExpiry || undefined,
        philHealthMemberSince: this.formData.philHealthMemberSince || undefined,
        emergencyContactName: this.formData.emergencyContactName || undefined,
        emergencyContactRelationship: this.formData.emergencyContactRelationship || undefined,
        emergencyContactNumber: this.formData.emergencyContactNumber || undefined,
        emergencyContactAddress: this.formData.emergencyContactAddress || undefined,
        insuranceProviderName: this.formData.insuranceProviderName || undefined,
        insurancePolicyNumber: this.formData.insurancePolicyNumber || undefined,
        insuranceContact: this.formData.insuranceContact || undefined
      };

      this.patientManagementService.updatePatient(this.selectedPatient.id, updateData).subscribe({
        next: (res) => {
          if (res.success) {
            this.showModal = false;
            this.fetch();
            this.pushNotification('success', 'Patient updated successfully');
          } else {
            this.error = res.message || 'Failed to update patient';
            this.pushNotification('error', this.error || 'Failed to update patient');
          }
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to update patient';
          this.pushNotification('error', this.error || 'Failed to update patient');
        }
      });
    }
  }

  delete(patient: PatientItem): void {
    if (!confirm('Delete this patient?')) return;
    this.patientManagementService.deletePatient(patient.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetch();
          this.pushNotification('success', 'Patient deleted successfully');
        } else {
          this.error = res.message || 'Failed to delete patient';
          this.pushNotification('error', this.error || 'Failed to delete patient');
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to delete patient';
        this.pushNotification('error', this.error || 'Failed to delete patient');
      }
    });
  }

  pushNotification(type: 'success' | 'error', message: string): void {
    const id = Date.now();
    this.notifications.push({ id, type, message });
    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 3000);
  }

  getPatientDisplayName(patient: PatientItem): string {
    return patient.patientInfo?.fullName || 'Unknown Patient';
  }

  getPatientAge(patient: PatientItem): string {
    if (!patient.patientInfo?.dateOfBirth) return '—';
    const birthDate = new Date(patient.patientInfo.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  }

  formatContactNumber(contactNumber: string | undefined): string {
    if (!contactNumber) return '—';
    // Remove all dashes from the contact number
    return contactNumber.replace(/-/g, '');
  }
}
