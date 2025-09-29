import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  // Appointment details modal
  showAppointmentModal = false;
  selectedDate: Date | null = null;
  selectedDateAppointments: PatientAppointment[] = [];

  // Meeting join state
  isJoiningMeeting = false;
  joiningMeetingId: string | null = null;

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

  constructor(private appointmentsService: AppointmentsService, private auth: AuthService, private router: Router) {
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
            
            // Create appointment time by combining requestedDate and requestedTime
            const appointmentDateTime = this.createAppointmentDateTime(a.requestedDate, a.requestedTime);
            
            return {
              id: String(a.id),
              doctor: doctorName,
              specialty: specialization,
              reason: a.reason || 'No reason provided',
              scheduledAt: a.createdAt,
              start: appointmentDateTime,
              end: appointmentDateTime,
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

  // Get appointments for a specific date
  getAppointmentsForDate(date: Date): PatientAppointment[] {
    const dateStr = date.toDateString();
    return this.appointments.filter(a => {
      const appointmentDate = new Date(a.start);
      return appointmentDate.toDateString() === dateStr && a.status !== 'cancelled';
    });
  }

  // Handle calendar day click
  onCalendarDayClick(date: Date, hasAppt: boolean) {
      if (hasAppt) {
      this.selectedDate = date;
      this.selectedDateAppointments = this.getAppointmentsForDate(date);
      this.showAppointmentModal = true;
      document.body.classList.add('modal-open');
    }
  }

  // Close appointment details modal
  closeAppointmentModal() {
    this.showAppointmentModal = false;
    this.selectedDate = null;
    this.selectedDateAppointments = [];
    document.body.classList.remove('modal-open');
  }

  // Join meeting for appointment
  joinMeeting(appointment: PatientAppointment) {
    // Set loading state
    this.isJoiningMeeting = true;
    this.joiningMeetingId = appointment.id;
    
    // Generate consistent room ID for both doctor and patient
    const roomId = this.generateConsistentRoomId(appointment);
    
    // Navigate to meeting with auto-join
    this.router.navigate(['/patient/meet'], { queryParams: { roomId: roomId } });
    
    // Reset loading state after navigation
    setTimeout(() => {
      this.isJoiningMeeting = false;
      this.joiningMeetingId = null;
    }, 2000);
  }

  // Generate consistent room ID based on appointment details
  private generateConsistentRoomId(appointment: PatientAppointment): string {
    // Create a consistent room ID based on appointment date, time, and unique identifiers
    const appointmentDate = new Date(appointment.start);
    const dateStr = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = appointmentDate.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
    
    // Get unique identifiers
    const appointmentId = appointment.id || 'unknown';
    const patientId = this.auth.currentUserValue?.id || 'unknown';
    
    // Create a comprehensive room ID that ensures uniqueness for different appointments
    // but consistency for the same appointment between doctor and patient
    const roomComponents = `${dateStr}-${timeStr}-${appointmentId}-${patientId}`;
    
    // Convert to a URL-safe room ID without truncation to avoid collisions
    const base64RoomId = btoa(roomComponents).replace(/[+/=]/g, '');
    
    // Use a hash function to create a shorter but unique room ID
    let hash = 0;
    for (let i = 0; i < base64RoomId.length; i++) {
      const char = base64RoomId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive hex string and take first 12 characters
    const roomId = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    
    // Debug logging
    console.log('🏠 Patient Room ID Generation:', {
      appointmentId: appointmentId,
      patientId: patientId,
      dateStr: dateStr,
      timeStr: timeStr,
      roomComponents: roomComponents,
      base64RoomId: base64RoomId,
      finalRoomId: roomId
    });
    
    return roomId;
  }

  // Test method to verify room ID consistency (for debugging)
  testRoomIdConsistency(appointment: PatientAppointment): void {
    const roomId = this.generateConsistentRoomId(appointment);
    console.log('Patient Room ID:', roomId);
    console.log('Appointment Details:', {
      id: appointment.id,
      start: appointment.start,
      doctor: appointment.doctor
    });
  }

  // Test method to verify different appointments get different room IDs
  testMultipleRoomIds(): void {
    console.log('🧪 Testing Multiple Room ID Generation (Patient):');
    
    // Test with different appointments
    const testAppointments = [
      { id: 'apt_001', start: '2024-01-15T10:00:00Z' },
      { id: 'apt_002', start: '2024-01-15T10:00:00Z' }, // Same time, different ID
      { id: 'apt_001', start: '2024-01-15T11:00:00Z' }, // Same ID, different time
      { id: 'apt_003', start: '2024-01-16T10:00:00Z' }  // Different date
    ];

    const roomIds = new Set();
    testAppointments.forEach((apt, index) => {
      const roomId = this.generateConsistentRoomId(apt as PatientAppointment);
      roomIds.add(roomId);
      console.log(`Patient Appointment ${index + 1}:`, {
        id: apt.id,
        start: apt.start,
        roomId: roomId,
        roomComponents: `${apt.start.split('T')[0]}-${apt.start.split('T')[1].replace(/:/g, '').split('.')[0]}-${apt.id}-${this.auth.currentUserValue?.id || 'unknown'}`
      });
    });
    
    console.log(`✅ Unique Room IDs Generated: ${roomIds.size}/${testAppointments.length}`);
    if (roomIds.size === testAppointments.length) {
      console.log('🎉 SUCCESS: All appointments have unique room IDs!');
    } else {
      console.log('❌ ERROR: Some appointments have duplicate room IDs!');
    }
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

  // Check if it's currently time for the meeting (same day and time)
  isMeetingTimeNow(appointment: PatientAppointment): boolean {
    const now = new Date();
    const appointmentTime = new Date(appointment.start);
    
    // Check if it's the same day
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    
    if (!isSameDay) {
      return false;
    }
    
    // Check if current time matches appointment time (same hour and minute)
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const appointmentHour = appointmentTime.getHours();
    const appointmentMinute = appointmentTime.getMinutes();
    
    return nowHour === appointmentHour && nowMinute === appointmentMinute;
  }

  // Check if it's the exact meeting time (current time matches appointment time)
  isExactMeetingTime(appointment: PatientAppointment): boolean {
    const now = new Date();
    
    // Handle timezone issues by normalizing the appointment time
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    
    // Enhanced debug logging
    console.log('🕐 Patient Exact Meeting Time Check:', {
      appointmentId: appointment.id,
      now: now.toISOString(),
      appointmentTime: appointmentTime.toISOString(),
      nowDateString: now.toDateString(),
      appointmentDateString: appointmentTime.toDateString(),
      appointmentStart: appointment.start,
      nowLocal: now.toString(),
      appointmentLocal: appointmentTime.toString(),
      nowUTC: now.toUTCString(),
      appointmentUTC: appointmentTime.toUTCString(),
      timezoneOffset: now.getTimezoneOffset(),
      appointmentTimezoneOffset: appointmentTime.getTimezoneOffset()
    });
    
    // Check if it's the same day
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    
    if (!isSameDay) {
      console.log('❌ Different day - not meeting time');
      console.log('Day comparison:', {
        nowDay: now.toDateString(),
        appointmentDay: appointmentTime.toDateString(),
        isSameDay: isSameDay
      });
      return false;
    }
    
    // Check if current time exactly matches appointment time (same hour and minute)
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const appointmentHour = appointmentTime.getHours();
    const appointmentMinute = appointmentTime.getMinutes();
    
    const isExactTime = nowHour === appointmentHour && nowMinute === appointmentMinute;
    
    console.log('⏰ Exact time comparison:', {
      nowHour: nowHour,
      nowMinute: nowMinute,
      appointmentHour: appointmentHour,
      appointmentMinute: appointmentMinute,
      isExactTime: isExactTime,
      nowTime: now.getTime(),
      appointmentTime: appointmentTime.getTime(),
      timeDifference: now.getTime() - appointmentTime.getTime()
    });
    
    console.log('🎯 Exact meeting time result:', isExactTime);
    
    return isExactTime;
  }

  // Check if meeting time has passed (after 1 hour grace period)
  isMeetingTimePassed(appointment: PatientAppointment): boolean {
    const now = new Date();
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    
    // Check if it's the same day
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    
    if (!isSameDay) {
      return false; // Different day, not applicable
    }
    
    // Calculate time difference in minutes
    const timeDiffMinutes = Math.round((now.getTime() - appointmentTime.getTime()) / (1000 * 60));
    
    // Meeting time has passed if more than 1 hour (60 minutes) has elapsed
    const hasPassed = timeDiffMinutes > 60;
    
    console.log('⏰ Meeting time passed check:', {
      appointmentId: appointment.id,
      timeDiffMinutes: timeDiffMinutes,
      hasPassed: hasPassed,
      gracePeriodMinutes: 60
    });
    
    return hasPassed;
  }

  // Normalize appointment time to handle timezone issues
  private normalizeAppointmentTime(appointmentStart: string): Date {
    try {
      // First, try to parse the appointment time as-is
      let appointmentTime = new Date(appointmentStart);
      
      // If the date is invalid, try alternative parsing methods
      if (isNaN(appointmentTime.getTime())) {
        console.log('⚠️ Invalid date from appointment start, trying alternative parsing:', appointmentStart);
        
        // Try parsing as ISO string with timezone
        if (appointmentStart.includes('T') && appointmentStart.includes('Z')) {
          appointmentTime = new Date(appointmentStart);
        } else if (appointmentStart.includes('T')) {
          // If it's missing timezone info, assume it's in local time
          appointmentTime = new Date(appointmentStart + 'Z');
        } else {
          // If it's just a date string, try to parse it
          appointmentTime = new Date(appointmentStart);
        }
      }
      
      // If still invalid, create a date from the current date with the time
      if (isNaN(appointmentTime.getTime())) {
        console.log('⚠️ Still invalid date, creating from current date with time components');
        const now = new Date();
        const timeMatch = appointmentStart.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          appointmentTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
        } else {
          appointmentTime = new Date();
        }
      }
      
      console.log('🕐 Normalized appointment time:', {
        original: appointmentStart,
        normalized: appointmentTime.toISOString(),
        local: appointmentTime.toString(),
        utc: appointmentTime.toUTCString()
      });
      
      return appointmentTime;
    } catch (error) {
      console.error('❌ Error normalizing appointment time:', error);
      return new Date();
    }
  }

  // Check if join meeting button should be enabled
  isJoinMeetingEnabled(appointment: PatientAppointment): boolean {
    console.log('🔍 Patient Join Meeting Check:', {
      appointmentId: appointment.id,
      status: appointment.status,
      start: appointment.start
    });
    
    // Disable if appointment is cancelled or completed
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      console.log('❌ Appointment cancelled or completed');
      return false;
    }
    
    // Disable if meeting time has passed (after 1 hour grace period)
    if (this.isMeetingTimePassed(appointment)) {
      console.log('❌ Meeting time has passed');
      return false;
    }
    
    // Enable if it's the exact meeting time or within 1 hour after
    const isExactTime = this.isExactMeetingTime(appointment);
    const isWithinGracePeriod = this.isWithinGracePeriod(appointment);
    
    const canJoin = isExactTime || isWithinGracePeriod;
    console.log('✅ Final result - Join meeting enabled:', canJoin);
    
    return canJoin;
  }

  // Check if current time is within 1 hour grace period after appointment time
  isWithinGracePeriod(appointment: PatientAppointment): boolean {
    const now = new Date();
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    
    // Check if it's the same day
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    
    if (!isSameDay) {
      return false;
    }
    
    // Calculate time difference in minutes
    const timeDiffMinutes = Math.round((now.getTime() - appointmentTime.getTime()) / (1000 * 60));
    
    // Allow joining within 1 hour (60 minutes) after appointment time
    const isWithinGrace = timeDiffMinutes >= 0 && timeDiffMinutes <= 60;
    
    console.log('⏰ Grace period check:', {
      appointmentId: appointment.id,
      timeDiffMinutes: timeDiffMinutes,
      isWithinGrace: isWithinGrace,
      gracePeriodMinutes: 60
    });
    
    return isWithinGrace;
  }

  // Get meeting status text for display
  getMeetingStatusText(appointment: PatientAppointment): string {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return 'Meeting not available';
    }
    
    if (this.isExactMeetingTime(appointment)) {
      return 'Meeting time now! Join Meeting enabled';
    }
    
    // Check if meeting time has passed (after 1 hour grace period)
    if (this.isMeetingTimePassed(appointment)) {
      return 'Meeting time has passed';
    }
    
    // Check if it's the same day using normalized time
    const now = new Date();
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    
    if (isSameDay) {
      const timeDiffMinutes = Math.round((appointmentTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (timeDiffMinutes > 0) {
        return `Meeting starts in ${timeDiffMinutes} minutes`;
      } else {
        // Within 1 hour of appointment time, show different message
        const elapsedMinutes = Math.abs(timeDiffMinutes);
        return `Meeting is Online (${elapsedMinutes} minutes ago)`;
      }
    }
    
    return 'Meeting not available at this time';
  }

  // Debug method to test time validation with current time
  debugTimeValidation(appointment: PatientAppointment): void {
    console.log('🧪 DEBUG: Time Validation Test');
    console.log('Current time:', new Date().toISOString());
    console.log('Appointment time:', appointment.start);
    console.log('Appointment status:', appointment.status);
    console.log('Is meeting time now:', this.isMeetingTimeNow(appointment));
    console.log('Is exact meeting time:', this.isExactMeetingTime(appointment));
    console.log('Is join meeting enabled:', this.isJoinMeetingEnabled(appointment));
    console.log('Meeting status text:', this.getMeetingStatusText(appointment));
    
    // Test with 1-minute tolerance
    const now = new Date();
    const appointmentTime = new Date(appointment.start);
    const timeDiffMinutes = Math.abs((now.getTime() - appointmentTime.getTime()) / (1000 * 60));
    console.log('⏱️ Time difference in minutes:', timeDiffMinutes);
    console.log('⏱️ Within 1 minute tolerance:', timeDiffMinutes <= 1);
  }

  // Test method with 1-minute tolerance for debugging
  isWithinOneMinute(appointment: PatientAppointment): boolean {
    const now = new Date();
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    
    if (!isSameDay) {
      return false;
    }
    
    const timeDiffMinutes = Math.abs((now.getTime() - appointmentTime.getTime()) / (1000 * 60));
    return timeDiffMinutes <= 1;
  }

  // Test method to check if appointment time exactly matches current time
  isExactTimeMatch(appointment: PatientAppointment): boolean {
    const now = new Date();
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    
    console.log('🕐 Exact Time Match Check:', {
      appointmentId: appointment.id,
      now: now.toISOString(),
      appointmentTime: appointmentTime.toISOString(),
      nowTime: now.getTime(),
      appointmentTimeValue: appointmentTime.getTime(),
      timeDifference: Math.abs(now.getTime() - appointmentTime.getTime()),
      timeDifferenceMinutes: Math.abs((now.getTime() - appointmentTime.getTime()) / (1000 * 60))
    });
    
    // Check if it's the same day
    const isSameDay = now.toDateString() === appointmentTime.toDateString();
    if (!isSameDay) {
      return false;
    }
    
    // Check if times are within 1 minute of each other
    const timeDiffMinutes = Math.abs((now.getTime() - appointmentTime.getTime()) / (1000 * 60));
    const isExactMatch = timeDiffMinutes <= 1;
    
    console.log('🎯 Exact time match result:', isExactMatch);
    return isExactMatch;
  }

  // Format appointment time for display without timezone conversion
  formatAppointmentTime(appointmentStart: string): string {
    try {
      const appointmentTime = this.normalizeAppointmentTime(appointmentStart);
      
      // Format time in local timezone without additional conversion
      const hours = appointmentTime.getHours();
      const minutes = appointmentTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      
      const formattedTime = `${displayHours}:${displayMinutes} ${ampm}`;
      
      console.log('🕐 Time formatting:', {
        original: appointmentStart,
        normalized: appointmentTime.toISOString(),
        local: appointmentTime.toString(),
        formatted: formattedTime,
        hours: hours,
        minutes: minutes
      });
      
      return formattedTime;
    } catch (error) {
      console.error('❌ Error formatting appointment time:', error);
      return 'Invalid time';
    }
  }

  // Format appointment date for display
  formatAppointmentDate(appointmentStart: string): string {
    try {
      const appointmentTime = this.normalizeAppointmentTime(appointmentStart);
      
      // Format date in local timezone
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      
      const formattedDate = appointmentTime.toLocaleDateString('en-US', options);
      
      console.log('📅 Date formatting:', {
        original: appointmentStart,
        normalized: appointmentTime.toISOString(),
        formatted: formattedDate
      });
      
      return formattedDate;
    } catch (error) {
      console.error('❌ Error formatting appointment date:', error);
      return 'Invalid date';
    }
  }

  // Create appointment datetime by combining requestedDate and requestedTime
  private createAppointmentDateTime(requestedDate: string, requestedTime: string): string {
    try {
      console.log('🕐 Creating appointment datetime:', {
        requestedDate: requestedDate,
        requestedTime: requestedTime,
        requestedDateType: typeof requestedDate,
        requestedTimeType: typeof requestedTime
      });

      // Parse the requested date
      const dateObj = new Date(requestedDate);
      
      if (isNaN(dateObj.getTime())) {
        console.error('❌ Invalid requestedDate:', requestedDate);
        return requestedDate; // Fallback to original
      }

      // If requestedTime is provided and valid, combine it with the date
      if (requestedTime && requestedTime.trim()) {
        // Parse the time string (could be in various formats like "10:19", "10:19:00", "10:19 AM", etc.)
        const timeMatch = requestedTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[4]?.toUpperCase();
          
          // Handle AM/PM conversion
          if (ampm === 'PM' && hours !== 12) {
            hours += 12;
          } else if (ampm === 'AM' && hours === 12) {
            hours = 0;
          }
          
          // Create new date with the specific time
          const combinedDate = new Date(dateObj);
          combinedDate.setHours(hours, minutes, 0, 0);
          
          const result = combinedDate.toISOString();
          
          console.log('🕐 Combined datetime result:', {
            originalDate: requestedDate,
            originalTime: requestedTime,
            parsedHours: hours,
            parsedMinutes: minutes,
            combinedDate: combinedDate.toISOString(),
            result: result
          });
          
          return result;
        } else {
          console.warn('⚠️ Could not parse requestedTime:', requestedTime);
        }
      }
      
      // Fallback to original requestedDate if time parsing fails
      console.log('🕐 Using fallback requestedDate:', requestedDate);
      return requestedDate;
      
    } catch (error) {
      console.error('❌ Error creating appointment datetime:', error);
      return requestedDate; // Fallback to original
    }
  }
}
