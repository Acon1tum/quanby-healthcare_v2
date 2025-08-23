import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Interfaces based on the database schema
interface Doctor {
  id: number;
  email: string;
  role: 'DOCTOR';
  createdAt: Date;
  updatedAt: Date;
  doctorInfo?: DoctorInfo;
  doctorCategories?: DoctorCategory[];
  consultationsAsDoctor?: Consultation[];
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

interface Consultation {
  id: number;
  doctorId: number;
  patientId: number;
  startTime: Date;
  endTime?: Date;
  consultationLink: string;
  patient?: PatientInfo;
  healthScan?: HealthScan;
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

interface HealthScan {
  id: number;
  consultationId: number;
  bloodPressure?: string;
  heartRate?: number;
  spO2?: number;
  respiratoryRate?: number;
  stressLevel?: number;
  stressScore?: number;
  hrvSdnn?: number;
  hrvRmsdd?: number;
  generalWellness?: number;
  generalRisk?: number;
  coronaryHeartDisease?: number;
  congestiveHeartFailure?: number;
  intermittentClaudication?: number;
  strokeRisk?: number;
  covidRisk?: number;
  height?: number;
  weight?: number;
  smoker?: boolean;
  hypertension?: boolean;
  bpMedication?: boolean;
  diabetic?: number;
  waistCircumference?: number;
  heartDisease?: boolean;
  depression?: boolean;
  totalCholesterol?: number;
  hdl?: number;
  parentalHypertension?: number;
  physicalActivity?: boolean;
  healthyDiet?: boolean;
  antiHypertensive?: boolean;
  historyBloodGlucose?: boolean;
  historyFamilyDiabetes?: number;
}

interface DoctorSchedule {
  id: number;
  doctorId: number;
  dayOfWeek: string;
  startTime: Date;
  endTime: Date;
}

@Component({
  selector: 'app-doctor-information',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-information.component.html',
  styleUrl: './doctor-information.component.scss'
})
export class DoctorInformationComponent implements OnInit {
  doctor: Doctor | null = null;
  isLoading = true;
  error = '';

  // Mock data for the new sections
  consultations: Consultation[] = [];
  healthScans: HealthScan[] = [];
  schedules: DoctorSchedule[] = [];

  // Modal states
  isConsultationModalOpen = false;
  isHealthScanModalOpen = false;
  isScheduleModalOpen = false;
  selectedConsultation: Consultation | null = null;
  selectedHealthScan: HealthScan | null = null;
  selectedSchedule: DoctorSchedule | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.doctor = navigation.extras.state['doctor'];
      this.isLoading = false;
      this.loadDoctorData();
    } else {
      this.tryAlternativeDataRetrieval();
    }
  }

  private tryAlternativeDataRetrieval(): void {
    const storedDoctor = localStorage.getItem('selectedDoctor');
    if (storedDoctor) {
      try {
        this.doctor = JSON.parse(storedDoctor);
        this.isLoading = false;
        this.loadDoctorData();
        localStorage.removeItem('selectedDoctor');
      } catch (error) {
        console.error('Error parsing stored doctor data:', error);
        this.error = 'Invalid doctor data format';
        this.isLoading = false;
      }
    } else {
      this.error = 'No doctor data available. Please select a doctor from the Doctor Management page.';
      this.isLoading = false;
    }
  }

  private loadDoctorData(): void {
    if (this.doctor) {
      this.loadConsultations();
      this.loadHealthScans();
      this.loadSchedules();
    }
  }

  private loadConsultations(): void {
    this.consultations = [
      {
        id: 1,
        doctorId: this.doctor!.id,
        patientId: 1,
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T10:30:00'),
        consultationLink: 'https://meet.google.com/abc-defg-hij',
        patient: {
          id: 1,
          userId: 1,
          fullName: 'John Smith',
          gender: 'MALE',
          dateOfBirth: new Date('1985-03-20'),
          contactNumber: '+1-555-0101',
          address: '123 Main St, City',
          weight: 75,
          height: 175,
          bloodType: 'A+',
          medicalHistory: 'Hypertension, Diabetes',
          allergies: 'Penicillin',
          medications: 'Metformin, Lisinopril'
        }
      },
      {
        id: 2,
        doctorId: this.doctor!.id,
        patientId: 2,
        startTime: new Date('2024-01-10T14:00:00'),
        endTime: new Date('2024-01-10T14:45:00'),
        consultationLink: 'https://meet.google.com/xyz-uvw-rst',
        patient: {
          id: 2,
          userId: 2,
          fullName: 'Sarah Johnson',
          gender: 'FEMALE',
          dateOfBirth: new Date('1990-07-15'),
          contactNumber: '+1-555-0102',
          address: '456 Oak Ave, Town',
          weight: 65,
          height: 165,
          bloodType: 'O+',
          medicalHistory: 'Asthma',
          allergies: 'Dust, Pollen',
          medications: 'Albuterol inhaler'
        }
      }
    ];
  }

