import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorsService, DoctorItem, PaginatedResponse, ApiResponse } from '../../../../services/doctors.service';
import { AuthService } from '../../../../auth/auth.service';

// Interfaces based on the database schema
interface DoctorCategory {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-doctor-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './doctor-management.component.html',
  styleUrl: './doctor-management.component.scss'
})
export class DoctorManagementComponent implements OnInit {
  doctors: DoctorItem[] = [];
  filteredDoctors: DoctorItem[] = [];
  categories: DoctorCategory[] = [];
  
  searchForm: FormGroup;
  doctorForm: FormGroup;
  
  isAddDialogOpen = false;
  isEditDialogOpen = false;
  selectedDoctor: DoctorItem | null = null;
  
  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;
  totalItems = 0;
  
  // Loading states
  isLoading = false;
  isSaving = false;

  constructor(private fb: FormBuilder, private router: Router, private doctorsService: DoctorsService, private authService: AuthService) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      specialization: [''],
      category: [''],
      experienceMin: [''],
      experienceMax: ['']
    });
    
    this.doctorForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      bio: ['', Validators.required],
      specialization: ['', Validators.required],
      qualifications: ['', Validators.required],
      experience: ['', [Validators.required, Validators.min(0)]],
      categories: [[]]
    });
  }

  ngOnInit(): void {
    this.loadDoctors();
    this.loadCategories();
    this.setupSearchListener();
  }

  loadDoctors(): void {
    this.isLoading = true;
    const search = (this.searchForm.get('searchTerm')?.value || '').trim();
    this.doctorsService
      .getDoctorsPaged({ page: this.currentPage + 1, limit: this.pageSize, search: search || undefined })
      .subscribe({
        next: (resp: ApiResponse<PaginatedResponse<DoctorItem>>) => {
          const data = resp.data;
          this.doctors = data.items || [];
          // Apply client-side extra filters if any (specialization/experience)
          this.filteredDoctors = [...this.doctors];
          this.totalItems = data.total || this.filteredDoctors.length;
          this.isLoading = false;
          // Re-apply local filters
          this.filterDoctors();
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  loadCategories(): void {
    // Mock data - replace with actual API call
    this.categories = [
      { id: 1, name: 'Cardiologist', description: 'Heart and cardiovascular system specialist' },
      { id: 2, name: 'Dermatologist', description: 'Skin, hair, and nail specialist' },
      { id: 3, name: 'Neurologist', description: 'Nervous system specialist' },
      { id: 4, name: 'Orthopedist', description: 'Bones and joints specialist' },
      { id: 5, name: 'Pediatrician', description: 'Children\'s health specialist' }
    ];
  }

  setupSearchListener(): void {
    this.searchForm.valueChanges.subscribe(() => {
      this.filterDoctors();
    });
  }

  filterDoctors(): void {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.toLowerCase() || '';
    const specialization = this.searchForm.get('specialization')?.value || '';
    const category = this.searchForm.get('category')?.value || '';
    const experienceMin = this.searchForm.get('experienceMin')?.value || 0;
    const experienceMax = this.searchForm.get('experienceMax')?.value || 999;

    this.filteredDoctors = this.doctors.filter(doctor => {
      const matchesSearch = !searchTerm || 
        doctor.email.toLowerCase().includes(searchTerm) ||
        `${doctor.doctorInfo?.firstName || ''} ${doctor.doctorInfo?.lastName || ''}`.toLowerCase().includes(searchTerm);
      
      const matchesSpecialization = !specialization || 
        (doctor.doctorInfo?.specialization || '').toLowerCase().includes(specialization.toLowerCase());
      
      const matchesCategory = !category || 
        false; // category filtering not supported from API response yet
      
      const experienceVal = doctor.doctorInfo?.experience ?? 0;
      const matchesExperience = experienceVal >= experienceMin && experienceVal <= experienceMax;

      return matchesSearch && matchesSpecialization && matchesCategory && matchesExperience;
    });

    // Keep totalItems from server for paginator; local filter does not change server total
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.doctorForm.reset();
  }

  openEditDialog(doctor: DoctorItem): void {
    this.selectedDoctor = doctor;
    this.isEditDialogOpen = true;
    this.populateForm(doctor);
  }

  openViewDialog(doctor: DoctorItem): void {
    // Navigate to doctor information page with doctor ID parameter
    this.router.navigate(['/admin/system-administration/doctor-management/doctor-information', doctor.id], {
      state: { doctor: doctor } // Keep state as backup for immediate loading
    });
    
    // Also store in localStorage as backup
    localStorage.setItem('selectedDoctor', JSON.stringify(doctor));
  }

  closeDialog(): void {
    this.isAddDialogOpen = false;
    this.isEditDialogOpen = false;
    this.selectedDoctor = null;
    this.doctorForm.reset();
  }

  populateForm(doctor: DoctorItem): void {
    if (doctor.doctorInfo) {
      this.doctorForm.patchValue({
        email: doctor.email,
        firstName: doctor.doctorInfo.firstName,
        middleName: doctor.doctorInfo.middleName,
        lastName: doctor.doctorInfo.lastName,
        gender: (doctor as any).doctorInfo?.gender,
        dateOfBirth: (doctor as any).doctorInfo?.dateOfBirth,
        contactNumber: doctor.doctorInfo.contactNumber,
        specialization: doctor.doctorInfo.specialization,
        qualifications: doctor.doctorInfo.qualifications,
        experience: doctor.doctorInfo.experience,
        categories: []
      });
    }
  }

  saveDoctor(): void {
    if (this.doctorForm.valid) {
      this.isSaving = true;
      const payload = {
        email: this.doctorForm.value.email,
        password: this.doctorForm.value.password,
        firstName: this.doctorForm.value.firstName,
        middleName: this.doctorForm.value.middleName,
        lastName: this.doctorForm.value.lastName,
        specialization: this.doctorForm.value.specialization,
        qualifications: this.doctorForm.value.qualifications,
        experience: Number(this.doctorForm.value.experience) || 0,
        contactNumber: this.doctorForm.value.contactNumber,
        address: this.doctorForm.value.address,
        bio: this.doctorForm.value.bio
      };

      if (this.isEditDialogOpen && this.selectedDoctor) {
        this.doctorsService.updateDoctor(this.selectedDoctor.id, payload).subscribe({
          next: () => {
            this.isSaving = false;
            this.closeDialog();
            this.loadDoctors();
          },
          error: () => {
            this.isSaving = false;
          }
        });
      } else {
        this.doctorsService.createDoctor(payload).subscribe({
          next: () => {
            this.isSaving = false;
            this.closeDialog();
            this.loadDoctors();
          },
          error: () => {
            this.isSaving = false;
          }
        });
      }
    }
  }

  deleteDoctor(doctor: DoctorItem): void {
    if (confirm(`Are you sure you want to delete Dr. ${doctor.doctorInfo?.firstName} ${doctor.doctorInfo?.lastName}?`)) {
      this.isLoading = true;
      this.doctorsService.deleteDoctor(doctor.id).subscribe({
        next: () => {
          this.loadDoctors();
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadDoctors();
  }

  getPaginatedDoctors(): DoctorItem[] {
    // Server-side pagination already applied
    return this.filteredDoctors;
  }

  getDoctorFullName(doctor: DoctorItem): string {
    if (doctor.doctorInfo) {
      return `${doctor.doctorInfo.firstName} ${doctor.doctorInfo.middleName ? doctor.doctorInfo.middleName + ' ' : ''}${doctor.doctorInfo.lastName}`;
    }
    return 'N/A';
  }

  getDoctorStatus(doctor: DoctorItem): string {
    // Mock status logic - replace with actual business logic
    return 'Active';
  }

  // Add null check for the template
  getDoctorInfo(doctor: DoctorItem): any | null {
    return doctor.doctorInfo || null;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.currentPage;
    const pages: number[] = [];
    
    // Show up to 5 page numbers around current page
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  onCategoryChange(categoryId: number, event: any): void {
    const currentCategories = this.doctorForm.get('categories')?.value || [];
    
    if (event.target.checked) {
      if (!currentCategories.includes(categoryId)) {
        currentCategories.push(categoryId);
      }
    } else {
      const index = currentCategories.indexOf(categoryId);
      if (index > -1) {
        currentCategories.splice(index, 1);
      }
    }
    
    this.doctorForm.patchValue({ categories: currentCategories });
  }

  isCategorySelected(categoryId: number): boolean {
    const currentCategories = this.doctorForm.get('categories')?.value || [];
    return currentCategories.includes(categoryId);
  }

  // Utility method for Math.min in template
  get Math() {
    return Math;
  }

  // Permission helpers for template
  canCreateDoctor(): boolean { return this.doctorsService.canCreateDoctor(); }
  canModifyDoctor(doctor: DoctorItem): boolean { return this.doctorsService.canModifyDoctor(doctor); }
}
