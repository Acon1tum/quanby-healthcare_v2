import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsSuperadminComponent } from './reports-superadmin.component';

describe('ReportsSuperadminComponent', () => {
  let component: ReportsSuperadminComponent;
  let fixture: ComponentFixture<ReportsSuperadminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsSuperadminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsSuperadminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
