import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMyProfileComponent } from './patient-my-profile.component';

describe('PatientMyProfileComponent', () => {
  let component: PatientMyProfileComponent;
  let fixture: ComponentFixture<PatientMyProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMyProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientMyProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
