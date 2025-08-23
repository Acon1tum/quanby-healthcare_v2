import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Added Router import

// Interfaces based on the database schema
interface Patient {
  id: number;
  email: string;
  role: 'PATIENT';
  createdAt: Date;
  updatedAt: Date;
  patientInfo?: PatientInfo;
  emergencyContact?: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
}

interface PatientInfo {
  id: number;
  userId: number;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: Date;
  contactNumber: string;
  address: string;
  weight: number;
  height: number;
  bloodType: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
}

interface EmergencyContact {
  id: number;
  patientId: number;
  contactName: string;
  relationship: string;
  contactNumber: string;
  contactAddress?: string;
}

interface InsuranceInfo {
  id: number;
  patientId: number;
  providerName: string;
  policyNumber: string;
  insuranceContact: string;
}

@Component({
  selector: 'app-patient-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './patient-management.component.html',
  styleUrl: './patient-management.component.scss'
})
export class PatientManagementComponent implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  
  searchForm: FormGroup;
  patientForm: FormGroup;
  emergencyContactForm: FormGroup;
  insuranceForm: FormGroup;
  
  isAddDialogOpen = false;
  isEditDialogOpen = false;
  selectedPatient: Patient | null = null;
  
  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;
  totalItems = 0;
  
  // Loading states
  isLoading = false;
  isSaving = false;

  // Blood type options
  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(private fb: FormBuilder, private router: Router) { // Added router to constructor
    this.searchForm = this.fb.group({
      searchTerm: [''],
      bloodType: [''],
      ageMin: [''],
      ageMax: [''],
      weightMin: [''],
      weightMax: [''],
      heightMin: [''],
      heightMax: ['']
    });
    
    this.patientForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      fullName: ['', Validators.required],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      weight: ['', [Validators.required, Validators.min(0)]],
      height: ['', [Validators.required, Validators.min(0)]],
      bloodType: ['', Validators.required],
      medicalHistory: [''],
      allergies: [''],
      medications: ['']
    });

    this.emergencyContactForm = this.fb.group({
      contactName: ['', Validators.required],
      relationship: ['', Validators.required],
      contactNumber: ['', Validators.required],
      contactAddress: ['']
    });

    this.insuranceForm = this.fb.group({
      providerName: ['', Validators.required],
      policyNumber: ['', Validators.required],
      insuranceContact: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPatients();
    this.setupSearchListener();
  }

  loadPatients(): void {
    this.isLoading = true;
    // Mock data - replace with actual API call
    setTimeout(() => {
      this.patients = this.getMockPatients();
      this.filteredPatients = [...this.patients];
      this.totalItems = this.patients.length;
      this.isLoading = false;
    }, 1000);
  }

  setupSearchListener(): void {
    this.searchForm.valueChanges.subscribe(() => {
      this.filterPatients();
    });
  }

  filterPatients(): void {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.toLowerCase() || '';
    const bloodType = this.searchForm.get('bloodType')?.value || '';
    const ageMin = this.searchForm.get('ageMin')?.value || 0;
    const ageMax = this.searchForm.get('ageMax')?.value || 999;
    const weightMin = this.searchForm.get('weightMin')?.value || 0;
    const weightMax = this.searchForm.get('weightMax')?.value || 999;
    const heightMin = this.searchForm.get('heightMin')?.value || 0;
    const heightMax = this.searchForm.get('heightMax')?.value || 999;

    this.filteredPatients = this.patients.filter(patient => {
      const matchesSearch = !searchTerm || 
        patient.email.toLowerCase().includes(searchTerm) ||
        patient.patientInfo?.fullName.toLowerCase().includes(searchTerm);
      
      const matchesBloodType = !bloodType || 
        patient.patientInfo?.bloodType === bloodType;
      
      const age = this.calculateAge(patient.patientInfo?.dateOfBirth);
      const matchesAge = age >= ageMin && age <= ageMax;
      
      const matchesWeight = patient.patientInfo && 
        patient.patientInfo.weight >= weightMin && 
        patient.patientInfo.weight <= weightMax;
      
      const matchesHeight = patient.patientInfo && 
        patient.patientInfo.height >= heightMin && 
        patient.patientInfo.height <= heightMax;

      return matchesSearch && matchesBloodType && matchesAge && matchesWeight && matchesHeight;
    });

    this.totalItems = this.filteredPatients.length;
    this.currentPage = 0;
  }

  calculateAge(dateOfBirth: Date | undefined): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.patientForm.reset();
    this.emergencyContactForm.reset();
    this.insuranceForm.reset();
  }

  openEditDialog(patient: Patient): void {
    this.selectedPatient = patient;
    this.isEditDialogOpen = true;
    this.populateForms(patient);
  }

  openViewDialog(patient: Patient): void {
    // Store patient data in localStorage as backup
    localStorage.setItem('selectedPatient', JSON.stringify(patient));
    
    // Navigate to patient information component with patient data
    this.router.navigate(['/admin/system-administration/patient-management/patient-information'], {
      state: { patient: patient }
    });
  }

  closeDialog(): void {
    this.isAddDialogOpen = false;
    this.isEditDialogOpen = false;
    this.selectedPatient = null;
    this.patientForm.reset();
    this.emergencyContactForm.reset();
    this.insuranceForm.reset();
  }

  populateForms(patient: Patient): void {
    console.log('Populating forms with patient data:', patient);
    
    if (patient.patientInfo) {
      this.patientForm.patchValue({
        email: patient.email,
        fullName: patient.patientInfo.fullName,
        gender: patient.patientInfo.gender,
        dateOfBirth: patient.patientInfo.dateOfBirth,
        contactNumber: patient.patientInfo.contactNumber,
        address: patient.patientInfo.address,
        weight: patient.patientInfo.weight,
        height: patient.patientInfo.height,
        bloodType: patient.patientInfo.bloodType,
        medicalHistory: patient.patientInfo.medicalHistory || '',
        allergies: patient.patientInfo.allergies || '',
        medications: patient.patientInfo.medications || ''
      });
      console.log('Patient form populated:', this.patientForm.value);
    }

    if (patient.emergencyContact) {
      this.emergencyContactForm.patchValue({
        contactName: patient.emergencyContact.contactName,
        relationship: patient.emergencyContact.relationship,
        contactNumber: patient.emergencyContact.contactNumber,
        contactAddress: patient.emergencyContact.contactAddress || ''
      });
      console.log('Emergency contact form populated:', this.emergencyContactForm.value);
    }

    if (patient.insuranceInfo) {
      this.insuranceForm.patchValue({
        providerName: patient.insuranceInfo.providerName,
        policyNumber: patient.insuranceInfo.policyNumber,
        insuranceContact: patient.insuranceInfo.insuranceContact
      });
      console.log('Insurance form populated:', this.insuranceForm.value);
    }
  }

  savePatient(): void {
    if (this.patientForm.valid && this.emergencyContactForm.valid && this.insuranceForm.valid) {
      this.isSaving = true;
      
      // Mock save - replace with actual API call
      setTimeout(() => {
        if (this.isEditDialogOpen && this.selectedPatient) {
          // Update existing patient
          const index = this.patients.findIndex(p => p.id === this.selectedPatient!.id);
          if (index !== -1) {
            // Update the patient with new form data
            const updatedPatient = { ...this.patients[index] };
            
            // Update patient info
            if (updatedPatient.patientInfo) {
              updatedPatient.patientInfo = {
                ...updatedPatient.patientInfo,
                fullName: this.patientForm.value.fullName,
                gender: this.patientForm.value.gender,
                dateOfBirth: this.patientForm.value.dateOfBirth,
                contactNumber: this.patientForm.value.contactNumber,
                address: this.patientForm.value.address,
                weight: this.patientForm.value.weight,
                height: this.patientForm.value.height,
                bloodType: this.patientForm.value.bloodType,
                medicalHistory: this.patientForm.value.medicalHistory,
                allergies: this.patientForm.value.allergies,
                medications: this.patientForm.value.medications
              };
            }
            
            // Update emergency contact
            if (updatedPatient.emergencyContact) {
              updatedPatient.emergencyContact = {
                ...updatedPatient.emergencyContact,
                contactName: this.emergencyContactForm.value.contactName,
                relationship: this.emergencyContactForm.value.relationship,
                contactNumber: this.emergencyContactForm.value.contactNumber,
                contactAddress: this.emergencyContactForm.value.contactAddress
              };
            }
            
            // Update insurance info
            if (updatedPatient.insuranceInfo) {
              updatedPatient.insuranceInfo = {
                ...updatedPatient.insuranceInfo,
                providerName: this.insuranceForm.value.providerName,
                policyNumber: this.insuranceForm.value.policyNumber,
                insuranceContact: this.insuranceForm.value.insuranceContact
              };
            }
            
            // Update email and timestamps
            updatedPatient.email = this.patientForm.value.email;
            updatedPatient.updatedAt = new Date();
            
            this.patients[index] = updatedPatient;
          }
        } else {
          // Add new patient
          const newPatient: Patient = {
            id: Date.now(),
            email: this.patientForm.value.email,
            role: 'PATIENT',
            createdAt: new Date(),
            updatedAt: new Date(),
            patientInfo: {
              id: Date.now(),
              userId: Date.now(),
              fullName: this.patientForm.value.fullName,
              gender: this.patientForm.value.gender,
              dateOfBirth: this.patientForm.value.dateOfBirth,
              contactNumber: this.patientForm.value.contactNumber,
              address: this.patientForm.value.address,
              weight: this.patientForm.value.weight,
              height: this.patientForm.value.height,
              bloodType: this.patientForm.value.bloodType,
              medicalHistory: this.patientForm.value.medicalHistory,
              allergies: this.patientForm.value.allergies,
              medications: this.patientForm.value.medications
            },
            emergencyContact: {
              id: Date.now(),
              patientId: Date.now(),
              contactName: this.emergencyContactForm.value.contactName,
              relationship: this.emergencyContactForm.value.relationship,
              contactNumber: this.emergencyContactForm.value.contactNumber,
              contactAddress: this.emergencyContactForm.value.contactAddress
            },
            insuranceInfo: {
              id: Date.now(),
              patientId: Date.now(),
              providerName: this.insuranceForm.value.providerName,
              policyNumber: this.insuranceForm.value.policyNumber,
              insuranceContact: this.insuranceForm.value.insuranceContact
            }
          };
          this.patients.unshift(newPatient);
        }
        
        this.filteredPatients = [...this.patients];
        this.totalItems = this.patients.length;
        this.isSaving = false;
        this.closeDialog();
        console.log(
          this.isEditDialogOpen ? 'Patient updated successfully!' : 'Patient added successfully!'
        );
      }, 1000);
    }
  }

  deletePatient(patient: Patient): void {
    if (confirm(`Are you sure you want to delete ${patient.patientInfo?.fullName}?`)) {
      this.patients = this.patients.filter(p => p.id !== patient.id);
      this.filteredPatients = [...this.patients];
      this.totalItems = this.patients.length;
      console.log('Patient deleted successfully!');
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getPaginatedPatients(): Patient[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredPatients.slice(startIndex, startIndex + this.pageSize);
  }

  getPatientFullName(patient: Patient): string {
    return patient.patientInfo?.fullName || 'N/A';
  }

  getPatientStatus(patient: Patient): string {
    // Mock status logic - replace with actual business logic
    return 'Active';
  }

  getBMI(patient: Patient): string {
    if (patient.patientInfo?.weight && patient.patientInfo?.height) {
      const heightInMeters = patient.patientInfo.height / 100;
      const bmi = patient.patientInfo.weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return 'N/A';
  }

  getBMIStatus(bmi: string): string {
    if (bmi === 'N/A') return '';
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return 'Underweight';
    if (bmiValue < 25) return 'Normal';
    if (bmiValue < 30) return 'Overweight';
    return 'Obese';
  }

  getBMIStatusClass(bmi: string): string {
    if (bmi === 'N/A') return '';
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return 'status-warning';
    if (bmiValue < 25) return 'status-success';
    if (bmiValue < 30) return 'status-warning';
    return 'status-danger';
  }

  // Pagination methods
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

  // Utility method for Math.min in template
  get Math() {
    return Math;
  }

  // Mock data generator
  private getMockPatients(): Patient[] {
    return [
      {
        id: 1,
        email: 'john.doe@email.com',
        role: 'PATIENT',
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2024-01-15'),
        patientInfo: {
          id: 1,
          userId: 1,
          fullName: 'John Doe',
          gender: 'MALE',
          dateOfBirth: new Date('1990-05-15'),
          contactNumber: '+1-555-0123',
          address: '123 Main St, Healthcare City, HC 12345',
          weight: 75,
          height: 175,
          bloodType: 'A+',
          medicalHistory: 'No significant medical history',
          allergies: 'None known',
          medications: 'None'
        },
        emergencyContact: {
          id: 1,
          patientId: 1,
          contactName: 'Jane Doe',
          relationship: 'Spouse',
          contactNumber: '+1-555-0124',
          contactAddress: '123 Main St, Healthcare City, HC 12345'
        },
        insuranceInfo: {
          id: 1,
          patientId: 1,
          providerName: 'HealthCare Plus',
          policyNumber: 'HCP-001234',
          insuranceContact: '+1-800-HEALTH'
        }
      },
      {
        id: 2,
        email: 'sarah.smith@email.com',
        role: 'PATIENT',
        createdAt: new Date('2023-03-20'),
        updatedAt: new Date('2024-01-10'),
        patientInfo: {
          id: 2,
          userId: 2,
          fullName: 'Sarah Smith',
          gender: 'FEMALE',
          dateOfBirth: new Date('1985-08-22'),
          contactNumber: '+1-555-0456',
          address: '456 Health Plaza, Medical District, MD 67890',
          weight: 60,
          height: 165,
          bloodType: 'O+',
          medicalHistory: 'Asthma (controlled)',
          allergies: 'Dust, pollen',
          medications: 'Inhaler as needed'
        },
        emergencyContact: {
          id: 2,
          patientId: 2,
          contactName: 'Mike Smith',
          relationship: 'Husband',
          contactNumber: '+1-555-0457',
          contactAddress: '456 Health Plaza, Medical District, MD 67890'
        },
        insuranceInfo: {
          id: 2,
          patientId: 2,
          providerName: 'MediCare Solutions',
          policyNumber: 'MCS-567890',
          insuranceContact: '+1-800-MEDICARE'
        }
      }
    ];
  }
}
