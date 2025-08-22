import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorMeetComponent } from './doctor-meet.component';

describe('DoctorMeetComponent', () => {
  let component: DoctorMeetComponent;
  let fixture: ComponentFixture<DoctorMeetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorMeetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorMeetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
