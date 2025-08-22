import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemAdmininstrationComponent } from './system-admininstration.component';

describe('SystemAdmininstrationComponent', () => {
  let component: SystemAdmininstrationComponent;
  let fixture: ComponentFixture<SystemAdmininstrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemAdmininstrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemAdmininstrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
