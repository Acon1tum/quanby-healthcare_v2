import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface HealthScan {
  id: number;
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
  consultation: {
    startTime: string;
    endTime?: string;
    doctor: {
      doctorInfo: {
        firstName: string;
        lastName: string;
        specialization: string;
      };
    };
  };
}

interface Consultation {
  id: number;
  startTime: string;
  endTime?: string;
  consultationLink: string;
  doctor: {
    doctorInfo: {
      firstName: string;
      lastName: string;
      specialization: string;
    };
  };
  healthScan?: HealthScan;
}

interface PatientInfo {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  weight: number;
  height: number;
  bloodType: string;
  medicalHistory?: string;
  allergies: string[];
  medications: string[];
  emergencyContact?: {
    contactName: string;
    relationship: string;
    contactNumber: string;
    contactAddress?: string;
  };
  insuranceInfo?: {
    providerName: string;
    policyNumber: string;
    insuranceContact: string;
  };
}

interface HealthTrends {
  [key: string]: { trend: string; change: number };
  heartRate: { trend: string; change: number };
  bloodPressure: { trend: string; change: number };
  spO2: { trend: string; change: number };
  weight: { trend: string; change: number };
  stressLevel: { trend: string; change: number };
  generalWellness: { trend: string; change: number };
}

interface MedicalRecords {
  patientInfo: PatientInfo;
  consultations: Consultation[];
  healthScans: HealthScan[];
  healthTrends: HealthTrends;
  summary: {
    totalConsultations: number;
    totalHealthScans: number;
    lastConsultation: string | null;
    lastHealthScan: string | null;
  };
}

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medical-records.component.html',
  styleUrl: './medical-records.component.scss'
})
export class MedicalRecordsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  medicalRecords: MedicalRecords | null = null;
  loading = false;
  error: string | null = null;
  selectedTab = 'overview';
  selectedHealthScan: HealthScan | null = null;
  selectedConsultation: Consultation | null = null;
  
  private userSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'PATIENT') {
        this.authService.redirectBasedOnRole();
        return;
      }
      this.loadMedicalRecords();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  async loadMedicalRecords(): Promise<void> {
    if (!this.currentUser) return;

    this.loading = true;
    this.error = null;

    try {
      const headers = this.authService.getAuthHeaders();
      const response = await this.http.get<{ success: boolean; data: MedicalRecords }>(
        `${environment.backendApi}/medical-records/patient/records`,
        { headers }
      ).toPromise();

      if (response?.success) {
        this.medicalRecords = response.data;
      } else {
        this.error = 'Failed to load medical records';
      }
    } catch (error: any) {
      console.error('Error loading medical records:', error);
      this.error = error.error?.message || 'Failed to load medical records';
    } finally {
      this.loading = false;
    }
  }

  onBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
  }

  viewHealthScan(scan: HealthScan): void {
    this.selectedHealthScan = scan;
  }

  viewConsultation(consultation: Consultation): void {
    this.selectedConsultation = consultation;
  }

  closeModal(): void {
    this.selectedHealthScan = null;
    this.selectedConsultation = null;
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return 'trending_up';
      case 'declining': return 'trending_down';
      case 'stable': return 'trending_flat';
      default: return 'help';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'danger';
      case 'stable': return 'info';
      default: return 'secondary';
    }
  }

  getBMICategory(weight: number, height: number): string {
    if (!weight || !height) return 'N/A';
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  getBMIValue(weight: number, height: number): string {
    if (!weight || !height) return 'N/A';
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRiskLevel(risk: number | undefined): { level: string; color: string } {
    if (!risk) return { level: 'N/A', color: 'secondary' };
    
    if (risk < 5) return { level: 'Low', color: 'success' };
    if (risk < 15) return { level: 'Moderate', color: 'warning' };
    return { level: 'High', color: 'danger' };
  }

  // Helper methods for template
  formatMetricName(metric: string): string {
    return metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    return `${durationMinutes} minutes`;
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // Could add a toast notification here
        console.log('Copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    }
  }
}
