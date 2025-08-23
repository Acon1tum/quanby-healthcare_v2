import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

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
  consultationsAsPatient?: Consultation[];
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

interface Consultation {
  id: number;
  doctorId: number;
  patientId: number;
  startTime: Date;
  endTime?: Date;
  consultationLink: string;
  doctor?: DoctorInfo;
  healthScan?: HealthScan;
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
  doctor?: DoctorInfo;
}

@Component({
  selector: 'app-patient-information',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-information.component.html',
  styleUrl: './patient-information.component.scss'
})
export class PatientInformationComponent implements OnInit {
  patient: Patient | null = null;
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
      this.patient = navigation.extras.state['patient'];
      this.isLoading = false;
      this.loadPatientData();
    } else {
      this.tryAlternativeDataRetrieval();
    }
  }

  private tryAlternativeDataRetrieval(): void {
    const storedPatient = localStorage.getItem('selectedPatient');
    if (storedPatient) {
      try {
        this.patient = JSON.parse(storedPatient);
        this.isLoading = false;
        this.loadPatientData();
        localStorage.removeItem('selectedPatient'); // Clear the stored data after retrieving it
      } catch (error) {
        console.error('Error parsing stored patient data:', error);
        this.error = 'Invalid patient data format';
        this.isLoading = false;
      }
    } else {
      this.error = 'No patient data available. Please select a patient from the Patient Management page.';
      this.isLoading = false;
    }
  }

  private loadPatientData(): void {
    if (this.patient) {
      this.loadConsultations();
      this.loadHealthScans();
      this.loadSchedules();
    }
  }

  private loadConsultations(): void {
    // Mock data - replace with actual API call
    this.consultations = [
      {
        id: 1,
        doctorId: 1,
        patientId: this.patient!.id,
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T10:30:00'),
        consultationLink: 'https://meet.google.com/abc-defg-hij',
        doctor: {
          id: 1,
          userId: 1,
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          gender: 'FEMALE',
          dateOfBirth: new Date('1980-05-15'),
          contactNumber: '+1-555-0100',
          address: 'Medical Center, Suite 101',
          bio: 'Cardiologist with 15 years of experience',
          specialization: 'Cardiology',
          qualifications: 'MD, FACC',
          experience: 15
        }
      },
      {
        id: 2,
        doctorId: 2,
        patientId: this.patient!.id,
        startTime: new Date('2024-01-10T14:00:00'),
        endTime: new Date('2024-01-10T14:45:00'),
        consultationLink: 'https://meet.google.com/xyz-uvw-rst',
        doctor: {
          id: 2,
          userId: 2,
          firstName: 'Dr. Michael',
          lastName: 'Chen',
          gender: 'MALE',
          dateOfBirth: new Date('1975-08-20'),
          contactNumber: '+1-555-0200',
          address: 'Medical Center, Suite 205',
          bio: 'General Practitioner with 20 years of experience',
          specialization: 'General Medicine',
          qualifications: 'MD, MPH',
          experience: 20
        }
      }
    ];
  }

  private loadHealthScans(): void {
    // Mock data - replace with actual API call
    this.healthScans = [
      {
        id: 1,
        consultationId: 1,
        bloodPressure: '120/80',
        heartRate: 72,
        spO2: 98,
        respiratoryRate: 16,
        stressLevel: 2.1,
        stressScore: 245.3,
        hrvSdnn: 45.2,
        hrvRmsdd: 38.7,
        generalWellness: 78.5,
        generalRisk: 3.2,
        coronaryHeartDisease: 1.8,
        congestiveHeartFailure: 0.2,
        intermittentClaudication: 0.5,
        strokeRisk: 1.2,
        covidRisk: 2.1,
        height: 175,
        weight: 75,
        smoker: false,
        hypertension: false,
        bpMedication: false,
        diabetic: 0,
        waistCircumference: 82,
        heartDisease: false,
        depression: false,
        totalCholesterol: 185,
        hdl: 55,
        parentalHypertension: 1,
        physicalActivity: true,
        healthyDiet: true,
        antiHypertensive: false,
        historyBloodGlucose: false,
        historyFamilyDiabetes: 0
      },
      {
        id: 2,
        consultationId: 2,
        bloodPressure: '118/78',
        heartRate: 68,
        spO2: 99,
        respiratoryRate: 15,
        stressLevel: 1.8,
        stressScore: 198.4,
        hrvSdnn: 52.1,
        hrvRmsdd: 45.3,
        generalWellness: 82.1,
        generalRisk: 2.8,
        coronaryHeartDisease: 1.5,
        congestiveHeartFailure: 0.1,
        intermittentClaudication: 0.3,
        strokeRisk: 1.0,
        covidRisk: 1.9,
        height: 175,
        weight: 73,
        smoker: false,
        hypertension: false,
        bpMedication: false,
        diabetic: 0,
        waistCircumference: 80,
        heartDisease: false,
        depression: false,
        totalCholesterol: 180,
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
    // Mock data - replace with actual API call
    this.schedules = [
      {
        id: 1,
        doctorId: 1,
        dayOfWeek: 'Monday',
        startTime: new Date('2024-01-22T09:00:00'),
        endTime: new Date('2024-01-22T17:00:00'),
        doctor: {
          id: 1,
          userId: 1,
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          gender: 'FEMALE',
          dateOfBirth: new Date('1980-05-15'),
          contactNumber: '+1-555-0100',
          address: 'Medical Center, Suite 101',
          bio: 'Cardiologist with 15 years of experience',
          specialization: 'Cardiology',
          qualifications: 'MD, FACC',
          experience: 15
        }
      },
      {
        id: 2,
        doctorId: 1,
        dayOfWeek: 'Wednesday',
        startTime: new Date('2024-01-24T09:00:00'),
        endTime: new Date('2024-01-24T17:00:00'),
        doctor: {
          id: 1,
          userId: 1,
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          gender: 'FEMALE',
          dateOfBirth: new Date('1980-05-15'),
          contactNumber: '+1-555-0100',
          address: 'Medical Center, Suite 101',
          bio: 'Cardiologist with 15 years of experience',
          specialization: 'Cardiology',
          qualifications: 'MD, FACC',
          experience: 15
        }
      }
    ];
  }

  // Modal methods
  openConsultationModal(consultation: Consultation): void {
    this.selectedConsultation = consultation;
    this.isConsultationModalOpen = true;
  }

  openHealthScanModal(healthScan: HealthScan): void {
    this.selectedHealthScan = healthScan;
    this.isHealthScanModalOpen = true;
  }

  openScheduleModal(schedule: DoctorSchedule): void {
    this.selectedSchedule = schedule;
    this.isScheduleModalOpen = true;
  }

  closeConsultationModal(): void {
    this.isConsultationModalOpen = false;
    this.selectedConsultation = null;
  }

  closeHealthScanModal(): void {
    this.isHealthScanModalOpen = false;
    this.selectedHealthScan = null;
  }

  closeScheduleModal(): void {
    this.isScheduleModalOpen = false;
    this.selectedSchedule = null;
  }

  goBack(): void {
    this.router.navigate(['/admin/system-administration/patient-management']);
  }

  goToPatientManagement(): void {
    this.router.navigate(['/admin/system-administration/patient-management']);
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

  getPatientFullName(patient: Patient): string {
    return patient.patientInfo?.fullName || 'N/A';
  }

  getDoctorFullName(doctor: DoctorInfo): string {
    return `${doctor.firstName} ${doctor.lastName}`;
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

  getConsultationDuration(startTime: Date, endTime: Date | undefined): string {
    if (!endTime) return 'N/A';
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    return `${minutes} minutes`;
  }
}
