import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMyProfileComponent } from './admin-my-profile.component';

describe('AdminMyProfileComponent', () => {
  let component: AdminMyProfileComponent;
  let fixture: ComponentFixture<AdminMyProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMyProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminMyProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
