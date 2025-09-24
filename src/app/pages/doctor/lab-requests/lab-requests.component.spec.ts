import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

import { DoctorLabRequestsComponent } from './lab-requests.component';
import { LabRequestService } from '../../../services/lab-request.service';
import { AuthService } from '../../../auth/auth.service';

describe('DoctorLabRequestsComponent', () => {
  let component: DoctorLabRequestsComponent;
  let fixture: ComponentFixture<DoctorLabRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorLabRequestsComponent, HttpClientTestingModule, FormsModule],
      providers: [
        LabRequestService,
        AuthService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorLabRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
