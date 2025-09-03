import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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
  consultation: {
    startTime: string;
    endTime?: string;
    doctor?: {
      doctorInfo?: {
        firstName?: string;
        lastName?: string;
        specialization?: string;
      };
    };
  };
}

interface Consultation {
  id: number;
  startTime: string;
  endTime?: string;
  consultationCode: string;
  isPublic: boolean;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  followUpDate?: string;
  doctor?: {
    doctorInfo?: {
      firstName?: string;
      lastName?: string;
      specialization?: string;
    };
  };
  healthScan?: HealthScan;
}

// Medical Record Types from backend schema
enum MedicalRecordType {
  CONSULTATION_NOTES = 'CONSULTATION_NOTES',
  DIAGNOSIS = 'DIAGNOSIS',
  TREATMENT_PLAN = 'TREATMENT_PLAN',
  MEDICATION = 'MEDICATION',
  LAB_RESULTS = 'LAB_RESULTS',
  IMAGING_RESULTS = 'IMAGING_RESULTS',
  ALLERGIES = 'ALLERGIES',
  CHRONIC_CONDITIONS = 'CHRONIC_CONDITIONS',
  SURGICAL_HISTORY = 'SURGICAL_HISTORY',
  FAMILY_HISTORY = 'FAMILY_HISTORY',
  LIFESTYLE = 'LIFESTYLE',
  VACCINATIONS = 'VACCINATIONS'
}

enum PrivacySettingType {
  PUBLIC_READ = 'PUBLIC_READ',
  PUBLIC_WRITE = 'PUBLIC_WRITE',
  SHARED_SPECIFIC = 'SHARED_SPECIFIC',
  PATIENT_APPROVED = 'PATIENT_APPROVED',
  TIME_LIMITED = 'TIME_LIMITED',
  ROLE_BASED = 'ROLE_BASED'
}

interface MedicalRecordPrivacy {
  id: number;
  medicalRecordId: number;
  settingType: PrivacySettingType;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PatientMedicalHistory {
  id: number;
  patientId: number;
  consultationId?: number;
  recordType: MedicalRecordType;
  title: string;
  content: string;
  isPublic: boolean;
  isSensitive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    email: string;
    role: string;
    doctorInfo?: {
      firstName?: string;
      lastName?: string;
    };
  };
  privacySettings: MedicalRecordPrivacy[];
}

interface PatientInfo {
  id: number;
  userId: number;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  weight: number;
  height: number;
  bloodType: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  emergencyContact?: {
    id: number;
    patientId: number;
    contactName: string;
    relationship: string;
    contactNumber: string;
    contactAddress?: string;
  };
  insuranceInfo?: {
    id: number;
    patientId: number;
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
  medicalHistory: PatientMedicalHistory[];
  healthTrends: HealthTrends;
  summary: {
    totalConsultations: number;
    totalHealthScans: number;
    totalMedicalRecords: number;
    lastConsultation: string | null;
    lastHealthScan: string | null;
    lastMedicalRecord: string | null;
  };
}

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  selectedMedicalRecord: PatientMedicalHistory | null = null;
  
  // Graph and trends properties
  selectedMetric = 'heartRate';
  availableMetrics = [
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
    { key: 'bloodPressure', label: 'Blood Pressure', unit: 'mmHg' },
    { key: 'spO2', label: 'SpO2', unit: '%' },
    { key: 'weight', label: 'Weight', unit: 'kg' },
    { key: 'stressLevel', label: 'Stress Level', unit: '' },
    { key: 'generalWellness', label: 'General Wellness', unit: '' }
  ];
  
  // Expose enums to template
  MedicalRecordType = MedicalRecordType;
  PrivacySettingType = PrivacySettingType;
  
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
        `${environment.backendApi}/medical-records/patient/${this.currentUser.id}/summary`,
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

  selectMetric(metric: string): void {
    this.selectedMetric = metric;
  }

  getCurrentTrends(): HealthTrends {
    return this.calculateHealthTrends();
  }

  getSelectedMetricData(): { date: string; value: number | null }[] {
    return this.getTrendChartData(this.selectedMetric);
  }

  getSelectedMetricInfo(): { key: string; label: string; unit: string } {
    return this.availableMetrics.find(m => m.key === this.selectedMetric) || this.availableMetrics[0];
  }

