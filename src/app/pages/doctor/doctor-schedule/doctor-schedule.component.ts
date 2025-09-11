import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService } from '../../../services/appointments.service';

type ScheduleStatus = 'pending' | 'accepted' | 'rejected';

interface ScheduleRequest {
  id: string;
  patient: string;
  reason: string;
  requestedAt: string; // ISO
  start: string; // ISO
  end: string; // ISO
  status: ScheduleStatus;
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

  constructor(private appointments: AppointmentsService) {
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
    const id = Number(req.id);
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
    const id = Number(req.id);
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
          this.requests = resp.data.map((a: any) => ({
            id: String(a.id),
            patient: a?.patient?.patientInfo?.fullName || a?.patient?.email || 'Patient',
            reason: a.reason,
            requestedAt: a.createdAt || a.requestedDate,
            start: a.requestedDate,
            end: a.requestedDate,
            status: this.mapBackendStatus(a.status)
          }));
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

  openAvailabilityModal() { this.showAvailabilityModal = true; }
  closeAvailabilityModal() { this.showAvailabilityModal = false; this.conflictError = null; }

  requestRescheduleForDay(dayOfWeek: string) {
    this.conflictDay = dayOfWeek;
    this.showRescheduleModal = true;
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
}
