import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMeetComponent } from './patient-meet.component';

describe('PatientMeetComponent', () => {
  let component: PatientMeetComponent;
  let fixture: ComponentFixture<PatientMeetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMeetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientMeetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
