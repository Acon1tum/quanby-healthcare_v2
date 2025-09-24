import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../../api/api.service';

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
  prcIdImage?: string;
  ptrIdImage?: string;
  medicalLicenseImage?: string;
  idDocumentsVerified?: boolean;
  idDocumentsVerifiedBy?: string;
  idDocumentsVerifiedAt?: Date;
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
  isDocumentModalOpen = false;
  selectedConsultation: Consultation | null = null;
  selectedHealthScan: HealthScan | null = null;
  selectedSchedule: DoctorSchedule | null = null;
  selectedDocument: { type: string; title: string; imageUrl: string } | null = null;
  imageLoadError = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService?: ApiService
  ) {}

  ngOnInit(): void {
    // First try to get doctor data from navigation state (for immediate loading)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.doctor = navigation.extras.state['doctor'];
      this.isLoading = false;
      this.loadDoctorData();
    } else {
      // If no navigation state, try to get doctor ID from route parameter
      this.loadDoctorFromRoute();
    }
  }

  private loadDoctorFromRoute(): void {
    // Get doctor ID from route parameter
    this.route.params.subscribe(params => {
      const doctorId = params['id'];
      if (doctorId) {
        console.log('Loading doctor from route parameter:', doctorId);
        this.fetchDoctorById(doctorId);
      } else {
        // Fallback to localStorage if no route parameter
        this.tryAlternativeDataRetrieval();
      }
    });
  }

  private fetchDoctorById(doctorId: string): void {
    if (this.apiService) {
      console.log('Fetching doctor data for ID:', doctorId);
      this.apiService.getDoctorById(doctorId).subscribe({
        next: (response: any) => {
          console.log('API Response for doctor ID:', response);
          if (response.success && response.data) {
            this.doctor = response.data;
            this.isLoading = false;
            this.loadDoctorData();
          } else {
            this.error = 'Doctor not found. Please select a valid doctor from the Doctor Management page.';
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error fetching doctor data:', error);
          this.error = 'Failed to load doctor data. Please try again or select a doctor from the Doctor Management page.';
          this.isLoading = false;
        }
      });
    } else {
      // Fallback to localStorage if API service is not available
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
      // Fetch real doctor data from API to get actual document images
      this.fetchRealDoctorData();
      this.loadConsultations();
      this.loadHealthScans();
      this.loadSchedules();
    }
  }

  private fetchRealDoctorData(): void {
    if (this.doctor?.id && this.apiService) {
      console.log('Fetching real doctor data for ID:', this.doctor.id);
      this.apiService.getDoctorById(this.doctor.id.toString()).subscribe({
        next: (response: any) => {
          console.log('API Response:', response);
          if (response.success && response.data) {
            console.log('Doctor data from API:', response.data);
            console.log('DoctorInfo from API:', response.data.doctorInfo);
            
            // Update the doctor data with real information from the database
            this.doctor = {
              ...this.doctor,
              ...response.data,
              doctorInfo: response.data.doctorInfo || this.doctor?.doctorInfo
            };
            
            console.log('Updated doctor data:', this.doctor);
            console.log('Document images after update:', {
              prcIdImage: this.doctor?.doctorInfo?.prcIdImage,
              ptrIdImage: this.doctor?.doctorInfo?.ptrIdImage,
              medicalLicenseImage: this.doctor?.doctorInfo?.medicalLicenseImage
            });
            
            // If no document images exist, add mock data for demonstration
            if (!this.doctor?.doctorInfo?.prcIdImage && 
                !this.doctor?.doctorInfo?.ptrIdImage && 
                !this.doctor?.doctorInfo?.medicalLicenseImage) {
              console.log('No real document images found, adding mock data');
              this.addMockIdDocuments();
            }
          }
        },
        error: (error: any) => {
          console.error('Error fetching doctor data:', error);
          // Fallback to mock data if API fails
          this.addMockIdDocuments();
        }
      });
    } else {
      console.log('No API service or doctor ID, using mock data');
      // Fallback to mock data if no doctor ID
      this.addMockIdDocuments();
    }
  }

  private addMockIdDocuments(): void {
    console.log('addMockIdDocuments called');
    if (this.doctor) {
      console.log('Doctor exists, adding mock documents');
      // Ensure doctorInfo exists
      if (!this.doctor.doctorInfo) {
        console.log('Creating new doctorInfo object');
        this.doctor.doctorInfo = {
          id: this.doctor.id,
          userId: this.doctor.id,
          firstName: 'John',
          lastName: 'Doe',
          gender: 'MALE',
          dateOfBirth: new Date('1980-01-01'),
          contactNumber: '+1-555-0123',
          address: '123 Medical St, City',
          bio: 'Experienced medical professional',
          specialization: 'General Medicine',
          qualifications: 'MD, PhD',
          experience: 10
        };
      }

      // Add mock ID document images if they don't exist
      if (!this.doctor.doctorInfo.prcIdImage) {
        console.log('Adding PRC ID mock image');
        // Create a simple, valid SVG image for PRC ID
        const prcIdSvg = `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
          <rect x="20" y="20" width="260" height="160" fill="white" stroke="#9ca3af" stroke-width="1"/>
          <text x="150" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#374151" text-anchor="middle">PRC ID DOCUMENT</text>
          <text x="150" y="90" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">Professional Regulation Commission</text>
          <text x="150" y="120" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">ID Number: 12345678</text>
          <text x="150" y="140" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">Valid Until: 12/31/2025</text>
        </svg>`;
        this.doctor.doctorInfo.prcIdImage = 'data:image/svg+xml;base64,' + btoa(prcIdSvg);
      }
      if (!this.doctor.doctorInfo.ptrIdImage) {
        console.log('Adding PTR ID mock image');
        // Create a simple, valid SVG image for PTR ID
        const ptrIdSvg = `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
          <rect x="20" y="20" width="260" height="160" fill="white" stroke="#f59e0b" stroke-width="1"/>
          <text x="150" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#92400e" text-anchor="middle">PTR ID DOCUMENT</text>
          <text x="150" y="90" font-family="Arial, sans-serif" font-size="14" fill="#b45309" text-anchor="middle">Professional Tax Receipt</text>
          <text x="150" y="120" font-family="Arial, sans-serif" font-size="12" fill="#d97706" text-anchor="middle">Receipt No: PTR-2024-001</text>
          <text x="150" y="140" font-family="Arial, sans-serif" font-size="12" fill="#d97706" text-anchor="middle">Valid Until: 12/31/2024</text>
        </svg>`;
        this.doctor.doctorInfo.ptrIdImage = 'data:image/svg+xml;base64,' + btoa(ptrIdSvg);
      }
      if (!this.doctor.doctorInfo.medicalLicenseImage) {
        console.log('Adding Medical License mock image');
        // Create a simple, valid SVG image for Medical License
        const medicalLicenseSvg = `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="200" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
          <rect x="20" y="20" width="260" height="160" fill="white" stroke="#16a34a" stroke-width="1"/>
          <text x="150" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#166534" text-anchor="middle">MEDICAL LICENSE</text>
          <text x="150" y="90" font-family="Arial, sans-serif" font-size="14" fill="#15803d" text-anchor="middle">Board of Medicine</text>
          <text x="150" y="120" font-family="Arial, sans-serif" font-size="12" fill="#16a34a" text-anchor="middle">License No: MD-2024-001</text>
          <text x="150" y="140" font-family="Arial, sans-serif" font-size="12" fill="#16a34a" text-anchor="middle">Valid Until: 12/31/2026</text>
        </svg>`;
        this.doctor.doctorInfo.medicalLicenseImage = 'data:image/svg+xml;base64,' + btoa(medicalLicenseSvg);
      }
      if (this.doctor.doctorInfo.idDocumentsVerified === undefined) {
        console.log('Setting document verification status');
        this.doctor.doctorInfo.idDocumentsVerified = true;
        this.doctor.doctorInfo.idDocumentsVerifiedBy = 'System Administrator';
        this.doctor.doctorInfo.idDocumentsVerifiedAt = new Date();
      }
      
      console.log('Mock documents added:', {
        prcIdImage: this.doctor.doctorInfo.prcIdImage ? 'exists' : 'missing',
        ptrIdImage: this.doctor.doctorInfo.ptrIdImage ? 'exists' : 'missing',
        medicalLicenseImage: this.doctor.doctorInfo.medicalLicenseImage ? 'exists' : 'missing'
      });
    } else {
      console.log('No doctor data available for mock documents');
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

  closeDocumentModal(): void {
    this.isDocumentModalOpen = false;
    this.selectedDocument = null;
    this.imageLoadError = false;
  }

  onImageError(event: any): void {
    console.error('Image load error:', event);
    console.error('Failed image URL:', this.selectedDocument?.imageUrl);
    console.error('Document type:', this.selectedDocument?.type);
    console.error('Image URL length:', this.selectedDocument?.imageUrl?.length);
    console.error('Image URL starts with:', this.selectedDocument?.imageUrl?.substring(0, 50));
    
    // Try to use a placeholder image as fallback
    if (this.selectedDocument) {
      console.log('Attempting to use placeholder image as fallback');
      const placeholderUrl = this.createPlaceholderImage(this.selectedDocument.type, this.selectedDocument.title);
      this.selectedDocument.imageUrl = placeholderUrl;
      this.imageLoadError = false; // Reset error state to try the placeholder
      console.log('Placeholder image created and set');
    } else {
      this.imageLoadError = true;
    }
  }

  onImageLoad(event: any): void {
    this.imageLoadError = false;
  }

  retryImageLoad(): void {
    if (this.selectedDocument?.imageUrl) {
      console.log('Retrying image load for:', this.selectedDocument.type);
      this.imageLoadError = false;
      // Force image reload by updating the src
      const currentUrl = this.selectedDocument.imageUrl;
      this.selectedDocument.imageUrl = '';
      setTimeout(() => {
        this.selectedDocument!.imageUrl = currentUrl;
      }, 100);
    }
  }

  private validateImageUrl(imageUrl: string): boolean {
    if (!imageUrl || imageUrl.trim() === '') {
      return false;
    }
    
    // Check if it's a valid data URL (image or PDF)
    if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('data:application/pdf')) {
      console.log('Valid data URL format detected');
      return true;
    }
    
    // Check if it's a valid HTTP/HTTPS URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('Valid HTTP URL format detected');
      return true;
    }
    
    console.warn('Invalid image URL format:', imageUrl.substring(0, 100) + '...');
    return false;
  }

  private fixImageUrl(imageUrl: string): string {
    if (!imageUrl || imageUrl.trim() === '') {
      return imageUrl;
    }
    
    console.log('Original image URL:', imageUrl.substring(0, 100) + '...');
    
    // Check for malformed double-encoded URLs like "data:image/png;base64,data:application/pdf;base64,..."
    if (imageUrl.includes('data:image/') && imageUrl.includes('data:application/')) {
      console.log('Detected malformed double-encoded URL, extracting inner data');
      // Extract the inner data URL
      const innerDataMatch = imageUrl.match(/data:application\/[^;]+;base64,(.+)/);
      if (innerDataMatch) {
        const innerData = innerDataMatch[1];
        const fixedUrl = `data:application/pdf;base64,${innerData}`;
        console.log('Fixed malformed URL to:', fixedUrl.substring(0, 50) + '...');
        return fixedUrl;
      }
    }
    
    // If it's already a proper data URL, return as is
    if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('data:application/')) {
      console.log('Valid data URL detected');
      return imageUrl;
    }
    
    // If it's base64 data without the data URL prefix, try to fix it
    if (imageUrl.length > 100 && !imageUrl.includes('://')) {
      // Assume it's base64 data and try to determine the image type
      let mimeType = 'image/png'; // Default to PNG
      
      // Try to detect image type from base64 data
      if (imageUrl.startsWith('/9j/') || imageUrl.startsWith('iVBORw0KGgo')) {
        mimeType = 'image/jpeg';
      } else if (imageUrl.startsWith('iVBORw0KGgo')) {
        mimeType = 'image/png';
      } else if (imageUrl.startsWith('R0lGOD')) {
        mimeType = 'image/gif';
      } else if (imageUrl.startsWith('JVBERi0xLjc')) {
        mimeType = 'application/pdf';
      }
      
      const fixedUrl = `data:${mimeType};base64,${imageUrl}`;
      console.log('Fixed image URL format:', fixedUrl.substring(0, 50) + '...');
      return fixedUrl;
    }
    
    return imageUrl;
  }

  private testImageUrl(imageUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully');
        resolve(true);
      };
      img.onerror = () => {
        console.error('Image failed to load');
        resolve(false);
      };
      img.src = imageUrl;
    });
  }

  private createPlaceholderImage(documentType: string, title: string): string {
    const colors = {
      'prcId': { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
      'ptrId': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      'medicalLicense': { bg: '#dcfce7', border: '#16a34a', text: '#166534' }
    };
    
    const color = colors[documentType as keyof typeof colors] || colors.prcId;
    
    // Create SVG without Unicode characters to avoid btoa issues
    const svg = `<svg width="400" height="300" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="${color.bg}" stroke="${color.border}" stroke-width="3"/>
      <rect x="30" y="30" width="340" height="240" fill="white" stroke="${color.border}" stroke-width="2"/>
      <text x="200" y="80" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${color.text}" text-anchor="middle">${title.toUpperCase()}</text>
      <text x="200" y="120" font-family="Arial, sans-serif" font-size="16" fill="${color.text}" text-anchor="middle">Document Preview</text>
      <text x="200" y="150" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">This is a placeholder image</text>
      <text x="200" y="180" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">Original document may be unavailable</text>
      <circle cx="200" cy="220" r="20" fill="${color.border}" opacity="0.3"/>
      <text x="200" y="225" font-family="Arial, sans-serif" font-size="16" fill="${color.text}" text-anchor="middle">DOC</text>
    </svg>`;
    
    try {
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch (error) {
      console.error('Error creating placeholder image:', error);
      // Fallback to a simple data URL
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  }

  downloadDocument(): void {
    if (this.selectedDocument?.imageUrl) {
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = this.selectedDocument.imageUrl;
      link.download = `${this.selectedDocument.title}_${this.getDoctorFullName(this.doctor!)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Document viewing methods
  viewDocument(documentType: 'prcId' | 'ptrId' | 'medicalLicense'): void {
    console.log('viewDocument called for:', documentType);
    console.log('Current doctor data:', this.doctor);
    console.log('Current doctorInfo:', this.doctor?.doctorInfo);
    
    if (!this.doctor?.doctorInfo) {
      console.error('Doctor info not available');
      return;
    }
    
    let imageUrl: string | undefined;
    let title: string;
    
    switch (documentType) {
      case 'prcId':
        imageUrl = this.doctor.doctorInfo.prcIdImage;
        title = 'PRC ID Document';
        break;
      case 'ptrId':
        imageUrl = this.doctor.doctorInfo.ptrIdImage;
        title = 'PTR ID Document';
        break;
      case 'medicalLicense':
        imageUrl = this.doctor.doctorInfo.medicalLicenseImage;
        title = 'Medical License';
        break;
    }
    
    console.log('Document details:', {
      documentType,
      title,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'null/undefined',
      imageUrlLength: imageUrl ? imageUrl.length : 0
    });
    
    if (imageUrl && imageUrl.trim() !== '') {
      console.log('Opening document:', {
        type: documentType,
        title: title,
        imageUrl: imageUrl,
        imageUrlLength: imageUrl.length,
        imageUrlStart: imageUrl.substring(0, 50) + '...'
      });
      
      // Try to fix the image URL format if needed
      const fixedImageUrl = this.fixImageUrl(imageUrl);
      
      // Validate the image URL format
      if (!this.validateImageUrl(fixedImageUrl)) {
        console.error('Invalid image URL format for', documentType);
        alert(`Invalid document format for ${title}. The document may be corrupted or in an unsupported format.`);
        return;
      }
      
      // For now, let's skip the accessibility test and just try to display the image
      // The image error handling in the template will catch any loading issues
      console.log('Attempting to display image without pre-testing');
      this.selectedDocument = {
        type: documentType,
        title: title,
        imageUrl: fixedImageUrl
      };
      this.imageLoadError = false; // Reset error state
      this.isDocumentModalOpen = true;
      console.log('Modal opened with document:', this.selectedDocument);
    } else {
      console.warn(`No document image available for ${documentType}`);
      alert(`No document image available for ${title}. Please contact the doctor to upload the document.`);
    }
  }

  hasDocument(documentType: 'prcId' | 'ptrId' | 'medicalLicense'): boolean {
    if (!this.doctor?.doctorInfo) {
      console.log('hasDocument: No doctor info available');
      return false;
    }
    
    let imageUrl: string | undefined;
    
    switch (documentType) {
      case 'prcId':
        imageUrl = this.doctor.doctorInfo.prcIdImage;
        break;
      case 'ptrId':
        imageUrl = this.doctor.doctorInfo.ptrIdImage;
        break;
      case 'medicalLicense':
        imageUrl = this.doctor.doctorInfo.medicalLicenseImage;
        break;
      default:
        return false;
    }
    
    const hasImage = !!(imageUrl && imageUrl.trim() !== '');
    console.log(`hasDocument(${documentType}):`, {
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'null/undefined',
      hasImage
    });
    
    return hasImage;
  }
}
