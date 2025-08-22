import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientScheduleComponent } from './patient-schedule.component';

describe('PatientScheduleComponent', () => {
  let component: PatientScheduleComponent;
  let fixture: ComponentFixture<PatientScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientScheduleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
