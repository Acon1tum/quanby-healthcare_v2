import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

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
  imports: [CommonModule],
  templateUrl: './patient-schedule.component.html',
  styleUrl: './patient-schedule.component.scss'
})
export class PatientScheduleComponent {
  appointments: PatientAppointment[] = [
    {
      id: 'APT-2001',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      reason: 'Heart checkup',
      scheduledAt: new Date().toISOString(),
      start: new Date(new Date().getTime() + 24 * 3600 * 1000).toISOString(),
      end: new Date(new Date().getTime() + 24 * 3600 * 1000 + 30 * 60000).toISOString(),
      status: 'confirmed'
    },
    {
      id: 'APT-2002',
      doctor: 'Dr. Michael Chen',
      specialty: 'Dermatology',
      reason: 'Skin consultation',
      scheduledAt: new Date().toISOString(),
      start: new Date(new Date().getTime() + 3 * 24 * 3600 * 1000).toISOString(),
      end: new Date(new Date().getTime() + 3 * 24 * 3600 * 1000 + 45 * 60000).toISOString(),
      status: 'scheduled'
    }
  ];

  // Calendar
  current = new Date();
  weeks: Array<Array<{ date: Date; inMonth: boolean; hasAppt: boolean; appointmentCount: number }>> = [];

  constructor() {
    this.buildCalendar();
  }

  cancelAppointment(appt: PatientAppointment) { 
    appt.status = 'cancelled'; 
    this.buildCalendar(); 
  }

  rescheduleAppointment(appt: PatientAppointment) {
    // TODO: Implement rescheduling logic
    console.log('Reschedule appointment:', appt.id);
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
}
