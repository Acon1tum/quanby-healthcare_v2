import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardSuperadminComponent } from './dashboard-superadmin.component';

describe('DashboardSuperadminComponent', () => {
  let component: DashboardSuperadminComponent;
  let fixture: ComponentFixture<DashboardSuperadminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSuperadminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardSuperadminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
