import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-schedule.component.html',
  styleUrl: './doctor-schedule.component.scss'
})
export class DoctorScheduleComponent {
  requests: ScheduleRequest[] = [
    {
      id: 'REQ-1001',
      patient: 'Jane Miller',
      reason: 'Follow-up consultation',
      requestedAt: new Date().toISOString(),
      start: new Date().toISOString(),
      end: new Date(new Date().getTime() + 30 * 60000).toISOString(),
      status: 'pending'
    },
    {
      id: 'REQ-1002',
      patient: 'Alan Cooper',
      reason: 'New patient intake',
      requestedAt: new Date().toISOString(),
      start: new Date(new Date().getTime() + 2 * 3600 * 1000).toISOString(),
      end: new Date(new Date().getTime() + 2.5 * 3600 * 1000).toISOString(),
      status: 'pending'
    }
  ];

  // Calendar
  current = new Date();
  weeks: Array<Array<{ date: Date; inMonth: boolean; hasAppt: boolean }>> = [];

  constructor() {
    this.buildCalendar();
  }

  accept(req: ScheduleRequest) { req.status = 'accepted'; this.buildCalendar(); }
  reject(req: ScheduleRequest) { req.status = 'rejected'; this.buildCalendar(); }

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
        .filter(r => r.status === 'accepted')
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
}
