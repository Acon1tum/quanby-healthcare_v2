import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { DoctorMyProfileComponent } from './doctor-my-profile.component';

describe('DoctorMyProfileComponent', () => {
  let component: DoctorMyProfileComponent;
  let fixture: ComponentFixture<DoctorMyProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorMyProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorMyProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should normalize base64 image data correctly', () => {
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const normalized = (component as any).normalizeImageDataUrl(base64Png);
    expect(normalized).toBe(`data:image/png;base64,${base64Png}`);
  });

  it('should handle data URL images correctly', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
    const normalized = (component as any).normalizeImageDataUrl(dataUrl);
    expect(normalized).toBe(dataUrl);
  });
});
