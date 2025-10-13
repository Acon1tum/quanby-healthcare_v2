import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

// Interfaces based on existing API responses
export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalDoctors: number;
  totalPatients: number;
}

export interface SystemStatistics {
  totalOrganizations: number;
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  totalConsultations: number;
  totalAppointments: number;
  totalPrescriptions: number;
  totalDiagnoses: number;
  totalLabRequests: number;
  totalNotifications: number;
  activeSecurityEvents: number;
  totalRevenue: number;
  systemUptime: string;
  databaseSize: string;
  apiRequestsToday: number;
  recentStats: {
    consultations: number;
    appointments: number;
    users: number;
    organizations: number;
  };
}

export interface SystemHealth {
  serverStatus: 'online' | 'offline' | 'degraded';
  databaseStatus: 'healthy' | 'slow' | 'error';
  apiResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  activeConnections: number;
  lastHealthCheck: string;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  ipAddress: string;
  userId?: string;
  resolved: boolean;
  timestamp: string;
  details?: any;
}

export interface OrganizationWithStats {
  id: string;
  name: string;
  isActive: boolean;
  userCount: number;
  doctorCount: number;
  patientCount: number;
  consultationCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecentActivity {
  id: string;
  type: 'user_registration' | 'organization_created' | 'security_event' | 'system_maintenance' | 'consultation' | 'appointment';
  description: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  userId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface UserStatistics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SuperAdminService {
  private apiUrl = environment.backendApi;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  private handleError(error: any): Observable<never> {
    console.error('Super Admin Service Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get comprehensive system statistics from super-admin endpoint
  getSystemStatistics(): Observable<SystemStatistics> {
    return this.http.get<ApiResponse<SystemStatistics>>(`${environment.backendApi}/super-admin/statistics`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to fetch system statistics');
      }),
      catchError(this.handleError)
    );
  }

  // Get system health information from super-admin endpoint
  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<ApiResponse<SystemHealth>>(`${environment.backendApi}/super-admin/health`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to fetch system health');
      }),
      catchError(this.handleError)
    );
  }

  // Get security events from super-admin endpoint
  getSecurityEvents(limit: number = 10, resolved?: boolean): Observable<SecurityEvent[]> {
    let url = `${environment.backendApi}/super-admin/security/events?limit=${limit}`;
    if (resolved !== undefined) {
      url += `&resolved=${resolved}`;
    }

    return this.http.get<ApiResponse<SecurityEvent[]>>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to fetch security events');
      }),
      catchError(this.handleError)
    );
  }

  // Resolve security event
  resolveSecurityEvent(eventId: string, resolvedBy?: string): Observable<SecurityEvent> {
    return this.http.patch<ApiResponse<SecurityEvent>>(
      `${environment.backendApi}/super-admin/security/events/${eventId}/resolve`,
      { resolvedBy },
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to resolve security event');
      }),
      catchError(this.handleError)
    );
  }

  // Get organizations with statistics from super-admin endpoint
  getOrganizationsWithStats(): Observable<OrganizationWithStats[]> {
    return this.http.get<ApiResponse<OrganizationWithStats[]>>(`${environment.backendApi}/super-admin/organizations`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        }
        throw new Error('Failed to fetch organizations');
      }),
      catchError(this.handleError)
    );
  }

  // Get recent system activities from super-admin endpoint
  getRecentActivities(limit: number = 20): Observable<RecentActivity[]> {
    return this.http.get<ApiResponse<RecentActivity[]>>(`${environment.backendApi}/super-admin/activities?limit=${limit}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        }
        throw new Error('Failed to fetch recent activities');
      }),
      catchError(this.handleError)
    );
  }

  // Get user statistics from super-admin endpoint
  getUserStatistics(timeRange: '7d' | '30d' | '90d' = '30d'): Observable<UserStatistics> {
    return this.http.get<ApiResponse<UserStatistics>>(`${environment.backendApi}/super-admin/users/statistics?timeRange=${timeRange}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to fetch user statistics');
      }),
      catchError(this.handleError)
    );
  }

  // Utility methods for data transformation
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#dc2626';
      case 'ERROR':
        return '#ef4444';
      case 'WARNING':
        return '#f59e0b';
      case 'INFO':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'user_registration':
        return 'person_add';
      case 'organization_created':
        return 'business';
      case 'security_event':
        return 'security';
      case 'system_maintenance':
        return 'build';
      case 'consultation':
        return 'video_call';
      case 'appointment':
        return 'schedule';
      default:
        return 'info';
    }
  }
}
