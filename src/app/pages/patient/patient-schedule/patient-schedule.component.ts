import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService } from '../../../services/appointments.service';
import { AuthService } from '../../../auth/auth.service';

type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

interface DoctorAvailability {
  dayOfWeek: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface PatientAppointment {
  id: string;
  doctor: string;
  specialty: string;
  reason: string;
  scheduledAt: string; // ISO
  start: string; // ISO
  end: string; // ISO
  status: AppointmentStatus;
}

@Component({
  selector: 'app-patient-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-schedule.component.html',
  styleUrl: './patient-schedule.component.scss'
})
export class PatientScheduleComponent implements OnInit, OnDestroy {
  appointments: PatientAppointment[] = [];
  paginatedAppointments: PatientAppointment[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;

  // Calendar
  current = new Date();
  weeks: Array<Array<{ date: Date; inMonth: boolean; hasAppt: boolean; appointmentCount: number }>> = [];

  // Modals
  showRescheduleModal = false;
  rescheduleApptId: string = '';
  rescheduleDate = '';
  rescheduleTime = '';
  rescheduleReason = '';

  showCancelModal = false;
  cancelApptId: string = '';
  cancelReason = '';

  // New appointment
  showNewAppointmentModal = false;
  newApptOrganizationId: string | null = null;
  newApptDoctorId: string | null = null;
  newApptDate = '';
  newApptTime = '';
  newApptReason = '';
  newApptPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL';
  availableOrganizations: Array<{ id: string; name: string }> = [];
  availableDoctors: Array<{ id: string; name: string; specialization: string; organizationId: string | null }> = [];
  filteredDoctors: Array<{ id: string; name: string; specialization: string; organizationId: string | null }> = [];
  
  // Error modal properties
  showErrorModal = false;
  errorMessage = '';
  
  // Doctor availability for date validation
  selectedDoctorAvailability: { [date: string]: boolean } = {};

  // Computed property to check if any modal is open
  get isAnyModalOpen(): boolean {
    return this.showRescheduleModal || this.showCancelModal || this.showNewAppointmentModal || this.showErrorModal;
  }

  constructor(private appointmentsService: AppointmentsService, private auth: AuthService) {
    this.buildCalendar();
    this.loadAppointments();
  }

  ngOnInit(): void {
    // Initialize any additional setup if needed
  }

  ngOnDestroy(): void {
    // Clean up body class when component is destroyed
    document.body.classList.remove('modal-open');
  }

  private updateBodyClass(): void {
    if (this.isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  loadAppointments() {
    // Fetch current user's appointments via shared endpoint
    this.appointmentsService.getMyAppointments({ limit: 100 }).subscribe({
      next: (resp: any) => {
        if (resp?.success && Array.isArray(resp.data)) {
          this.appointments = resp.data.map((a: any) => {
            let doctorName = 'Doctor';
            let specialization = 'General';
            
            if (a?.doctor?.doctorInfo) {
              const info = a.doctor.doctorInfo;
              doctorName = `Dr. ${info.firstName || ''} ${info.lastName || ''}`.trim();
              specialization = info.specialization || 'General Practice';
            } else if (a?.doctor?.email) {
              doctorName = a.doctor.email;
            }
            
            return {
              id: String(a.id),
              doctor: doctorName,
              specialty: specialization,
              reason: a.reason || 'No reason provided',
              scheduledAt: a.createdAt,
              start: a.requestedDate,
              end: a.requestedDate,
              status: this.mapBackendStatus(a.status)
            };
          });
          this.updatePagination();
          this.buildCalendar();
        }
      },
      error: (e) => console.error('Failed to load my appointments', e)
    });
  }

  private mapBackendStatus(backendStatus: string): AppointmentStatus {
    const status = backendStatus?.toString().toLowerCase();
    switch (status) {
      case 'pending': return 'scheduled';
      case 'confirmed': return 'confirmed';
      case 'cancelled': return 'cancelled';
      case 'completed': return 'completed';
      default: return 'scheduled';
    }
  }

  cancelAppointment(appt: PatientAppointment) {
    this.showCancelModal = true;
    this.cancelApptId = appt.id;
    this.updateBodyClass();
  }

  rescheduleAppointment(appt: PatientAppointment) {
    this.showRescheduleModal = true;
    this.rescheduleApptId = appt.id;
    this.updateBodyClass();
  }

  submitReschedule() {
    if (!this.rescheduleApptId || !this.rescheduleDate || !this.rescheduleTime || !this.rescheduleReason.trim()) return;
    this.appointmentsService.requestReschedule(this.rescheduleApptId, this.rescheduleDate, this.rescheduleTime, this.rescheduleReason).subscribe({
      next: () => {
        this.showRescheduleModal = false;
        this.rescheduleApptId = '';
        this.rescheduleDate = '';
        this.rescheduleTime = '';
        this.rescheduleReason = '';
        this.loadAppointments();
        this.updateBodyClass();
      },
      error: (e) => console.error('Failed to request reschedule', e)
    });
  }

  submitCancel() {
    if (!this.cancelApptId) return;
    this.appointmentsService.cancelMyAppointment(this.cancelApptId, this.cancelReason).subscribe({
      next: () => {
        this.showCancelModal = false;
        this.cancelApptId = '';
        this.cancelReason = '';
        this.loadAppointments();
        this.updateBodyClass();
      },
      error: (e) => console.error('Failed to cancel appointment', e)
    });
  }

  closeRescheduleModal() { 
    this.showRescheduleModal = false; 
    this.rescheduleApptId = ''; 
    this.rescheduleDate = ''; 
    this.rescheduleTime = ''; 
    this.rescheduleReason = ''; 
    this.updateBodyClass();
  }
  closeCancelModal() { 
    this.showCancelModal = false; 
    this.cancelApptId = ''; 
    this.cancelReason = ''; 
    this.updateBodyClass();
  }

  openNewAppointmentModal() { 
    this.showNewAppointmentModal = true; 
    this.loadOrganizations();
    this.loadDoctors();
    this.updateBodyClass();
  }

  loadOrganizations() {
    this.appointmentsService.getOrganizations().subscribe({
      next: (resp: any) => {
        if (resp?.success && Array.isArray(resp.data)) {
          this.availableOrganizations = resp.data;
        }
      },
      error: (e) => console.error('Failed to load organizations', e)
    });
  }

  loadDoctors() {
    this.appointmentsService.getAvailableDoctors().subscribe({
      next: (resp: any) => {
        if (resp?.success && Array.isArray(resp.data)) {
          this.availableDoctors = resp.data;
        }
      },
      error: (e) => console.error('Failed to load doctors', e)
    });
  }

  onOrganizationSelected() {
    console.log('Organization selected:', this.newApptOrganizationId);
    console.log('Available doctors:', this.availableDoctors);
    if (this.newApptOrganizationId) {
      // Filter doctors by selected organization
      this.filteredDoctors = this.availableDoctors.filter(doctor => 
        doctor.organizationId === this.newApptOrganizationId
      );
      console.log('Filtered doctors:', this.filteredDoctors);
      // Reset doctor selection
      this.newApptDoctorId = null;
    } else {
      this.filteredDoctors = [];
      this.newApptDoctorId = null;
    }
  }
  closeNewAppointmentModal() {
    this.showNewAppointmentModal = false; 
    this.newApptOrganizationId = null;
    this.newApptDoctorId = null; 
    this.newApptDate = ''; 
    this.newApptTime = ''; 
    this.newApptReason = ''; 
    this.newApptPriority = 'NORMAL';
    this.filteredDoctors = [];
    this.updateBodyClass();
  }

  showError(message: string) {
    this.errorMessage = message;
    this.showErrorModal = true;
    this.updateBodyClass();
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.updateBodyClass();
  }

  onDoctorSelected() {
    console.log('Doctor selected:', this.newApptDoctorId, 'Type:', typeof this.newApptDoctorId);
    if (this.newApptDoctorId) {
      this.loadDoctorAvailability(this.newApptDoctorId);
    } else {
      this.selectedDoctorAvailability = {};
    }
  }

  loadDoctorAvailability(doctorId: string) {
    console.log('Loading availability for doctor:', doctorId);
    this.appointmentsService.getDoctorAvailability(doctorId).subscribe({
      next: (availability: DoctorAvailability[]) => {
        console.log('Received availability:', availability);
        // Reset availability
        this.selectedDoctorAvailability = {};
        
        // Map availability to dates for the next 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
          const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          // Check if doctor is available on this day
          const dayAvailability = availability.find((day: DoctorAvailability) => day.dayOfWeek === dayOfWeek);
          this.selectedDoctorAvailability[dateString] = dayAvailability?.isAvailable || false;
        }
        console.log('Mapped availability:', this.selectedDoctorAvailability);
      },
      error: (e) => {
        console.error('Failed to load doctor availability', e);
        this.selectedDoctorAvailability = {};
      }
    });
  }

  isDateAvailable(date: string): boolean {
    return this.selectedDoctorAvailability[date] || false;
  }

  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  getMaxDate(): string {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from today
    return maxDate.toISOString().split('T')[0];
  }

  onDateSelected() {
    if (this.newApptDate && !this.isDateAvailable(this.newApptDate)) {
      this.showError('The selected doctor is not available on this date. Please choose a different date.');
    }
  }

  submitNewAppointment() {
    console.log('Submit new appointment called with:', {
      organizationId: this.newApptOrganizationId,
      doctorId: this.newApptDoctorId,
      date: this.newApptDate,
      time: this.newApptTime,
      reason: this.newApptReason,
      priority: this.newApptPriority
    });
    
    if (!this.newApptOrganizationId || !this.newApptDoctorId || !this.newApptDate || !this.newApptTime || !this.newApptReason.trim()) {
      console.error('Missing required fields');
      return;
    }
    
    const currentUserId = this.auth.currentUserValue?.id;
    if (!currentUserId) {
      console.error('No authenticated user found');
      return;
    }
    
    const payload = {
      patientId: currentUserId,
      organizationId: this.newApptOrganizationId,
      doctorId: this.newApptDoctorId,
      requestedDate: this.newApptDate,
      requestedTime: this.newApptTime,
      reason: this.newApptReason,
      priority: this.newApptPriority
    } as any;
    console.log('Sending appointment request payload:', payload);
    this.appointmentsService.createAppointmentRequest(payload).subscribe({
      next: () => {
        this.closeNewAppointmentModal();
        this.loadAppointments();
        // Show success message
        this.showError('Appointment request submitted successfully!');
      },
      error: (e) => {
        console.error('Failed to create appointment request', e);
        // Show user-friendly error message
        const errorMessage = e.error?.message || 'Failed to create appointment request';
        this.showError(`Error: ${errorMessage}`);
      }
    });
  }

  private buildCalendar() {
    const year = this.current.getFullYear();
    const month = this.current.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // Monday-start grid

    const end = new Date(year, month + 1, 0);
    const last = new Date(end);
    last.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));

    const days: Date[] = [];
    for (let d = new Date(start); d <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Count appointments per day
    const apptCounts = new Map<string, number>();
    this.appointments
      .filter(a => a.status !== 'cancelled')
      .forEach(appt => {
        const dateKey = new Date(appt.start).toDateString();
        apptCounts.set(dateKey, (apptCounts.get(dateKey) || 0) + 1);
      });

    this.weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7).map(date => ({
        date,
        inMonth: date.getMonth() === month,
        hasAppt: apptCounts.has(date.toDateString()),
        appointmentCount: apptCounts.get(date.toDateString()) || 0
      }));
      this.weeks.push(week);
    }
  }

  prevMonth() { 
    this.current = new Date(this.current.getFullYear(), this.current.getMonth() - 1, 1); 
    this.buildCalendar(); 
  }
  
  nextMonth() { 
    this.current = new Date(this.current.getFullYear(), this.current.getMonth() + 1, 1); 
    this.buildCalendar(); 
  }

  getStatusColor(status: AppointmentStatus): string {
    switch (status) {
      case 'scheduled': return 'scheduled';
      case 'confirmed': return 'confirmed';
      case 'cancelled': return 'cancelled';
      case 'completed': return 'completed';
      default: return '';
    }
  }

  // Pagination methods
  updatePagination() {
    this.totalPages = Math.ceil(this.appointments.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAppointments = this.appointments.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.appointments.length);
  }
}
