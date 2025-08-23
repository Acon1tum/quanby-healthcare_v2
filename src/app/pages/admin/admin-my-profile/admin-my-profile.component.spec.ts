import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AdminMyProfileComponent } from './admin-my-profile.component';

describe('AdminMyProfileComponent', () => {
  let component: AdminMyProfileComponent;
  let fixture: ComponentFixture<AdminMyProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminMyProfileComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminMyProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with loading state', () => {
    expect(component.isLoading).toBe(true);
    expect(component.profile).toBeNull();
  });

  it('should load profile data on init', (done) => {
    setTimeout(() => {
      expect(component.isLoading).toBe(false);
      expect(component.profile).toBeTruthy();
      expect(component.profile?.firstName).toBe('John');
      expect(component.profile?.lastName).toBe('Administrator');
      done();
    }, 1100);
  });

  it('should populate form with profile data', (done) => {
    setTimeout(() => {
      component.populateForm();
      expect(component.profileForm.get('firstName')?.value).toBe('John');
      expect(component.profileForm.get('lastName')?.value).toBe('Administrator');
      done();
    }, 1100);
  });

  it('should start editing mode', () => {
    component.startEditing();
    expect(component.isEditing).toBe(true);
  });

  it('should cancel editing and reset form', (done) => {
    setTimeout(() => {
      component.startEditing();
      component.profileForm.patchValue({ firstName: 'Test' });
      component.cancelEditing();
      
      expect(component.isEditing).toBe(false);
      expect(component.profileForm.get('firstName')?.value).toBe('John');
      done();
    }, 1100);
  });

  it('should open password change dialog', () => {
    component.openPasswordChange();
    expect(component.isChangingPassword).toBe(true);
  });

  it('should close password change dialog', () => {
    component.openPasswordChange();
    component.closePasswordChange();
    expect(component.isChangingPassword).toBe(false);
  });

  it('should calculate age correctly', (done) => {
    setTimeout(() => {
      const age = component.getAge();
      expect(age).toBeGreaterThan(0);
      done();
    }, 1100);
  });

  it('should calculate years of service correctly', (done) => {
    setTimeout(() => {
      const years = component.getYearsOfService();
      expect(years).toBeGreaterThan(0);
      done();
    }, 1100);
  });

  it('should get full name correctly', (done) => {
    setTimeout(() => {
      const fullName = component.getFullName();
      expect(fullName).toContain('John');
      expect(fullName).toContain('Administrator');
      done();
    }, 1100);
  });

  it('should validate password match', () => {
    component.passwordForm.patchValue({
      newPassword: 'Test123!',
      confirmPassword: 'Test123!'
    });
    
    const result = component.passwordMatchValidator(component.passwordForm);
    expect(result).toBeNull();
  });

  it('should detect password mismatch', () => {
    component.passwordForm.patchValue({
      newPassword: 'Test123!',
      confirmPassword: 'Different123!'
    });
    
    const result = component.passwordMatchValidator(component.passwordForm);
    expect(result).toEqual({ passwordMismatch: true });
  });

  it('should mark form as touched when validation fails', () => {
    const markAsTouchedSpy = spyOn(component.profileForm.controls['firstName'], 'markAsTouched');
    component.markFormGroupTouched();
    expect(markAsTouchedSpy).toHaveBeenCalled();
  });

  it('should handle image selection', () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = { target: { files: [mockFile] } };
    
    component.onImageSelected(mockEvent);
    expect(component.selectedImage).toBe(mockFile);
  });

  it('should remove selected image', () => {
    component.selectedImage = new File([''], 'test.jpg');
    component.imagePreview = 'data:image/jpeg;base64,test';
    
    component.removeSelectedImage();
    expect(component.selectedImage).toBeNull();
    expect(component.imagePreview).toBeNull();
  });

  it('should get language label correctly', (done) => {
    setTimeout(() => {
      const languageLabel = component.languageLabel;
      expect(languageLabel).toBe('English');
      done();
    }, 1100);
  });

  it('should get timezone label correctly', (done) => {
    setTimeout(() => {
      const timezoneLabel = component.timezoneLabel;
      expect(timezoneLabel).toBe('EST (Eastern Standard Time)');
      done();
    }, 1100);
  });

  it('should get notification labels correctly', (done) => {
    setTimeout(() => {
      const notificationLabels = component.notificationLabels;
      expect(notificationLabels).toContain('Email');
      expect(notificationLabels).toContain('Push');
      expect(notificationLabels).not.toContain('SMS');
      done();
    }, 1100);
  });
});
