import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditLogsSuperadminComponent } from './audit-logs-superadmin.component';

describe('AuditLogsSuperadminComponent', () => {
  let component: AuditLogsSuperadminComponent;
  let fixture: ComponentFixture<AuditLogsSuperadminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogsSuperadminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditLogsSuperadminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
