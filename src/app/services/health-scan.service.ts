import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HealthScanData {
  // Vital Signs
  heartRate?: number;
  bloodPressure?: string;
  spO2?: number;
  respiratoryRate?: number;
  stressLevel?: number;
  stressScore?: number;
  hrvSdnn?: number;
  hrvRmsdd?: number;
  generalWellness?: number;

  // Health Risk Assessment
  generalRisk?: number;
  coronaryHeartDisease?: number;
  congestiveHeartFailure?: number;
  intermittentClaudication?: number;
  strokeRisk?: number;

  // COVID-19 Risk
  covidRisk?: number;

  // Health Parameters
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

export interface SaveHealthScanRequest {
  healthData: HealthScanData;
  scanType: 'face-scan' | 'self-check' | 'manual';
  timestamp?: string;
  notes?: string;
}

export interface SaveHealthScanResponse {
  success: boolean;
  message: string;
  data?: {
    consultationId: number;
    healthScanId: number;
  };
}

export interface FaceScanResult {
  title: string;
  description: string;
  score: number;
  value: string;
  category: string;
  status: string;
  color: string;
  normalRange?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthScanService {
  private readonly API_URL = `${environment.backendApi}/self-check`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Save face scan results to database
   */
  saveFaceScanResults(scanResults: FaceScanResult[], userAge?: number, userGender?: string): Observable<SaveHealthScanResponse> {
    const healthData = this.mapFaceScanResultsToHealthData(scanResults, userAge, userGender);
    
    // The backend expects healthData, scanResults, scanType, and timestamp
    const request = {
      healthData,
      scanResults, // Include the original scan results
      scanType: 'face-scan',
      timestamp: new Date().toISOString(),
      notes: 'Face scan health assessment performed using AI facial analysis'
    };

    console.log('🔍 Health Scan Service - Sending request:', {
      apiUrl: `${this.API_URL}/save`,
      requestData: request,
      healthDataKeys: Object.keys(healthData),
      healthDataValues: Object.values(healthData),
      scanResultsCount: scanResults.length,
      headers: this.getHeaders()
    });

    return this.http.post<SaveHealthScanResponse>(
      `${this.API_URL}/save`,
      request,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Map face scan results to HealthScan database format
   */
  private mapFaceScanResultsToHealthData(scanResults: FaceScanResult[], userAge?: number, userGender?: string): HealthScanData {
    const healthData: HealthScanData = {};

    console.log('🔍 Mapping face scan results to health data:', {
      scanResultsCount: scanResults.length,
      userAge,
      userGender,
      scanResults: scanResults.map(r => ({ category: r.category, value: r.value, score: r.score }))
    });

    // Process each scan result and map to appropriate database fields
    scanResults.forEach(result => {
      const category = result.category;
      const score = result.score;
      const value = this.extractNumericValue(result.value);

      switch (category) {
        case 'heartRate':
          healthData.heartRate = value;
          break;
        
        case 'systolicPressure':
          // Store systolic pressure for blood pressure calculation
          if (!healthData.bloodPressure) {
            healthData.bloodPressure = `${value}/`;
          } else {
            healthData.bloodPressure = `${value}${healthData.bloodPressure.split('/')[1]}`;
          }
          break;
        
        case 'diastolicPressure':
          // Complete blood pressure string
          if (!healthData.bloodPressure) {
            healthData.bloodPressure = `/${value}`;
          } else {
            healthData.bloodPressure = `${healthData.bloodPressure.split('/')[0]}/${value}`;
          }
          break;
        
        case 'oxygenSaturation':
          healthData.spO2 = value;
          break;
        
        case 'respiratoryRate':
          healthData.respiratoryRate = value;
          break;
        
        case 'stress':
        case 'stressLevel':
          healthData.stressLevel = value;
          break;
        
        case 'stressScore':
          healthData.stressScore = value;
          break;
        
        case 'hrvSdnn':
          healthData.hrvSdnn = value;
          break;
        
        case 'hrvRmssd':
          healthData.hrvRmsdd = value;
          break;
        
        case 'overall':
          healthData.generalWellness = value;
          break;
        
        case 'coronaryRisk':
        case 'coronaryHeartDisease':
          healthData.coronaryHeartDisease = value / 100; // Convert percentage to decimal
          break;
        
        case 'heartFailureRisk':
        case 'congestiveHeartFailure':
          healthData.congestiveHeartFailure = value / 100; // Convert percentage to decimal
          break;
        
        case 'strokeRisk':
          healthData.strokeRisk = value / 100; // Convert percentage to decimal
          break;
        
        case 'cvdRisk':
        case 'generalRisk':
          healthData.generalRisk = value / 100; // Convert percentage to decimal
          break;
        
        case 'intermittentClaudication':
          healthData.intermittentClaudication = value / 100; // Convert percentage to decimal
          break;
        
        case 'covidRisk':
          healthData.covidRisk = value / 100; // Convert percentage to decimal
          break;
      }
    });

    // Add user demographic data if available
    if (userAge) {
      // Age can be used for risk calculations but isn't stored directly in HealthScan
      // It's stored in PatientInfo instead
    }

    if (userGender) {
      // Gender is stored in PatientInfo, not HealthScan
    }

    console.log('✅ Mapped health data result:', healthData);
    return healthData;
  }

  /**
   * Extract numeric value from result value string
   */
  private extractNumericValue(valueString: string): number {
    // Remove units and extract number
    const match = valueString.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Get health scan history for current user
   */
  getHealthScanHistory(): Observable<any> {
    return this.http.get(
      `${this.API_URL}/history`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get specific health scan by ID
   */
  getHealthScan(scanId: number): Observable<any> {
    return this.http.get(
      `${this.API_URL}/${scanId}`,
      { headers: this.getHeaders() }
    );
  }
}
