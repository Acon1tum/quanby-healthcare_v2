import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';

// Interfaces based on Prisma schema
interface AuditLog {
  id: string;
  userId?: number;
  action: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'DATA_MODIFICATION' | 'SECURITY' | 'SYSTEM' | 'USER_ACTIVITY';
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  ipAddress: string;
  userAgent: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  timestamp: string;
  severity: string;
  user?: {
    id: number;
    email: string;
    role: 'DOCTOR' | 'PATIENT' | 'ADMIN';
  };
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  ipAddress: string;
  userAgent: string;
  userId?: number;
  details?: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: number;
  user?: {
    id: number;
    email: string;
    role: 'DOCTOR' | 'PATIENT' | 'ADMIN';
  };
  resolvedByUser?: {
    id: number;
    email: string;
    role: 'DOCTOR' | 'PATIENT' | 'ADMIN';
  };
}

interface AuditFilter {
  category: string;
  level: string;
  dateRange: string;
  userId: string;
  action: string;
  ipAddress: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss'
})
export class AuditLogsComponent implements OnInit {
  auditLogs: AuditLog[] = [];
  securityEvents: SecurityEvent[] = [];
  filteredAuditLogs: AuditLog[] = [];
  filteredSecurityEvents: SecurityEvent[] = [];
  
  isLoading = true;
  selectedView: 'audit' | 'security' = 'audit';
  selectedLog: AuditLog | null = null;
  selectedEvent: SecurityEvent | null = null;
  showLogModal = false;
  showEventModal = false;
  
  filterForm: FormGroup;
  
