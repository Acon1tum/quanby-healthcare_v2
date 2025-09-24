import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

import { PatientLabRequestsComponent } from './lab-requests.component';
import { LabRequestService } from '../../../services/lab-request.service';
import { AuthService } from '../../../auth/auth.service';

describe('PatientLabRequestsComponent', () => {
  let component: PatientLabRequestsComponent;
  let fixture: ComponentFixture<PatientLabRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientLabRequestsComponent, HttpClientTestingModule, FormsModule],
      providers: [
        LabRequestService,
        AuthService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientLabRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
