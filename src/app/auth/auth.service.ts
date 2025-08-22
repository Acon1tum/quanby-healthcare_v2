import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    // Check if user is already logged in from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  get userRole(): 'admin' | 'doctor' | 'patient' | null {
    return this.currentUserValue?.role || null;
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication logic - replace with actual API call
      const user = this.authenticateUser(credentials);
      
      if (user) {
        // Store user in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        
        return {
          success: true,
          message: 'Login successful',
          user
        };
      } else {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  }

  private authenticateUser(credentials: LoginCredentials): User | null {
    // Mock user database - replace with actual API authentication
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@qhealth.com',
        name: 'Admin User',
        role: 'admin',
        token: 'mock-admin-token'
      },
      {
        id: '2',
        email: 'doctor@qhealth.com',
        name: 'Dr. Smith',
        role: 'doctor',
        token: 'mock-doctor-token'
      },
      {
        id: '3',
        email: 'patient@qhealth.com',
        name: 'John Doe',
        role: 'patient',
        token: 'mock-patient-token'
      }
    ];

    const user = mockUsers.find(u => 
      u.email === credentials.email && 
      this.validatePassword(credentials.password, u.role)
    );

    return user || null;
  }

  private validatePassword(password: string, role: string): boolean {
    // Mock password validation - replace with actual password checking
    const rolePasswords = {
      admin: 'admin123',
      doctor: 'doctor123',
      patient: 'patient123'
    };
    
    return password === rolePasswords[role as keyof typeof rolePasswords];
  }

  logout(): void {
    // Remove user from localStorage
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    
    // Redirect to login page
    this.router.navigate(['/login']);
  }

  redirectBasedOnRole(): void {
    const user = this.currentUserValue;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    switch (user.role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'doctor':
        this.router.navigate(['/doctor/dashboard']);
        break;
      case 'patient':
        this.router.navigate(['/patient/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  // Check if user has required role
  hasRole(requiredRole: 'admin' | 'doctor' | 'patient'): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    
    if (requiredRole === 'admin') {
      return user.role === 'admin';
    } else if (requiredRole === 'doctor') {
      return user.role === 'admin' || user.role === 'doctor';
    } else {
      return true; // All roles can access patient-level features
    }
  }
}