  private loadHealthScans(): void {
    this.healthScans = [
      {
        id: 1,
        consultationId: 1,
        bloodPressure: '130/85',
        heartRate: 78,
        spO2: 96,
        respiratoryRate: 18,
        stressLevel: 2.5,
        stressScore: 267.8,
        hrvSdnn: 42.1,
        hrvRmsdd: 35.9,
        generalWellness: 72.3,
        generalRisk: 4.1,
        coronaryHeartDisease: 2.8,
        congestiveHeartFailure: 0.4,
        intermittentClaudication: 0.7,
        strokeRisk: 1.8,
        covidRisk: 2.5,
        height: 175,
        weight: 75,
        smoker: false,
        hypertension: true,
        bpMedication: true,
        diabetic: 1,
        waistCircumference: 85,
        heartDisease: false,
        depression: false,
        totalCholesterol: 195,
        hdl: 52,
        parentalHypertension: 2,
        physicalActivity: true,
        healthyDiet: false,
        antiHypertensive: true,
        historyBloodGlucose: true,
        historyFamilyDiabetes: 1
      },
      {
        id: 2,
        consultationId: 2,
        bloodPressure: '118/75',
        heartRate: 72,
        spO2: 98,
        respiratoryRate: 16,
        stressLevel: 1.9,
        stressScore: 198.4,
        hrvSdnn: 48.7,
        hrvRmsdd: 41.2,
        generalWellness: 79.1,
        generalRisk: 2.9,
        coronaryHeartDisease: 1.6,
        congestiveHeartFailure: 0.2,
        intermittentClaudication: 0.4,
        strokeRisk: 1.1,
        covidRisk: 2.0,
        height: 165,
        weight: 65,
        smoker: false,
        hypertension: false,
        bpMedication: false,
        diabetic: 0,
        waistCircumference: 78,
        heartDisease: false,
        depression: false,
        totalCholesterol: 175,
        hdl: 58,
        parentalHypertension: 1,
        physicalActivity: true,
        healthyDiet: true,
        antiHypertensive: false,
        historyBloodGlucose: false,
        historyFamilyDiabetes: 0
      }
    ];
  }

  private loadSchedules(): void {
    this.schedules = [
      {
        id: 1,
        doctorId: this.doctor!.id,
        dayOfWeek: 'Monday',
        startTime: new Date('2024-01-22T09:00:00'),
        endTime: new Date('2024-01-22T17:00:00')
      },
      {
        id: 2,
        doctorId: this.doctor!.id,
        dayOfWeek: 'Wednesday',
        startTime: new Date('2024-01-24T09:00:00'),
        endTime: new Date('2024-01-24T17:00:00')
      },
      {
        id: 3,
        doctorId: this.doctor!.id,
        dayOfWeek: 'Friday',
        startTime: new Date('2024-01-26T09:00:00'),
        endTime: new Date('2024-01-26T17:00:00')
      }
    ];
  }

  goBack(): void {
    this.router.navigate(['/admin/system-administration/doctor-management']);
  }

  goToDoctorManagement(): void {
    this.router.navigate(['/admin/system-administration/doctor-management']);
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

  getDoctorFullName(doctor: Doctor): string {
    if (doctor.doctorInfo) {
      return `${doctor.doctorInfo.firstName} ${doctor.doctorInfo.lastName}`;
    }
    return 'N/A';
  }

  getPatientFullName(patient: PatientInfo): string {
    return patient.fullName;
  }

  getHealthRiskLevel(risk: number | undefined): string {
    if (!risk) return 'N/A';
    if (risk < 2) return 'Low';
    if (risk < 5) return 'Moderate';
    if (risk < 10) return 'High';
    return 'Very High';
  }

  getHealthRiskClass(risk: number | undefined): string {
    if (!risk) return '';
    if (risk < 2) return 'status-success';
    if (risk < 5) return 'status-warning';
    if (risk < 10) return 'status-danger';
    return 'status-danger';
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getConsultationDuration(startTime: Date, endTime?: Date): string {
    if (!endTime) return 'Ongoing';
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    return `${minutes} min`;
  }

  // Modal methods
  openConsultationModal(consultation: Consultation): void {
    this.selectedConsultation = consultation;
    this.isConsultationModalOpen = true;
  }

  closeConsultationModal(): void {
    this.isConsultationModalOpen = false;
    this.selectedConsultation = null;
  }

  openHealthScanModal(scan: HealthScan): void {
    this.selectedHealthScan = scan;
    this.isHealthScanModalOpen = true;
  }

  closeHealthScanModal(): void {
    this.isHealthScanModalOpen = false;
    this.selectedHealthScan = null;
  }

  openScheduleModal(schedule: DoctorSchedule): void {
    this.selectedSchedule = schedule;
    this.isScheduleModalOpen = true;
  }

  closeScheduleModal(): void {
    this.isScheduleModalOpen = false;
    this.selectedSchedule = null;
  }
}
