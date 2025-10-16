import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { of } from 'rxjs';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser$: of(null)
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: of({})
    });

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not apply dark mode to login page', () => {
    // Mock current URL to be login page
    spyOnProperty(window, 'location').and.returnValue({
      pathname: '/login'
    } as Location);

    component.isDarkMode = true;
    component.applyDarkMode();

    expect(document.body.classList.contains('dark-mode')).toBeFalse();
    expect(document.documentElement.classList.contains('dark-mode')).toBeFalse();
  });

  it('should not apply dark mode to register page', () => {
    // Mock current URL to be register page
    spyOnProperty(window, 'location').and.returnValue({
      pathname: '/register'
    } as Location);

    component.isDarkMode = true;
    component.applyDarkMode();

    expect(document.body.classList.contains('dark-mode')).toBeFalse();
    expect(document.documentElement.classList.contains('dark-mode')).toBeFalse();
  });

  it('should not apply dark mode to landing page', () => {
    // Mock current URL to be landing page
    spyOnProperty(window, 'location').and.returnValue({
      pathname: '/'
    } as Location);

    component.isDarkMode = true;
    component.applyDarkMode();

    expect(document.body.classList.contains('dark-mode')).toBeFalse();
    expect(document.documentElement.classList.contains('dark-mode')).toBeFalse();
  });

  it('should not apply dark mode to landing page with /landing path', () => {
    // Mock current URL to be landing page with /landing path
    spyOnProperty(window, 'location').and.returnValue({
      pathname: '/landing'
    } as Location);

    component.isDarkMode = true;
    component.applyDarkMode();

    expect(document.body.classList.contains('dark-mode')).toBeFalse();
    expect(document.documentElement.classList.contains('dark-mode')).toBeFalse();
  });

  it('should not apply dark mode to face-scan page', () => {
    // Mock current URL to be face-scan page
    spyOnProperty(window, 'location').and.returnValue({
      pathname: '/face-scan'
    } as Location);

    component.isDarkMode = true;
    component.applyDarkMode();

    expect(document.body.classList.contains('dark-mode')).toBeFalse();
    expect(document.documentElement.classList.contains('dark-mode')).toBeFalse();
  });

  it('should apply dark mode to dashboard pages', () => {
    // Mock current URL to be dashboard page
    spyOnProperty(window, 'location').and.returnValue({
      pathname: '/doctor/dashboard'
    } as Location);

    component.isDarkMode = true;
    component.applyDarkMode();

    expect(document.body.classList.contains('dark-mode')).toBeTrue();
    expect(document.documentElement.classList.contains('dark-mode')).toBeTrue();
  });
});
