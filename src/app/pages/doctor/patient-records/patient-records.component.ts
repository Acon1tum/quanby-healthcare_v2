import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import { ApiService } from '../../../api/api.service';

@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-records.component.html',
  styleUrl: './patient-records.component.scss',
  providers: [AuthService, ApiService]
})
export class PatientRecordsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  patients: any[] = [];
  selectedPatient: any = null;
  patientRecords: any = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.error = null;
    
    // TODO: Implement patient loading logic
    // This would typically fetch patients that the doctor has access to
    console.log('Loading patients...');
    this.loading = false;
  }

  selectPatient(patient: any): void {
    this.selectedPatient = patient;
    this.loadPatientRecords(patient.id);
  }

  loadPatientRecords(patientId: number): void {
    this.loading = true;
    this.error = null;
    
    this.apiService.getMedicalRecordsSummary(patientId).subscribe({
      next: (response) => {
        this.patientRecords = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading patient records:', error);
        this.error = 'Failed to load patient records';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/doctor/dashboard']);
  }
}