  // Filter options based on schema
  categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'AUTHENTICATION', label: 'Authentication' },
    { value: 'AUTHORIZATION', label: 'Authorization' },
    { value: 'DATA_ACCESS', label: 'Data Access' },
    { value: 'DATA_MODIFICATION', label: 'Data Modification' },
    { value: 'SECURITY', label: 'Security' },
    { value: 'SYSTEM', label: 'System' },
    { value: 'USER_ACTIVITY', label: 'User Activity' }
  ];
  
  levelOptions = [
    { value: '', label: 'All Levels' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'ERROR', label: 'Error' },
    { value: 'CRITICAL', label: 'Critical' }
  ];
  
  dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];
  
  actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'VIEW', label: 'View' },
    { value: 'DOWNLOAD', label: 'Download' },
    { value: 'UPLOAD', label: 'Upload' },
    { value: 'EXPORT', label: 'Export' },
    { value: 'IMPORT', label: 'Import' }
  ];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      category: [''],
      level: [''],
      dateRange: ['last30days'],
      userId: [''],
      action: [''],
      ipAddress: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFilterListener();
  }

  loadData(): void {
    this.isLoading = true;
    
    // Simulate API call delay
    setTimeout(() => {
      this.auditLogs = [
        {
          id: '1',
          userId: 1,
          action: 'LOGIN',
          category: 'AUTHENTICATION',
          level: 'INFO',
          description: 'User successfully logged in',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          resourceType: 'USER',
          resourceId: '1',
          timestamp: '2024-01-15T10:30:00Z',
          severity: 'low',
          user: {
            id: 1,
            email: 'admin@qhealth.com',
            role: 'ADMIN'
          }
        },
        {
          id: '2',
          userId: 2,
          action: 'CREATE',
          category: 'DATA_MODIFICATION',
          level: 'INFO',
          description: 'New patient record created',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          resourceType: 'PATIENT',
          resourceId: '15',
          timestamp: '2024-01-15T09:15:00Z',
          severity: 'low',
          user: {
            id: 2,
            email: 'doctor@qhealth.com',
            role: 'DOCTOR'
          }
        },
        {
          id: '3',
          action: 'SYSTEM_BACKUP',
          category: 'SYSTEM',
          level: 'INFO',
          description: 'Automated system backup completed successfully',
          ipAddress: '192.168.1.1',
          userAgent: 'System/BackupService',
          timestamp: '2024-01-15T02:00:00Z',
          severity: 'low'
        },
        {
          id: '4',
          userId: 3,
          action: 'LOGIN',
          category: 'AUTHENTICATION',
          level: 'WARNING',
          description: 'Multiple failed login attempts detected',
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          resourceType: 'USER',
          resourceId: '3',
          timestamp: '2024-01-15T08:45:00Z',
          severity: 'medium',
          user: {
            id: 3,
            email: 'patient@qhealth.com',
            role: 'PATIENT'
          }
        },
        {
          id: '5',
          userId: 1,
          action: 'UPDATE',
          category: 'DATA_MODIFICATION',
          level: 'INFO',
          description: 'Patient consultation record updated',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          resourceType: 'CONSULTATION',
          resourceId: '25',
          timestamp: '2024-01-15T07:30:00Z',
          severity: 'low',
          user: {
            id: 1,
            email: 'admin@qhealth.com',
            role: 'ADMIN'
          }
        },
        {
          id: '6',
          action: 'DATABASE_ERROR',
          category: 'SYSTEM',
          level: 'ERROR',
          description: 'Database connection timeout occurred',
          ipAddress: '192.168.1.1',
          userAgent: 'System/DatabaseService',
          timestamp: '2024-01-15T06:20:00Z',
          severity: 'high'
        },
        {
          id: '7',
          userId: 2,
          action: 'EXPORT',
          category: 'DATA_ACCESS',
          level: 'INFO',
          description: 'Patient data exported to CSV',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          resourceType: 'PATIENT',
          resourceId: '15',
          timestamp: '2024-01-15T05:15:00Z',
          severity: 'low',
          user: {
            id: 2,
            email: 'doctor@qhealth.com',
            role: 'DOCTOR'
          }
        }
      ];
      
      this.securityEvents = [
        {
          id: '1',
          eventType: 'AUTH_FAILURE',
          severity: 'WARNING',
          description: 'Multiple failed authentication attempts from IP 192.168.1.102',
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          userId: 3,
          timestamp: '2024-01-15T08:45:00Z',
          resolved: false,
          user: {
            id: 3,
            email: 'patient@qhealth.com',
            role: 'PATIENT'
          }
        },
        {
          id: '2',
          eventType: 'RATE_LIMIT_VIOLATION',
          severity: 'ERROR',
          description: 'API rate limit exceeded from IP 192.168.1.103',
          ipAddress: '192.168.1.103',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: '2024-01-15T07:30:00Z',
          resolved: true,
          resolvedAt: '2024-01-15T08:00:00Z',
          resolvedBy: 1,
          resolvedByUser: {
            id: 1,
            email: 'admin@qhealth.com',
            role: 'ADMIN'
          }
        },
        {
          id: '3',
          eventType: 'SUSPICIOUS_ACTIVITY',
          severity: 'CRITICAL',
          description: 'Unusual data access pattern detected from IP 192.168.1.104',
          ipAddress: '192.168.1.104',
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
          timestamp: '2024-01-15T06:15:00Z',
          resolved: false
        },
        {
          id: '4',
          eventType: 'LOGIN_ATTEMPT',
          severity: 'INFO',
          description: 'Successful login from new device/IP',
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          userId: 2,
          timestamp: '2024-01-15T05:45:00Z',
          resolved: true,
          resolvedAt: '2024-01-15T06:00:00Z',
          resolvedBy: 2,
          resolvedByUser: {
            id: 2,
            email: 'doctor@qhealth.com',
            role: 'DOCTOR'
          }
        }
      ];
      
      this.filteredAuditLogs = [...this.auditLogs];
      this.filteredSecurityEvents = [...this.securityEvents];
      this.isLoading = false;
    }, 1000);
  }

  setupFilterListener(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    
    this.filteredAuditLogs = this.auditLogs.filter(log => {
      // Category filter
      if (filters.category && log.category !== filters.category) return false;
      
      // Level filter
      if (filters.level && log.level !== filters.level) return false;
      
      // Action filter
      if (filters.action && log.action !== filters.action) return false;
      
      // IP Address filter
      if (filters.ipAddress && !log.ipAddress.includes(filters.ipAddress)) return false;
      
      // User ID filter
      if (filters.userId && log.userId?.toString() !== filters.userId) return false;
      
      return true;
    });
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      category: '',
      level: '',
      dateRange: 'last30days',
      userId: '',
      action: '',
      ipAddress: ''
    });
  }

  switchView(view: 'audit' | 'security'): void {
    this.selectedView = view;
  }

  viewLogDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.showLogModal = true;
  }

  viewEventDetails(event: SecurityEvent): void {
    this.selectedEvent = event;
    this.showEventModal = true;
  }

  closeLogModal(): void {
    this.showLogModal = false;
    this.selectedLog = null;
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  resolveSecurityEvent(event: SecurityEvent): void {
    event.resolved = true;
    event.resolvedAt = new Date().toISOString();
    event.resolvedBy = 1; // Current admin user ID
    
    // In real app, make API call to update
    console.log('Security event resolved:', event.id);
  }

  getSeverityClass(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'low': return 'severity-low';
      case 'medium': return 'severity-medium';
      case 'high': return 'severity-high';
      case 'critical': return 'severity-critical';
      default: return '';
    }
  }

  getLevelClass(level: string): string {
    switch (level) {
      case 'INFO': return 'level-info';
      case 'WARNING': return 'level-warning';
      case 'ERROR': return 'level-error';
      case 'CRITICAL': return 'level-critical';
      default: return '';
    }
  }

  getLevelIcon(level: string): string {
    switch (level) {
      case 'INFO': return 'info';
      case 'WARNING': return 'warning';
      case 'ERROR': return 'error';
      case 'CRITICAL': return 'error_outline';
      default: return 'help';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'AUTHENTICATION': return 'security';
      case 'AUTHORIZATION': return 'verified_user';
      case 'DATA_ACCESS': return 'visibility';
      case 'DATA_MODIFICATION': return 'edit';
      case 'SECURITY': return 'shield';
      case 'SYSTEM': return 'computer';
      case 'USER_ACTIVITY': return 'person';
      default: return 'description';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'LOGIN': return 'login';
      case 'LOGOUT': return 'logout';
      case 'CREATE': return 'add';
      case 'UPDATE': return 'edit';
      case 'DELETE': return 'delete';
      case 'VIEW': return 'visibility';
      case 'DOWNLOAD': return 'download';
      case 'UPLOAD': return 'upload';
      case 'EXPORT': return 'file_download';
      case 'IMPORT': return 'file_upload';
      default: return 'help';
    }
  }

  getAuditLogCountByLevel(level: string): number {
    return this.auditLogs.filter(log => log.level === level).length;
  }

  getSecurityEventCountBySeverity(severity: string): number {
    return this.securityEvents.filter(event => event.severity === severity).length;
  }

  getTotalAuditLogs(): number {
    return this.auditLogs.length;
  }

  getTotalSecurityEvents(): number {
    return this.securityEvents.length;
  }

  getUnresolvedSecurityEvents(): number {
    return this.securityEvents.filter(event => !event.resolved).length;
  }

  getCriticalEvents(): number {
    return this.securityEvents.filter(event => event.severity === 'CRITICAL').length;
  }

  exportAuditLogs(): void {
    // In real app, implement export functionality
    alert('Exporting audit logs...');
  }

  exportSecurityEvents(): void {
    // In real app, implement export functionality
    alert('Exporting security events...');
  }

  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - logTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return logTime.toLocaleDateString();
  }

  getResourceTypeLabel(resourceType: string): string {
    switch (resourceType) {
      case 'USER': return 'User';
      case 'PATIENT': return 'Patient';
      case 'DOCTOR': return 'Doctor';
      case 'CONSULTATION': return 'Consultation';
      case 'HEALTH_SCAN': return 'Health Scan';
      default: return resourceType;
    }
  }

  getEventTypeLabel(eventType: string): string {
    switch (eventType) {
      case 'AUTH_FAILURE': return 'Authentication Failure';
      case 'RATE_LIMIT_VIOLATION': return 'Rate Limit Violation';
      case 'SUSPICIOUS_ACTIVITY': return 'Suspicious Activity';
      case 'LOGIN_ATTEMPT': return 'Login Attempt';
      default: return eventType.replace(/_/g, ' ');
    }
  }

  getEventTypeIcon(eventType: string): string {
    switch (eventType) {
      case 'AUTH_FAILURE': return 'lock';
      case 'RATE_LIMIT_VIOLATION': return 'speed';
      case 'SUSPICIOUS_ACTIVITY': return 'warning';
      case 'LOGIN_ATTEMPT': return 'login';
      default: return 'security';
    }
  }

  // Track by functions for performance
  trackByLogId(index: number, log: AuditLog): string {
    return log.id;
  }

  trackByEventId(index: number, event: SecurityEvent): string {
    return event.id;
  }

  // Refresh data
  refreshData(): void {
    this.loadData();
  }
}
