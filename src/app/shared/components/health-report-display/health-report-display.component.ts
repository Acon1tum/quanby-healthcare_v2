import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HealthScanResults {
  vitalSigns: {
    heartRate: number;
    spo2: number;
    respiratoryRate: number;
    stress: number;
    stressScore: number;
    hrvSdnn: number;
    hrvRmssd: number;
    bloodPressure: string;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
  };
  holisticHealth: {
    generalWellness: number;
  };
  risks: {
    cardiovascularRisks: {
      generalRisk: number;
      coronaryHeartDisease: number;
      congestiveHeartFailure: number;
      intermittentClaudication: number;
      stroke: number;
    };
    covidRisk: {
      covidRisk: number;
    };
    diabetesRisk: number | null;
    hypertensionRisk: number | null;
  };
}

@Component({
  selector: 'app-health-report-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="health-report" *ngIf="results">
      <div class="report-header">
        <h2>HEALTH REPORT</h2>
      </div>
      
      <!-- Cardiovascular Section -->
      <div class="report-section" *ngIf="results.risks?.cardiovascularRisks">
        <h3>Cardiovascular</h3>
        <div class="risk-item" *ngIf="results.risks.cardiovascularRisks.congestiveHeartFailure !== undefined">
          <span class="risk-label">Risk of Congestive Heart Failure</span>
          <span class="risk-value" [ngClass]="getRiskClass(results.risks.cardiovascularRisks.congestiveHeartFailure)">
            {{ getRiskText(results.risks.cardiovascularRisks.congestiveHeartFailure) }}
          </span>
          <span class="risk-percentage">{{ (results.risks.cardiovascularRisks.congestiveHeartFailure * 100).toFixed(1) }}%</span>
        </div>
        <div class="risk-item" *ngIf="results.risks.cardiovascularRisks.coronaryHeartDisease !== undefined">
          <span class="risk-label">Risk of Coronary Heart Disease</span>
          <span class="risk-value" [ngClass]="getRiskClass(results.risks.cardiovascularRisks.coronaryHeartDisease)">
            {{ getRiskText(results.risks.cardiovascularRisks.coronaryHeartDisease) }}
          </span>
          <span class="risk-percentage">{{ (results.risks.cardiovascularRisks.coronaryHeartDisease * 100).toFixed(1) }}%</span>
        </div>
        <div class="risk-item" *ngIf="results.risks.cardiovascularRisks.intermittentClaudication !== undefined">
          <span class="risk-label">Risk of Intermittent Claudication</span>
          <span class="risk-value" [ngClass]="getRiskClass(results.risks.cardiovascularRisks.intermittentClaudication)">
            {{ getRiskText(results.risks.cardiovascularRisks.intermittentClaudication) }}
          </span>
          <span class="risk-percentage">{{ (results.risks.cardiovascularRisks.intermittentClaudication * 100).toFixed(1) }}%</span>
        </div>
        <div class="risk-item" *ngIf="results.risks.cardiovascularRisks.stroke !== undefined">
          <span class="risk-label">Risk of Stroke</span>
          <span class="risk-value" [ngClass]="getRiskClass(results.risks.cardiovascularRisks.stroke)">
            {{ getRiskText(results.risks.cardiovascularRisks.stroke) }}
          </span>
          <span class="risk-percentage">{{ (results.risks.cardiovascularRisks.stroke * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Heart Section -->
      <div class="report-section" *ngIf="results.vitalSigns">
        <h3>Heart</h3>
        <div class="vital-item" *ngIf="results.vitalSigns.heartRate !== undefined">
          <span class="vital-value">{{ results.vitalSigns.heartRate.toFixed(2) }} bpm</span>
          <span class="vital-label">Heart Rate</span>
          <span class="vital-status" [ngClass]="getHeartRateClass(results.vitalSigns.heartRate)">
            {{ getHeartRateStatus(results.vitalSigns.heartRate) }}
          </span>
        </div>
        <div class="vital-item" *ngIf="results.vitalSigns.hrvRmssd !== undefined">
          <span class="vital-value">{{ results.vitalSigns.hrvRmssd.toFixed(2) }} ms</span>
          <span class="vital-label">RMSSD</span>
          <span class="vital-status" [ngClass]="getHrvClass(results.vitalSigns.hrvRmssd)">
            {{ getHrvStatus(results.vitalSigns.hrvRmssd) }}
          </span>
        </div>
        <div class="vital-item" *ngIf="results.vitalSigns.hrvSdnn !== undefined">
          <span class="vital-value">{{ results.vitalSigns.hrvSdnn.toFixed(2) }} ms</span>
          <span class="vital-label">SDNN</span>
          <span class="vital-status excellent">Excellent</span>
        </div>
      </div>

      <!-- Blood Section -->
      <div class="report-section" *ngIf="results.vitalSigns">
        <h3>Blood</h3>
        <div class="vital-item" *ngIf="results.vitalSigns.bloodPressureSystolic !== undefined">
          <span class="vital-value">{{ results.vitalSigns.bloodPressureSystolic.toFixed(2) }} mmHg</span>
          <span class="vital-label">Systolic Pressure</span>
          <span class="vital-status excellent">Excellent</span>
        </div>
        <div class="vital-item" *ngIf="results.vitalSigns.bloodPressureDiastolic !== undefined">
          <span class="vital-value">{{ results.vitalSigns.bloodPressureDiastolic.toFixed(2) }} mmHg</span>
          <span class="vital-label">Diastolic Pressure</span>
          <span class="vital-status good">Good</span>
        </div>
        <div class="vital-item" *ngIf="results.vitalSigns.spo2 !== undefined">
          <span class="vital-value">{{ results.vitalSigns.spo2.toFixed(2) }}%</span>
          <span class="vital-label">Oxygen in Blood</span>
          <span class="vital-status excellent">Excellent</span>
        </div>
      </div>

      <!-- Other Section -->
      <div class="report-section" *ngIf="results.vitalSigns">
        <h3>Other</h3>
        <div class="vital-item" *ngIf="results.vitalSigns.respiratoryRate !== undefined">
          <span class="vital-value">{{ results.vitalSigns.respiratoryRate.toFixed(2) }} bpm</span>
          <span class="vital-label">Respiratory Rate</span>
          <span class="vital-status excellent">Excellent</span>
        </div>
        <div class="vital-item" *ngIf="results.vitalSigns.stressScore !== undefined">
          <span class="vital-label">Stress Level</span>
          <span class="vital-status" [ngClass]="getStressClass(results.vitalSigns.stressScore)">
            {{ getStressStatus(results.vitalSigns.stressScore) }}
          </span>
        </div>
      </div>

      <!-- General Wellness -->
      <div class="report-section" *ngIf="results.holisticHealth">
        <h3>Overall Health</h3>
        <div class="wellness-item" *ngIf="results.holisticHealth.generalWellness !== undefined">
          <span class="wellness-label">General Wellness Score</span>
          <span class="wellness-value">{{ results.holisticHealth.generalWellness.toFixed(1) }}%</span>
          <span class="wellness-status excellent">Excellent</span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./health-report-display.component.scss']
})
export class HealthReportDisplayComponent {
  @Input() results: HealthScanResults | null = null;

  getRiskClass(risk: number): string {
    if (risk < 0.001) return 'excellent';
    if (risk < 0.01) return 'good';
    if (risk < 0.05) return 'moderate';
    return 'high';
  }

  getRiskText(risk: number): string {
    if (risk < 0.001) return 'Excellent';
    if (risk < 0.01) return 'Good';
    if (risk < 0.05) return 'Moderate';
    return 'High';
  }

  getHeartRateClass(hr: number): string {
    if (hr >= 60 && hr <= 100) return 'excellent';
    if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 120)) return 'good';
    return 'poor';
  }

  getHeartRateStatus(hr: number): string {
    if (hr >= 60 && hr <= 100) return 'Excellent';
    if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 120)) return 'Good';
    return 'Poor';
  }

  getHrvClass(hrv: number): string {
    if (hrv >= 50) return 'excellent';
    if (hrv >= 30) return 'good';
    return 'poor';
  }

  getHrvStatus(hrv: number): string {
    if (hrv >= 50) return 'Excellent';
    if (hrv >= 30) return 'Good';
    return 'Poor';
  }

  getStressClass(stressScore: number): string {
    if (stressScore < 30) return 'excellent';
    if (stressScore < 60) return 'good';
    return 'poor';
  }

  getStressStatus(stressScore: number): string {
    if (stressScore < 30) return 'Not stressed';
    if (stressScore < 60) return 'Mildly stressed';
    return 'Stressed';
  }
}
