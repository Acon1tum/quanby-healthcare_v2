import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentsService } from '../../../services/appointments.service';
import { ConsultationsService } from '../../../services/consultations.service';
import { AuthService } from '../../../auth/auth.service';

type ScheduleStatus = 'pending' | 'accepted' | 'rejected';

interface ScheduleRequest {
  id: string;
  patient: string;
  patientId?: string;
  reason: string;
  requestedAt: string; // ISO
  start: string; // ISO
  end: string; // ISO
  status: ScheduleStatus;
  consultationCode?: string;
  consultationId?: string;
}

interface AvailabilityDto {
  dayOfWeek: string;
  isAvailable: boolean;
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  hasExistingAppointments?: boolean;
  existingAppointments?: any[];
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-schedule.component.html',
  styleUrl: './doctor-schedule.component.scss'
})
export class DoctorScheduleComponent implements OnInit {
  days: AvailabilityDto[] = [
    { dayOfWeek: 'Monday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Tuesday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Wednesday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Thursday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Friday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Saturday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
  ];
  requests: ScheduleRequest[] = [];

  // Pagination for pending requests
  pendingCurrentPage = 1;
  pendingItemsPerPage = 5;
  pendingTotalPages = 1;
  paginatedPendingRequests: ScheduleRequest[] = [];

  // Pagination for confirmed requests
  confirmedCurrentPage = 1;
  confirmedItemsPerPage = 5;
  confirmedTotalPages = 1;
  paginatedConfirmedRequests: ScheduleRequest[] = [];

  // Calendar
  current = new Date();
  weeks: Array<Array<{ date: Date; inMonth: boolean; hasAppt: boolean }>> = [];

  saving = false;
  showAvailabilityModal = false;
  conflictError: any = null;
  showRescheduleModal = false;
  rescheduleReason = '';
  conflictDay = '';
  rescheduleNewDate = '';
  rescheduleNewTime = '';

  // Appointment details modal
  showAppointmentModal = false;
  selectedDate: Date | null = null;
  selectedDateAppointments: ScheduleRequest[] = [];

  // Consultation creation state
  isCreatingConsultation = false;
  consultationError: string | null = null;

  // Meeting join state
  isJoiningMeeting = false;
  joiningMeetingId: string | null = null;

  constructor(
    private appointments: AppointmentsService,
    private consultations: ConsultationsService,
    private router: Router,
    private auth: AuthService
  ) {
    this.buildCalendar();
    this.loadAvailability();
    this.loadRequests();
  }

  ngOnInit() {
    // Add some sample data for testing if no data is loaded
    setTimeout(() => {
      if (this.requests.length === 0) {
        this.requests = [
          {
            id: '1',
            patient: 'John Doe',
            reason: 'Regular checkup',
            requestedAt: new Date().toISOString(),
            start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            status: 'pending'
          },
          {
            id: '2',
            patient: 'Jane Smith',
            reason: 'Follow-up consultation',
            requestedAt: new Date().toISOString(),
            start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            status: 'pending'
          }
        ];
        this.updatePendingPagination();
        this.updateConfirmedPagination();
      }
    }, 1000);
  }

  accept(req: ScheduleRequest) {
    const id = String(req.id);
    this.appointments.updateAppointmentStatus(id, 'CONFIRMED').subscribe({
      next: () => {
        req.status = 'accepted';
        this.updatePendingPagination();
        this.updateConfirmedPagination();
        this.buildCalendar();
        this.loadRequests();
      },
      error: (e) => console.error('Failed to confirm appointment', e)
    });
  }
  reject(req: ScheduleRequest) {
    const id = String(req.id);
    this.appointments.updateAppointmentStatus(id, 'REJECTED').subscribe({
      next: () => {
        req.status = 'rejected';
        this.updatePendingPagination();
        this.updateConfirmedPagination();
        this.buildCalendar();
        this.loadRequests();
      },
      error: (e) => console.error('Failed to reject appointment', e)
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

    const apptDays = new Set(
      this.requests
        .filter(r => r.status === 'accepted') // Show confirmed appointments on calendar
        .map(r => new Date(r.start))
        .map(d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    );

    this.weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7).map(date => ({
        date,
        inMonth: date.getMonth() === month,
        hasAppt: apptDays.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
      }));
      this.weeks.push(week);
    }
  }

  prevMonth() { this.current = new Date(this.current.getFullYear(), this.current.getMonth() - 1, 1); this.buildCalendar(); }
  nextMonth() { this.current = new Date(this.current.getFullYear(), this.current.getMonth() + 1, 1); this.buildCalendar(); }

  loadRequests() {
    // Load all appointments (not just PENDING) to show confirmed appointments
    this.appointments.getMyAppointments({ limit: 50 }).subscribe({
      next: (resp: any) => {
        if (resp?.success && Array.isArray(resp.data)) {
          this.requests = resp.data.map((a: any) => {
            // Debug logging for timezone issues
            console.log('🕐 Raw appointment data from database:', {
              id: a.id,
              requestedDate: a.requestedDate,
              requestedTime: a.requestedTime,
              createdAt: a.createdAt,
              requestedDateType: typeof a.requestedDate,
              requestedTimeType: typeof a.requestedTime,
              requestedDateValue: a.requestedDate,
              requestedTimeValue: a.requestedTime
            });
            
            // Create appointment time by combining requestedDate and requestedTime
            const appointmentDateTime = this.createAppointmentDateTime(a.requestedDate, a.requestedTime);
            
            const mappedAppointment = {
              id: String(a.id),
              patient: a?.patient?.patientInfo?.fullName || a?.patient?.email || 'Patient',
              patientId: a?.patient?.id ? String(a.patient.id) : undefined,
              reason: a.reason,
              requestedAt: a.createdAt || a.requestedDate,
              start: appointmentDateTime,
              end: appointmentDateTime,
              status: this.mapBackendStatus(a.status),
              consultationCode: a?.consultation?.consultationCode,
              consultationId: a?.consultation?.id
            };
            
            // Debug the mapped appointment
            console.log('🕐 Mapped appointment for time validation:', {
              id: mappedAppointment.id,
              originalRequestedDate: a.requestedDate,
              originalRequestedTime: a.requestedTime,
              combinedDateTime: appointmentDateTime,
              start: mappedAppointment.start,
              startDate: new Date(mappedAppointment.start),
              startLocal: new Date(mappedAppointment.start).toString(),
              startUTC: new Date(mappedAppointment.start).toUTCString(),
              currentTime: new Date().toString(),
              currentUTC: new Date().toUTCString()
            });
            
            return mappedAppointment;
          });
          this.updatePendingPagination();
          this.updateConfirmedPagination();
          this.buildCalendar();
        }
      },
      error: (e) => {
        console.error('Failed to load requests', e);
      }
    });
  }

  private mapBackendStatus(backendStatus: string): ScheduleStatus {
    switch (backendStatus) {
      case 'PENDING': return 'pending';
      case 'CONFIRMED': return 'accepted';
      case 'REJECTED': return 'rejected';
      case 'CANCELLED': return 'rejected';
      case 'COMPLETED': return 'accepted';
      case 'RESCHEDULED': return 'rejected';
      default: return 'pending';
    }
  }

  loadAvailability() {
    this.appointments.getMyAvailability().subscribe((resp: { success: boolean; data: AvailabilityDto[] }) => {
      if (resp?.success && Array.isArray(resp.data)) {
        const map = new Map<string, AvailabilityDto>(resp.data.map((d) => [d.dayOfWeek, d]));
        this.days = this.days.map(d => {
          const found = map.get(d.dayOfWeek);
          if (!found) return d;
          const st = new Date(found.startTime);
          const et = new Date(found.endTime);
          const hhmm = (dt: Date) => `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
          return {
            dayOfWeek: d.dayOfWeek,
            isAvailable: !!found.isAvailable,
            startTime: hhmm(st),
            endTime: hhmm(et),
            hasExistingAppointments: !!(found as any).hasExistingAppointments,
            existingAppointments: (found as any).existingAppointments || []
          };
        });
      }
    });
  }

  saveAvailability() {
    this.saving = true;
    this.conflictError = null;
    const toIsoToday = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      const dt = new Date();
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    };
    const payload = this.days.map(d => ({
      dayOfWeek: d.dayOfWeek,
      isAvailable: d.isAvailable,
      startTime: toIsoToday(d.startTime),
      endTime: toIsoToday(d.endTime)
    }));
    this.appointments.updateMyAvailability(payload).subscribe({
      next: () => { 
        this.saving = false;
        this.closeAvailabilityModal();
      },
      error: (error) => { 
        this.saving = false;
        if (error.error?.requiresReschedule) {
          this.conflictError = error.error;
        }
      }
    });
  }

  openAvailabilityModal() { 
    this.showAvailabilityModal = true; 
    document.body.classList.add('modal-open');
  }
  closeAvailabilityModal() { 
    this.showAvailabilityModal = false; 
    this.conflictError = null; 
    document.body.classList.remove('modal-open');
  }

  requestRescheduleForDay(dayOfWeek: string) {
    this.conflictDay = dayOfWeek;
    this.showRescheduleModal = true;
    document.body.classList.add('modal-open');
  }

  submitReschedule() {
    if (!this.rescheduleReason.trim()) return;
    
    const newDate = this.rescheduleNewDate || undefined;
    const newTime = this.rescheduleNewTime || undefined;
    this.appointments.requestRescheduleForDay(this.conflictDay, this.rescheduleReason, newDate, newTime).subscribe({
      next: () => {
        this.showRescheduleModal = false;
        this.rescheduleReason = '';
        this.conflictDay = '';
        this.rescheduleNewDate = '';
        this.rescheduleNewTime = '';
        // Reload availability to update the UI
        this.loadAvailability();
      },
      error: (error) => {
        console.error('Error requesting reschedule:', error);
      }
    });
  }

  closeRescheduleModal() {
    this.showRescheduleModal = false;
    this.rescheduleReason = '';
    this.conflictDay = '';
    this.rescheduleNewDate = '';
    this.rescheduleNewTime = '';
    document.body.classList.remove('modal-open');
  }

  getPendingRequests(): ScheduleRequest[] {
    return this.requests.filter(r => r.status === 'pending');
  }

  getConfirmedRequests(): ScheduleRequest[] {
    return this.requests.filter(r => r.status === 'accepted');
  }

  // Pagination methods for pending requests
  updatePendingPagination() {
    const pendingRequests = this.getPendingRequests();
    this.pendingTotalPages = Math.ceil(pendingRequests.length / this.pendingItemsPerPage);
    if (this.pendingCurrentPage > this.pendingTotalPages) {
      this.pendingCurrentPage = 1;
    }
    
    const startIndex = (this.pendingCurrentPage - 1) * this.pendingItemsPerPage;
    const endIndex = startIndex + this.pendingItemsPerPage;
    this.paginatedPendingRequests = pendingRequests.slice(startIndex, endIndex);
  }

  goToPendingPage(page: number) {
    if (page >= 1 && page <= this.pendingTotalPages) {
      this.pendingCurrentPage = page;
      this.updatePendingPagination();
    }
  }

  previousPendingPage() {
    if (this.pendingCurrentPage > 1) {
      this.goToPendingPage(this.pendingCurrentPage - 1);
    }
  }

  nextPendingPage() {
    if (this.pendingCurrentPage < this.pendingTotalPages) {
      this.goToPendingPage(this.pendingCurrentPage + 1);
    }
  }

  getPendingPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.pendingCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.pendingTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getPendingEndIndex(): number {
    const pendingRequests = this.getPendingRequests();
    return Math.min(this.pendingCurrentPage * this.pendingItemsPerPage, pendingRequests.length);
  }

  // Pagination methods for confirmed requests
  updateConfirmedPagination() {
    const confirmedRequests = this.getConfirmedRequests();
    this.confirmedTotalPages = Math.ceil(confirmedRequests.length / this.confirmedItemsPerPage);
    if (this.confirmedCurrentPage > this.confirmedTotalPages) {
      this.confirmedCurrentPage = 1;
    }
    
    const startIndex = (this.confirmedCurrentPage - 1) * this.confirmedItemsPerPage;
    const endIndex = startIndex + this.confirmedItemsPerPage;
    this.paginatedConfirmedRequests = confirmedRequests.slice(startIndex, endIndex);
  }

  goToConfirmedPage(page: number) {
    if (page >= 1 && page <= this.confirmedTotalPages) {
      this.confirmedCurrentPage = page;
      this.updateConfirmedPagination();
    }
  }

  previousConfirmedPage() {
    if (this.confirmedCurrentPage > 1) {
      this.goToConfirmedPage(this.confirmedCurrentPage - 1);
    }
  }

  nextConfirmedPage() {
    if (this.confirmedCurrentPage < this.confirmedTotalPages) {
      this.goToConfirmedPage(this.confirmedCurrentPage + 1);
    }
  }

  getConfirmedPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.confirmedCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.confirmedTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getConfirmedEndIndex(): number {
    const confirmedRequests = this.getConfirmedRequests();
    return Math.min(this.confirmedCurrentPage * this.confirmedItemsPerPage, confirmedRequests.length);
  }

  // Check if it's currently time for the meeting (same day and time)
  isMeetingTimeNow(appointment: ScheduleRequest): boolean {
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
  isExactMeetingTime(appointment: ScheduleRequest): boolean {
    const now = new Date();
    
    // Handle timezone issues by normalizing the appointment time
    const appointmentTime = this.normalizeAppointmentTime(appointment.start);
    
    // Enhanced debug logging
    console.log('🕐 Doctor Exact Meeting Time Check:', {
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
  isMeetingTimePassed(appointment: ScheduleRequest): boolean {
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
  isJoinMeetingEnabled(appointment: ScheduleRequest): boolean {
    console.log('🔍 Doctor Join Meeting Check:', {
      appointmentId: appointment.id,
      status: appointment.status,
      start: appointment.start
    });
    
    // Disable if appointment is not accepted
    if (appointment.status !== 'accepted') {
      console.log('❌ Appointment not accepted');
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
  isWithinGracePeriod(appointment: ScheduleRequest): boolean {
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
  getMeetingStatusText(appointment: ScheduleRequest): string {
    if (appointment.status !== 'accepted') {
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
  debugTimeValidation(appointment: ScheduleRequest): void {
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
  isWithinOneMinute(appointment: ScheduleRequest): boolean {
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
  isExactTimeMatch(appointment: ScheduleRequest): boolean {
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

  // Get appointments for a specific date
  getAppointmentsForDate(date: Date): ScheduleRequest[] {
    const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return this.requests.filter(r => {
      const appointmentDate = new Date(r.start);
      const appointmentDateStr = `${appointmentDate.getFullYear()}-${appointmentDate.getMonth()}-${appointmentDate.getDate()}`;
      return appointmentDateStr === dateStr && r.status === 'accepted';
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

  // Navigate to doctor-meet component
  joinMeeting(appointment: ScheduleRequest) {
    // Set loading state
    this.isJoiningMeeting = true;
    this.joiningMeetingId = appointment.id;
    
    // Generate consistent room ID for both doctor and patient
    const roomId = this.generateConsistentRoomId(appointment);
    
    // Navigate to meeting with auto-join
    this.router.navigate(['/doctor/meet'], { queryParams: { roomId: roomId } });
    
    // Reset loading state after navigation
    setTimeout(() => {
      this.isJoiningMeeting = false;
      this.joiningMeetingId = null;
    }, 2000);
  }

  // Create consultation for appointment
  private createConsultationForAppointment(appointment: ScheduleRequest) {
    // Get patient ID from appointment data
    const patientId = this.getPatientIdFromAppointment(appointment);
    
    if (!patientId) {
      console.error('Patient ID not found for appointment');
      this.consultationError = 'Patient ID not found for this appointment';
      // Fallback to appointment ID or generate new room ID
      const roomId = appointment.id || this.generateRoomId();
      this.router.navigate(['/doctor/meet'], { queryParams: { roomId: roomId } });
      return;
    }

    this.isCreatingConsultation = true;
    this.consultationError = null;

    const consultationData = {
      patientId: patientId,
      startTime: new Date(appointment.start),
      notes: `Consultation for appointment: ${appointment.reason}`,
      diagnosis: '',
      treatment: ''
    };

    this.consultations.createDirectConsultation(consultationData).subscribe({
      next: (consultationResp: any) => {
        this.isCreatingConsultation = false;
        if (consultationResp?.success && consultationResp.data?.consultationCode) {
          // Update the appointment with the new consultation data
          this.updateAppointmentWithConsultation(appointment, consultationResp.data);
          // Navigate to meeting with consultation code
          this.router.navigate(['/doctor/meet'], { queryParams: { roomId: consultationResp.data.consultationCode } });
        } else {
          console.error('Failed to create consultation');
          this.consultationError = 'Failed to create consultation';
          // Fallback to appointment ID or generate new room ID
          const roomId = appointment.id || this.generateRoomId();
          this.router.navigate(['/doctor/meet'], { queryParams: { roomId: roomId } });
        }
      },
      error: (e) => {
        this.isCreatingConsultation = false;
        console.error('Failed to create consultation', e);
        this.consultationError = 'Failed to create consultation: ' + (e.error?.message || e.message || 'Unknown error');
        // Fallback to appointment ID or generate new room ID
        const roomId = appointment.id || this.generateRoomId();
        this.router.navigate(['/doctor/meet'], { queryParams: { roomId: roomId } });
      }
    });
  }

  // Get patient ID from appointment data
  private getPatientIdFromAppointment(appointment: ScheduleRequest): string | null {
    return appointment.patientId || null;
  }

  // Update appointment with consultation data
  private updateAppointmentWithConsultation(appointment: ScheduleRequest, consultation: any) {
    // Update the appointment object with consultation data
    appointment.consultationCode = consultation.consultationCode;
    appointment.consultationId = consultation.id;
    
    // You might want to update the backend as well
    // This would require an API call to update the appointment with consultation ID
  }

  // Generate a simple room ID
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Generate consistent room ID based on appointment details
  private generateConsistentRoomId(appointment: ScheduleRequest): string {
    // Create a consistent room ID based on appointment date, time, and unique identifiers
    const appointmentDate = new Date(appointment.start);
    const dateStr = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = appointmentDate.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
    
    // Get unique identifiers
    const appointmentId = appointment.id || 'unknown';
    const patientId = this.getPatientIdFromAppointment(appointment) || 'unknown';
    
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
    console.log('🏠 Doctor Room ID Generation:', {
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
  testRoomIdConsistency(appointment: ScheduleRequest): void {
    const roomId = this.generateConsistentRoomId(appointment);
    console.log('Doctor Room ID:', roomId);
    console.log('Appointment Details:', {
      id: appointment.id,
      start: appointment.start,
      patient: appointment.patient
    });
  }

  // Test method to verify different appointments get different room IDs
  testMultipleRoomIds(): void {
    console.log('🧪 Testing Multiple Room ID Generation (Doctor):');
    
    // Test with different appointments
    const testAppointments = [
      { id: 'apt_001', start: '2024-01-15T10:00:00Z', patientId: 'patient_001' },
      { id: 'apt_002', start: '2024-01-15T10:00:00Z', patientId: 'patient_002' }, // Same time, different ID
      { id: 'apt_001', start: '2024-01-15T11:00:00Z', patientId: 'patient_001' }, // Same ID, different time
      { id: 'apt_003', start: '2024-01-16T10:00:00Z', patientId: 'patient_003' }  // Different date
    ];

    const roomIds = new Set();
    testAppointments.forEach((apt, index) => {
      const roomId = this.generateConsistentRoomId(apt as ScheduleRequest);
      roomIds.add(roomId);
      console.log(`Doctor Appointment ${index + 1}:`, {
        id: apt.id,
        start: apt.start,
        patientId: apt.patientId,
        roomId: roomId,
        roomComponents: `${apt.start.split('T')[0]}-${apt.start.split('T')[1].replace(/:/g, '').split('.')[0]}-${apt.id}-${apt.patientId}`
      });
    });
    
    console.log(`✅ Unique Room IDs Generated: ${roomIds.size}/${testAppointments.length}`);
    if (roomIds.size === testAppointments.length) {
      console.log('🎉 SUCCESS: All appointments have unique room IDs!');
    } else {
      console.log('❌ ERROR: Some appointments have duplicate room IDs!');
    }
  }

  // Check if a calendar day is today
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
}
