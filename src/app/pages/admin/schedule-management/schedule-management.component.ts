import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService, UserProfile } from '../../../api/api.service';

interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Consultation {
  id: number;
  doctorId: number;
  doctorName: string;
  specialization: string;
  patientId: number;
  patientName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  consultationLink: string;
}

interface ScheduleFilter {
  doctorId?: number;
  dayOfWeek?: string;
  date?: string;
  status?: string;
}

@Component({
  selector: 'app-schedule-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './schedule-management.component.html',
  styleUrl: './schedule-management.component.scss'
})
export class ScheduleManagementComponent implements OnInit {
  doctorSchedules: DoctorSchedule[] = [];
  consultations: Consultation[] = [];
  doctors: any[] = [];
  patients: any[] = [];
  currentUser: UserProfile | null = null;
  
  selectedView: 'schedules' | 'consultations' = 'schedules';
  isAddScheduleModalOpen = false;
  isAddConsultationModalOpen = false;
  isEditScheduleModalOpen = false;
  isEditConsultationModalOpen = false;
  
  selectedSchedule: DoctorSchedule | null = null;
  selectedConsultation: Consultation | null = null;
  
  scheduleForm: FormGroup;
  consultationForm: FormGroup;
  
  filters: ScheduleFilter = {};
  isLoading = true;
  
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];
  consultationStatuses: ('scheduled' | 'in-progress' | 'completed' | 'cancelled')[] = [
    'scheduled', 'in-progress', 'completed', 'cancelled'
  ];

  constructor(private fb: FormBuilder, private apiService: ApiService) {
    this.scheduleForm = this.fb.group({
      doctorId: ['', Validators.required],
      dayOfWeek: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required]
    });

    this.consultationForm = this.fb.group({
      doctorId: ['', Validators.required],
      patientId: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      consultationLink: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    // First load current user profile to get organization info
    this.apiService.getCurrentUserProfile().subscribe({
      next: (response) => {
        if (response.success) {
          this.currentUser = response.data;
          this.loadDoctors(); // This will also load doctor schedules
          this.loadPatients();
          this.loadConsultations();
        } else {
          console.error('Failed to load user profile:', response);
          alert('Failed to load user profile');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        alert('Error loading user profile');
        this.isLoading = false;
      }
    });
  }

  loadDoctors(): void {
    // Load doctors with their schedules based on admin's organization
    if (this.currentUser?.organizationId) {
      this.apiService.getDoctorsByOrganization(this.currentUser.organizationId).subscribe({
        next: (response) => {
          if (response.success) {
            this.doctors = response.data;
            // Load schedules for each doctor
            this.loadDoctorSchedules();
          } else {
            console.error('Failed to load doctors:', response);
            this.doctors = [];
          }
        },
        error: (error) => {
          console.error('Error loading doctors:', error);
          this.doctors = [];
        }
      });
    } else {
      // If no organization, try to get all doctors (will be filtered by backend based on admin's organization)
      this.apiService.getDoctors().subscribe({
        next: (response) => {
          if (response.success) {
            this.doctors = response.data;
            // Load schedules for each doctor
            this.loadDoctorSchedules();
          } else {
            console.error('Failed to load doctors:', response);
            this.doctors = [];
          }
        },
        error: (error) => {
          console.error('Error loading doctors:', error);
          this.doctors = [];
        }
      });
    }
  }

  loadPatients(): void {
    this.patients = [
      { id: 1, name: 'John Doe', age: 35 },
      { id: 2, name: 'Jane Smith', age: 28 },
      { id: 3, name: 'Mike Johnson', age: 42 },
      { id: 4, name: 'Lisa Brown', age: 31 },
      { id: 5, name: 'David Wilson', age: 39 }
    ];
  }

  loadDoctorSchedules(): void {
    this.doctorSchedules = [];
    
    // Load schedules for each doctor
    this.doctors.forEach(doctor => {
      this.apiService.getDoctorAvailability(doctor.id).subscribe({
        next: (schedules) => {
          // Convert the availability data to our DoctorSchedule format
          schedules.forEach((schedule: any) => {
            const doctorSchedule: DoctorSchedule = {
              id: `${doctor.id}-${schedule.dayOfWeek}`,
              doctorId: doctor.id,
              doctorName: doctor.name,
              specialization: doctor.specialization,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              isAvailable: schedule.isAvailable
            };
            this.doctorSchedules.push(doctorSchedule);
          });
        },
        error: (error) => {
          console.error(`Error loading schedule for doctor ${doctor.name}:`, error);
        }
      });
    });
  }

  loadConsultations(): void {
    this.consultations = [
      {
        id: 1,
        doctorId: 1,
        doctorName: 'Dr. John Smith',
        specialization: 'Cardiologist',
        patientId: 1,
        patientName: 'John Doe',
        startTime: '2024-01-15T10:00:00',
        endTime: '2024-01-15T10:30:00',
        status: 'scheduled',
        consultationLink: 'https://meet.google.com/abc-defg-hij'
      },
      {
        id: 2,
        doctorId: 2,
        doctorName: 'Dr. Sarah Johnson',
        specialization: 'Dermatologist',
        patientId: 2,
        patientName: 'Jane Smith',
        startTime: '2024-01-15T14:00:00',
        endTime: '2024-01-15T14:30:00',
        status: 'in-progress',
        consultationLink: 'https://meet.google.com/xyz-uvwx-yz'
      },
      {
        id: 3,
        doctorId: 3,
        doctorName: 'Dr. Michael Brown',
        specialization: 'Neurologist',
        patientId: 3,
        patientName: 'Mike Johnson',
        startTime: '2024-01-15T16:00:00',
        endTime: '2024-01-15T16:30:00',
        status: 'completed',
        consultationLink: 'https://meet.google.com/def-ghij-klm'
      }
    ];
  }

  // Computed properties for template
  get availableSchedulesCount(): number {
    return this.doctorSchedules.filter(s => s.isAvailable).length;
  }

  get scheduledConsultationsCount(): number {
    return this.consultations.filter(c => c.status === 'scheduled').length;
  }

  // View Management
  setView(view: 'schedules' | 'consultations'): void {
    this.selectedView = view;
  }

  // Schedule Management
  openAddScheduleModal(): void {
    this.isAddScheduleModalOpen = true;
    this.scheduleForm.reset();
  }

  closeAddScheduleModal(): void {
    this.isAddScheduleModalOpen = false;
    this.scheduleForm.reset();
  }

  openEditScheduleModal(schedule: DoctorSchedule): void {
    this.selectedSchedule = schedule;
    this.scheduleForm.patchValue({
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    });
    this.isEditScheduleModalOpen = true;
  }

  closeEditScheduleModal(): void {
    this.isEditScheduleModalOpen = false;
    this.selectedSchedule = null;
    this.scheduleForm.reset();
  }

  saveSchedule(): void {
    if (this.scheduleForm.valid) {
      const formValue = this.scheduleForm.value;
      
      if (this.isEditScheduleModalOpen && this.selectedSchedule) {
        // Update existing schedule
        const index = this.doctorSchedules.findIndex(s => s.id === this.selectedSchedule!.id);
        if (index !== -1) {
          this.doctorSchedules[index] = {
            ...this.selectedSchedule,
            ...formValue,
            doctorName: this.doctors.find(d => d.id === formValue.doctorId)?.name || '',
            specialization: this.doctors.find(d => d.id === formValue.doctorId)?.specialization || ''
          };
        }
        this.closeEditScheduleModal();
      } else {
        // Add new schedule
        const newSchedule: DoctorSchedule = {
          id: `${formValue.doctorId}-${formValue.dayOfWeek}`,
          doctorId: formValue.doctorId,
          doctorName: this.doctors.find(d => d.id === formValue.doctorId)?.name || '',
          specialization: this.doctors.find(d => d.id === formValue.doctorId)?.specialization || '',
          dayOfWeek: formValue.dayOfWeek,
          startTime: formValue.startTime,
          endTime: formValue.endTime,
          isAvailable: true
        };
        this.doctorSchedules.push(newSchedule);
        this.closeAddScheduleModal();
      }
    }
  }

  deleteSchedule(scheduleId: string): void {
    if (confirm('Are you sure you want to delete this schedule?')) {
      this.doctorSchedules = this.doctorSchedules.filter(s => s.id !== scheduleId);
    }
  }

  toggleScheduleAvailability(scheduleId: string): void {
    const schedule = this.doctorSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      schedule.isAvailable = !schedule.isAvailable;
    }
  }

  // Consultation Management
  openAddConsultationModal(): void {
    this.isAddConsultationModalOpen = true;
    this.consultationForm.reset();
  }

  closeAddConsultationModal(): void {
    this.isAddConsultationModalOpen = false;
    this.consultationForm.reset();
  }

  openEditConsultationModal(consultation: Consultation): void {
    this.selectedConsultation = consultation;
    this.consultationForm.patchValue({
      doctorId: consultation.doctorId,
      patientId: consultation.patientId,
      startTime: consultation.startTime,
      endTime: consultation.endTime,
      consultationLink: consultation.consultationLink
    });
    this.isEditConsultationModalOpen = true;
  }

  closeEditConsultationModal(): void {
    this.isEditConsultationModalOpen = false;
    this.selectedConsultation = null;
    this.consultationForm.reset();
  }

  saveConsultation(): void {
    if (this.consultationForm.valid) {
      const formValue = this.consultationForm.value;
      
      if (this.isEditConsultationModalOpen && this.selectedConsultation) {
        // Update existing consultation
        const index = this.consultations.findIndex(c => c.id === this.selectedConsultation!.id);
        if (index !== -1) {
          this.consultations[index] = {
            ...this.selectedConsultation,
            ...formValue,
            doctorName: this.doctors.find(d => d.id === formValue.doctorId)?.name || '',
            specialization: this.doctors.find(d => d.id === formValue.doctorId)?.specialization || '',
            patientName: this.patients.find(p => p.id === formValue.patientId)?.name || ''
          };
        }
        this.closeEditConsultationModal();
      } else {
        // Add new consultation
        const newConsultation: Consultation = {
          id: Date.now(),
          doctorId: formValue.doctorId,
          doctorName: this.doctors.find(d => d.id === formValue.doctorId)?.name || '',
          specialization: this.doctors.find(d => d.id === formValue.doctorId)?.specialization || '',
          patientId: formValue.patientId,
          patientName: this.patients.find(p => p.id === formValue.patientId)?.name || '',
          startTime: formValue.startTime,
          endTime: formValue.endTime,
          status: 'scheduled',
          consultationLink: formValue.consultationLink
        };
        this.consultations.push(newConsultation);
        this.closeAddConsultationModal();
      }
    }
  }

  deleteConsultation(consultationId: number): void {
    if (confirm('Are you sure you want to delete this consultation?')) {
      this.consultations = this.consultations.filter(c => c.id !== consultationId);
    }
  }

  updateConsultationStatus(consultationId: number, status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'): void {
    const consultation = this.consultations.find(c => c.id === consultationId);
    if (consultation) {
      consultation.status = status;
    }
  }

  // Filtering
  applyFilters(): void {
    // Apply filters logic here
    console.log('Applying filters:', this.filters);
  }

  clearFilters(): void {
    this.filters = {};
  }

  // Utility methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'status-scheduled';
      case 'in-progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'schedule';
      case 'in-progress':
        return 'play_circle';
      case 'completed':
        return 'check_circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  }

  formatDateTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDoctorById(doctorId: string): any {
    return this.doctors.find(d => d.id === doctorId);
  }

  getPatientById(patientId: number): any {
    return this.patients.find(p => p.id === patientId);
  }

  // Helper method to calculate duration
  calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  }
}
