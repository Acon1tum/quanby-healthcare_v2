import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrgManagementComponent } from './org-management.component';

describe('OrgManagementComponent', () => {
  let component: OrgManagementComponent;
  let fixture: ComponentFixture<OrgManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrgManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