  // Chart helper methods
  getChartPoints(): string {
    const data = this.getSelectedMetricData();
    if (data.length === 0) return '';

    const maxValue = this.getMaxValue();
    const minValue = this.getMinValue();
    const valueRange = maxValue - minValue;
    const chartHeight = 200; // SVG chart height
    const chartWidth = 700; // SVG chart width
    const padding = 50;

    return data.map((item, index) => {
      const x = padding + (index * (chartWidth / (data.length - 1)));
      const y = padding + chartHeight - ((item.value! - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  }

  getChartPointsArray(): { x: number; y: number }[] {
    const data = this.getSelectedMetricData();
    if (data.length === 0) return [];

    const maxValue = this.getMaxValue();
    const minValue = this.getMinValue();
    const valueRange = maxValue - minValue;
    const chartHeight = 200;
    const chartWidth = 700;
    const padding = 50;

    return data.map((item, index) => {
      const x = padding + (index * (chartWidth / (data.length - 1)));
      const y = padding + chartHeight - ((item.value! - minValue) / valueRange) * chartHeight;
      return { x, y };
    });
  }

  getMaxValue(): number {
    const data = this.getSelectedMetricData();
    if (data.length === 0) return 100;
    
    const values = data.map(item => item.value!).filter(val => val !== null);
    const max = Math.max(...values);
    
    // Add 10% padding to the top
    return Math.ceil(max * 1.1);
  }

  getMinValue(): number {
    const data = this.getSelectedMetricData();
    if (data.length === 0) return 0;
    
    const values = data.map(item => item.value!).filter(val => val !== null);
    const min = Math.min(...values);
    
    // Add 10% padding to the bottom, but don't go below 0
    return Math.max(0, Math.floor(min * 0.9));
  }

  formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  viewHealthScan(scan: HealthScan): void {
    this.selectedHealthScan = scan;
  }

  viewConsultation(consultation: Consultation): void {
    this.selectedConsultation = consultation;
  }

  viewMedicalRecord(record: PatientMedicalHistory): void {
    this.selectedMedicalRecord = record;
  }

  closeModal(): void {
    this.selectedHealthScan = null;
    this.selectedConsultation = null;
    this.selectedMedicalRecord = null;
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

  // Helper methods for medical records
  getRecordTypeIcon(recordType: MedicalRecordType): string {
    switch (recordType) {
      case MedicalRecordType.CONSULTATION_NOTES: return 'notes';
      case MedicalRecordType.DIAGNOSIS: return 'medical_services';
      case MedicalRecordType.TREATMENT_PLAN: return 'assignment';
      case MedicalRecordType.MEDICATION: return 'medication';
      case MedicalRecordType.LAB_RESULTS: return 'science';
      case MedicalRecordType.IMAGING_RESULTS: return 'photo_camera';
      case MedicalRecordType.ALLERGIES: return 'warning';
      case MedicalRecordType.CHRONIC_CONDITIONS: return 'healing';
      case MedicalRecordType.SURGICAL_HISTORY: return 'medical_information';
      case MedicalRecordType.FAMILY_HISTORY: return 'family_restroom';
      case MedicalRecordType.LIFESTYLE: return 'fitness_center';
      case MedicalRecordType.VACCINATIONS: return 'vaccines';
      default: return 'description';
    }
  }

  getRecordTypeColor(recordType: MedicalRecordType): string {
    switch (recordType) {
      case MedicalRecordType.CONSULTATION_NOTES: return 'primary';
      case MedicalRecordType.DIAGNOSIS: return 'danger';
      case MedicalRecordType.TREATMENT_PLAN: return 'success';
      case MedicalRecordType.MEDICATION: return 'warning';
      case MedicalRecordType.LAB_RESULTS: return 'info';
      case MedicalRecordType.IMAGING_RESULTS: return 'secondary';
      case MedicalRecordType.ALLERGIES: return 'danger';
      case MedicalRecordType.CHRONIC_CONDITIONS: return 'warning';
      case MedicalRecordType.SURGICAL_HISTORY: return 'info';
      case MedicalRecordType.FAMILY_HISTORY: return 'secondary';
      case MedicalRecordType.LIFESTYLE: return 'success';
      case MedicalRecordType.VACCINATIONS: return 'primary';
      default: return 'secondary';
    }
  }

  formatRecordType(recordType: MedicalRecordType): string {
    return recordType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getPrivacyIcon(isPublic: boolean, isSensitive: boolean): string {
    if (isSensitive) return 'lock';
    if (isPublic) return 'public';
    return 'visibility_off';
  }

  getPrivacyColor(isPublic: boolean, isSensitive: boolean): string {
    if (isSensitive) return 'danger';
    if (isPublic) return 'success';
    return 'warning';
  }

  getPrivacyText(isPublic: boolean, isSensitive: boolean): string {
    if (isSensitive) return 'Sensitive';
    if (isPublic) return 'Public';
    return 'Private';
  }

  // Parse allergies and medications from strings
  parseStringArray(str: string | undefined): string[] {
    if (!str) return [];
    return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  // Format privacy setting type for display
  formatPrivacySettingType(settingType: string): string {
    return settingType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Format medical record content for better readability
  formatMedicalRecordContent(content: string, recordType: MedicalRecordType): string {
    try {
      // Check if this is a health scan result with JSON data
      if (recordType === MedicalRecordType.CONSULTATION_NOTES && content.includes('[') && content.includes('{')) {
        // Extract JSON part from the content
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonPart = content.substring(jsonStart, jsonEnd);
          const parsedContent = JSON.parse(jsonPart);
          
          if (Array.isArray(parsedContent)) {
            // Get the description part before the JSON
            const description = content.substring(0, jsonStart).trim();
            return this.formatHealthScanResults(parsedContent, description);
          }
        }
      }
      
      // For other content types, return as is but with basic formatting
      return content.replace(/\n/g, '<br>');
    } catch (error) {
      // If parsing fails, return original content with basic formatting
      return content.replace(/\n/g, '<br>');
    }
  }

  // Format health scan results into readable format
  private formatHealthScanResults(results: any[], description?: string): string {
    if (!Array.isArray(results) || results.length === 0) {
      return '<div class="health-scan-results"><p class="no-data">No health scan data available.</p></div>';
    }

    let formattedContent = `
      <div class="health-scan-results">
        <div class="scan-header">
          <h3>Self-Check Health Scan Results</h3>
          <p class="scan-summary">${description || `Comprehensive health assessment with ${results.length} vital signs measured`}</p>
        </div>
        <div class="health-scan-table-container">
          <table class="health-scan-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Status</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    results.forEach((result, index) => {
      if (result.title && result.value) {
        const statusClass = this.getStatusClass(result.status);
        const statusIcon = this.getStatusIcon(result.status);
        
        formattedContent += `
              <tr>
                <td class="metric-cell">
                  <div class="metric-info">
                    <div class="metric-name">${result.title}</div>
                    ${result.description ? `<div class="metric-description">${result.description}</div>` : ''}
                  </div>
                </td>
                <td class="value-cell">${result.value}</td>
                <td class="status-cell">
                  <span class="status-badge ${statusClass}">
                    <i class="material-icons">${statusIcon}</i>
                    ${result.status || 'Good'}
                  </span>
                </td>
                <td class="category-cell">${result.category || 'unknown'}</td>
              </tr>
        `;
      }
    });
    
    formattedContent += `
            </tbody>
          </table>
        </div>
        <div class="scan-footer">
          <p class="scan-note">Results based on advanced facial analysis technology</p>
        </div>
      </div>
    `;
    return formattedContent;
  }

  // Get appropriate icon for each metric
  private getMetricIcon(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('heart') || titleLower.includes('hrv')) return 'favorite';
    if (titleLower.includes('oxygen') || titleLower.includes('spo2')) return 'air';
    if (titleLower.includes('respiratory') || titleLower.includes('breathing')) return 'air';
    if (titleLower.includes('stress')) return 'psychology';
    if (titleLower.includes('blood pressure') || titleLower.includes('pressure')) return 'monitor_heart';
    if (titleLower.includes('temperature')) return 'thermostat';
    return 'monitor_heart';
  }

  // Get status class for styling
  private getStatusClass(status: string): string {
    if (!status) return 'status-normal';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good') || statusLower.includes('normal') || statusLower.includes('excellent')) return 'status-good';
    if (statusLower.includes('fair') || statusLower.includes('moderate')) return 'status-fair';
    if (statusLower.includes('poor') || statusLower.includes('high') || statusLower.includes('low')) return 'status-poor';
    return 'status-normal';
  }

  // Get status icon
  private getStatusIcon(status: string): string {
    if (!status) return 'check_circle';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good') || statusLower.includes('normal') || statusLower.includes('excellent')) return 'check_circle';
    if (statusLower.includes('fair') || statusLower.includes('moderate')) return 'warning';
    if (statusLower.includes('poor') || statusLower.includes('high') || statusLower.includes('low')) return 'error';
    return 'check_circle';
  }

  // Check if content is JSON format
  isJsonContent(content: string): boolean {
    try {
      // Check if content contains JSON array or object
      if (content.includes('[') && content.includes('{')) {
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonPart = content.substring(jsonStart, jsonEnd);
          JSON.parse(jsonPart);
          return true;
        }
      }
      
      // Check if entire content is JSON
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  // Helper method to safely get doctor name
  getDoctorName(doctor: any): string {
    if (!doctor?.doctorInfo) {
      return 'Dr. Unknown Doctor';
    }
    const firstName = doctor.doctorInfo.firstName || 'Unknown';
    const lastName = doctor.doctorInfo.lastName || 'Doctor';
    return `Dr. ${firstName} ${lastName}`;
  }

  // Helper method to safely get doctor specialization
  getDoctorSpecialization(doctor: any): string {
    return doctor?.doctorInfo?.specialization || 'General Practice';
  }

  // Calculate health trends from health scan data
  calculateHealthTrends(): HealthTrends {
    if (!this.medicalRecords?.healthScans || this.medicalRecords.healthScans.length < 2) {
      // Return default trends if not enough data
      return {
        heartRate: { trend: 'stable', change: 0 },
        bloodPressure: { trend: 'stable', change: 0 },
        spO2: { trend: 'stable', change: 0 },
        weight: { trend: 'stable', change: 0 },
        stressLevel: { trend: 'stable', change: 0 },
        generalWellness: { trend: 'stable', change: 0 }
      };
    }

    // Sort health scans by date (most recent first)
    const sortedScans = [...this.medicalRecords.healthScans].sort((a, b) => 
      new Date(b.consultation.startTime).getTime() - new Date(a.consultation.startTime).getTime()
    );

    const trends: HealthTrends = {
      heartRate: this.calculateMetricTrend(sortedScans, 'heartRate'),
      bloodPressure: this.calculateMetricTrend(sortedScans, 'bloodPressure'),
      spO2: this.calculateMetricTrend(sortedScans, 'spO2'),
      weight: this.calculateMetricTrend(sortedScans, 'weight'),
      stressLevel: this.calculateMetricTrend(sortedScans, 'stressLevel'),
      generalWellness: this.calculateMetricTrend(sortedScans, 'generalWellness')
    };

    return trends;
  }

  // Calculate trend for a specific metric
  private calculateMetricTrend(scans: HealthScan[], metric: string): { trend: string; change: number } {
    const validScans = scans.filter(scan => {
      const value = (scan as any)[metric];
      return value !== null && value !== undefined && value !== '';
    });

    if (validScans.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    // Get the most recent and oldest values
    const latest = (validScans[0] as any)[metric];
    const oldest = (validScans[validScans.length - 1] as any)[metric];

    // Handle different metric types
    let change = 0;
    let trend = 'stable';

    if (typeof latest === 'number' && typeof oldest === 'number') {
      if (oldest !== 0) {
        change = ((latest - oldest) / oldest) * 100;
      } else {
        change = latest > 0 ? 100 : 0;
      }
    } else if (typeof latest === 'string' && typeof oldest === 'string') {
      // For string values like blood pressure, try to extract numeric values
      const latestNum = this.extractNumericValue(latest);
      const oldestNum = this.extractNumericValue(oldest);
      
      if (latestNum !== null && oldestNum !== null && oldestNum !== 0) {
        change = ((latestNum - oldestNum) / oldestNum) * 100;
      }
    }

    // Determine trend direction
    if (change > 5) {
      trend = 'improving';
    } else if (change < -5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return { trend, change: Math.round(change * 10) / 10 };
  }

  // Extract numeric value from string (e.g., "120/80" -> 120)
  private extractNumericValue(value: string): number | null {
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  // Get trend data for charting
  getTrendChartData(metric: string): { date: string; value: number | null }[] {
    if (!this.medicalRecords?.healthScans) {
      return [];
    }

    const sortedScans = [...this.medicalRecords.healthScans].sort((a, b) => 
      new Date(a.consultation.startTime).getTime() - new Date(b.consultation.startTime).getTime()
    );

    return sortedScans.map(scan => {
      const value = (scan as any)[metric];
      let numericValue: number | null = null;

      if (typeof value === 'number') {
        numericValue = value;
      } else if (typeof value === 'string') {
        numericValue = this.extractNumericValue(value);
      }

      return {
        date: this.formatDate(scan.consultation.startTime),
        value: numericValue
      };
    }).filter(item => item.value !== null);
  }

  // Get content preview for cards
  getContentPreview(content: string, recordType: MedicalRecordType): string {
    try {
      // Check if this is a health scan result with JSON data
      if (recordType === MedicalRecordType.CONSULTATION_NOTES && content.includes('[') && content.includes('{')) {
        // Extract JSON part from the content
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonPart = content.substring(jsonStart, jsonEnd);
          const parsedContent = JSON.parse(jsonPart);
          
          if (Array.isArray(parsedContent) && parsedContent.length > 0) {
            // Get the description part before the JSON
            const description = content.substring(0, jsonStart).trim();
            const metricsCount = parsedContent.length;
            const firstMetric = parsedContent[0];
            
            if (description) {
              return `${description} (${metricsCount} health metrics measured)`;
            } else {
              return `Health scan results: ${firstMetric.title || 'Multiple metrics'} - ${firstMetric.value || 'Data available'} (${metricsCount} total metrics)`;
            }
          }
        }
      }
      
      // For other content types, return first 150 characters
      return content.length > 150 ? content.substring(0, 150) + '...' : content;
    } catch {
      // If parsing fails, return original content with basic formatting
      return content.length > 150 ? content.substring(0, 150) + '...' : content;
    }
  }
}
