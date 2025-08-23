import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Interfaces based on the database schema
interface Doctor {
  id: number;
  email: string;
  role: 'DOCTOR';
  createdAt: Date;
  updatedAt: Date;
  doctorInfo?: DoctorInfo;
  doctorCategories?: DoctorCategory[];
  doctorSchedules?: DoctorSchedule[];
}

interface DoctorInfo {
  id: number;
  userId: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: Date;
  contactNumber: string;
  address: string;
  bio: string;
  specialization: string;
  qualifications: string;
  experience: number;
}

interface DoctorCategory {
  id: number;
  name: string;
  description?: string;
}

interface DoctorSchedule {
  id: number;
  doctorId: number;
  dayOfWeek: string;
  startTime: Date;
  endTime: Date;
}

@Component({
  selector: 'app-doctor-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './doctor-management.component.html',
  styleUrl: './doctor-management.component.scss'
})
export class DoctorManagementComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  categories: DoctorCategory[] = [];
  
  searchForm: FormGroup;
  doctorForm: FormGroup;
  
  isAddDialogOpen = false;
  isEditDialogOpen = false;
  selectedDoctor: Doctor | null = null;
  
  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;
  totalItems = 0;
  
  // Loading states
  isLoading = false;
  isSaving = false;

  constructor(private fb: FormBuilder, private router: Router) {
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
    // Mock data - replace with actual API call
    setTimeout(() => {
      this.doctors = this.getMockDoctors();
      this.filteredDoctors = [...this.doctors];
      this.totalItems = this.doctors.length;
      this.isLoading = false;
    }, 1000);
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
        `${doctor.doctorInfo?.firstName} ${doctor.doctorInfo?.lastName}`.toLowerCase().includes(searchTerm);
      
      const matchesSpecialization = !specialization || 
        doctor.doctorInfo?.specialization.toLowerCase().includes(specialization.toLowerCase());
      
      const matchesCategory = !category || 
        doctor.doctorCategories?.some(cat => cat.id === category);
      
      const matchesExperience = doctor.doctorInfo && 
        doctor.doctorInfo.experience >= experienceMin && 
        doctor.doctorInfo.experience <= experienceMax;

      return matchesSearch && matchesSpecialization && matchesCategory && matchesExperience;
    });

    this.totalItems = this.filteredDoctors.length;
    this.currentPage = 0;
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.doctorForm.reset();
  }

  openEditDialog(doctor: Doctor): void {
    this.selectedDoctor = doctor;
    this.isEditDialogOpen = true;
    this.populateForm(doctor);
  }

  openViewDialog(doctor: Doctor): void {
    // Navigate to doctor information page with doctor data
    this.router.navigate(['/admin/system-administration/doctor-management/doctor-information'], {
      state: { doctor: doctor }
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

  populateForm(doctor: Doctor): void {
    if (doctor.doctorInfo) {
      this.doctorForm.patchValue({
        email: doctor.email,
        firstName: doctor.doctorInfo.firstName,
        middleName: doctor.doctorInfo.middleName,
        lastName: doctor.doctorInfo.lastName,
        gender: doctor.doctorInfo.gender,
        dateOfBirth: doctor.doctorInfo.dateOfBirth,
        contactNumber: doctor.doctorInfo.contactNumber,
        address: doctor.doctorInfo.address,
        bio: doctor.doctorInfo.bio,
        specialization: doctor.doctorInfo.specialization,
        qualifications: doctor.doctorInfo.qualifications,
        experience: doctor.doctorInfo.experience,
        categories: doctor.doctorCategories?.map(cat => cat.id) || []
      });
    }
  }

  saveDoctor(): void {
    if (this.doctorForm.valid) {
      this.isSaving = true;
      
      // Mock save - replace with actual API call
      setTimeout(() => {
        if (this.isEditDialogOpen && this.selectedDoctor) {
          // Update existing doctor
          const index = this.doctors.findIndex(d => d.id === this.selectedDoctor!.id);
          if (index !== -1) {
            this.doctors[index] = { ...this.doctors[index], ...this.doctorForm.value };
          }
        } else {
          // Add new doctor
          const newDoctor: Doctor = {
            id: Date.now(),
            email: this.doctorForm.value.email,
            role: 'DOCTOR',
            createdAt: new Date(),
            updatedAt: new Date(),
            doctorInfo: {
              id: Date.now(),
              userId: Date.now(),
              ...this.doctorForm.value
            }
          };
          this.doctors.unshift(newDoctor);
        }
        
        this.filteredDoctors = [...this.doctors];
        this.totalItems = this.doctors.length;
        this.isSaving = false;
        this.closeDialog();
        console.log(
          this.isEditDialogOpen ? 'Doctor updated successfully!' : 'Doctor added successfully!'
        );
      }, 1000);
    }
  }

  deleteDoctor(doctor: Doctor): void {
    if (confirm(`Are you sure you want to delete Dr. ${doctor.doctorInfo?.firstName} ${doctor.doctorInfo?.lastName}?`)) {
      this.doctors = this.doctors.filter(d => d.id !== doctor.id);
      this.filteredDoctors = [...this.doctors];
      this.totalItems = this.doctors.length;
      console.log('Doctor deleted successfully!');
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getPaginatedDoctors(): Doctor[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredDoctors.slice(startIndex, startIndex + this.pageSize);
  }

  getDoctorFullName(doctor: Doctor): string {
    if (doctor.doctorInfo) {
      return `${doctor.doctorInfo.firstName} ${doctor.doctorInfo.middleName ? doctor.doctorInfo.middleName + ' ' : ''}${doctor.doctorInfo.lastName}`;
    }
    return 'N/A';
  }

  getDoctorStatus(doctor: Doctor): string {
    // Mock status logic - replace with actual business logic
    return 'Active';
  }

  // Add null check for the template
  getDoctorInfo(doctor: Doctor): DoctorInfo | null {
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

  // Mock data generator
  private getMockDoctors(): Doctor[] {
    return [
      {
        id: 1,
        email: 'dr.smith@qhealth.com',
        role: 'DOCTOR',
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2024-01-15'),
        doctorInfo: {
          id: 1,
          userId: 1,
          firstName: 'John',
          middleName: 'Michael',
          lastName: 'Smith',
          gender: 'MALE',
          dateOfBirth: new Date('1980-05-15'),
          contactNumber: '+1-555-0123',
          address: '123 Medical Center Dr, Healthcare City, HC 12345',
          bio: 'Experienced cardiologist with expertise in interventional cardiology and heart failure management.',
          specialization: 'Cardiology',
          qualifications: 'MD, FACC, FSCAI',
          experience: 15
        },
        doctorCategories: [
          { id: 1, name: 'Cardiologist', description: 'Heart and cardiovascular system specialist' }
        ]
      },
      {
        id: 2,
        email: 'dr.johnson@qhealth.com',
        role: 'DOCTOR',
        createdAt: new Date('2023-03-20'),
        updatedAt: new Date('2024-01-10'),
        doctorInfo: {
          id: 2,
          userId: 2,
          firstName: 'Sarah',
          lastName: 'Johnson',
          gender: 'FEMALE',
          dateOfBirth: new Date('1985-08-22'),
          contactNumber: '+1-555-0456',
          address: '456 Health Plaza, Medical District, MD 67890',
          bio: 'Dedicated dermatologist specializing in cosmetic dermatology and skin cancer prevention.',
          specialization: 'Dermatology',
          qualifications: 'MD, FAAD',
          experience: 12
        },
        doctorCategories: [
          { id: 2, name: 'Dermatologist', description: 'Skin, hair, and nail specialist' }
        ]
      }
    ];
  }
}
