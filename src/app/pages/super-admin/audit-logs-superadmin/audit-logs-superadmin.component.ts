import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService, AuditLog, SecurityEvent, AuditStatistics } from '../../../api/api.service';
import { AuthService } from '../../../auth/auth.service';

interface FilterState {
  search: string;
  category: string;
  level: string;
  userId: string;
  resourceType: string;
  module: string;
  pageName: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-audit-logs-superadmin',
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs-superadmin.component.html',
  styleUrl: './audit-logs-superadmin.component.scss'
})
export class AuditLogsSuperadminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  auditLogs: AuditLog[] = [];
  securityEvents: SecurityEvent[] = [];
  statistics: AuditStatistics | null = null;
  
  // Loading states
  loadingLogs = false;
  loadingEvents = false;
  loadingStats = false;
  
  // UI state
  activeTab: 'logs' | 'events' | 'statistics' = 'logs';
  selectedLog: AuditLog | null = null;
  selectedEvent: SecurityEvent | null = null;
  showLogDetails = false;
  showEventDetails = false;
  
  // Pagination
  logsPagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  };
  
  eventsPagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  };
  
  // Filters
  logsFilters: FilterState = {
    search: '',
    category: '',
    level: '',
    userId: '',
    resourceType: '',
    module: '',
    pageName: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  };
  
  eventsFilters = {
    search: '',
    eventType: '',
    severity: '',
    resolved: '',
    userId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  };
  
  // Filter options
  categories = [
    { value: '', label: 'All Categories' },
    { value: 'AUTHENTICATION', label: 'Authentication' },
    { value: 'DATA_ACCESS', label: 'Data Access' },
    { value: 'DATA_MODIFICATION', label: 'Data Modification' },
    { value: 'SECURITY', label: 'Security' },
    { value: 'SYSTEM', label: 'System' },
    { value: 'USER_ACTIVITY', label: 'User Activity' }
  ];
  
  levels = [
    { value: '', label: 'All Levels' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'ERROR', label: 'Error' }
  ];
  
  severities = [
    { value: '', label: 'All Severities' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'ERROR', label: 'Error' }
  ];
  
  resolvedOptions = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Resolved' },
    { value: 'false', label: 'Unresolved' }
  ];
  
  // Module options for filtering by system module
  modules = [
    { value: '', label: 'All Modules' },
    { value: 'AUTH', label: 'Authentication' },
    { value: 'APPOINTMENTS', label: 'Appointments' },
    { value: 'CONSULTATIONS', label: 'Consultations' },
    { value: 'MEDICAL_RECORDS', label: 'Medical Records' },
    { value: 'PRESCRIPTIONS', label: 'Prescriptions' },
    { value: 'DIAGNOSES', label: 'Diagnoses' },
    { value: 'DOCTORS', label: 'Doctors' },
    { value: 'PATIENTS', label: 'Patients' },
    { value: 'ORGANIZATIONS', label: 'Organizations' },
    { value: 'LAB_REQUESTS', label: 'Lab Requests' },
    { value: 'SELF_CHECK', label: 'Self Check' },
    { value: 'NOTIFICATIONS', label: 'Notifications' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'SYSTEM', label: 'System' }
  ];
  
  // Page/Component options for filtering by specific pages
  pages = [
    { value: '', label: 'All Pages' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'login', label: 'Login Page' },
    { value: 'profile', label: 'Profile Page' },
    { value: 'appointments', label: 'Appointments Page' },
    { value: 'consultations', label: 'Consultations Page' },
    { value: 'medical-records', label: 'Medical Records Page' },
    { value: 'prescriptions', label: 'Prescriptions Page' },
    { value: 'diagnoses', label: 'Diagnoses Page' },
    { value: 'doctors', label: 'Doctors Page' },
    { value: 'patients', label: 'Patients Page' },
    { value: 'organizations', label: 'Organizations Page' },
    { value: 'lab-requests', label: 'Lab Requests Page' },
    { value: 'self-check', label: 'Self Check Page' },
    { value: 'notifications', label: 'Notifications Page' },
    { value: 'audit-logs', label: 'Audit Logs Page' },
    { value: 'settings', label: 'Settings Page' },
    { value: 'reports', label: 'Reports Page' }
  ];
  
  // Resolution modal
  resolutionNotes = '';
  resolving = false;
  
  // Make Math and Object available in template
  Math = Math;
  Object = Object;
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}
  
  ngOnInit() {
    this.loadInitialData();
    this.setupSearchDebounce();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.unlockBodyScroll(); // Clean up any locked scroll
  }
  
  private setupSearchDebounce() {
    // Debounce search input for logs
    // Implementation would go here if needed
  }
  
  private loadInitialData() {
    this.loadStatistics();
    this.loadAuditLogs();
    this.loadSecurityEvents();
  }
  
  // ===== AUDIT LOGS METHODS =====
  
  loadAuditLogs() {
    this.loadingLogs = true;
    
    const params = {
      page: this.logsFilters.page,
      limit: this.logsFilters.limit,
      ...(this.logsFilters.search && { search: this.logsFilters.search }),
      ...(this.logsFilters.category && { category: this.logsFilters.category }),
      ...(this.logsFilters.level && { level: this.logsFilters.level }),
      ...(this.logsFilters.userId && { userId: this.logsFilters.userId }),
      ...(this.logsFilters.resourceType && { resourceType: this.logsFilters.resourceType }),
      ...(this.logsFilters.module && { module: this.logsFilters.module }),
      ...(this.logsFilters.pageName && { pageName: this.logsFilters.pageName }),
      ...(this.logsFilters.startDate && { startDate: this.logsFilters.startDate }),
      ...(this.logsFilters.endDate && { endDate: this.logsFilters.endDate })
    };
    
    this.apiService.getAuditLogs(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.auditLogs = response.data.items || [];
            this.logsPagination = {
              currentPage: response.data.page || 1,
              totalPages: response.data.totalPages || 1,
              totalItems: response.data.total || 0,
              itemsPerPage: response.data.limit || 20
            };
          } else {
            this.auditLogs = [];
            this.logsPagination = {
              currentPage: 1,
              totalPages: 1,
              totalItems: 0,
              itemsPerPage: 20
            };
          }
          this.loadingLogs = false;
        },
        error: (error) => {
          console.error('Error loading audit logs:', error);
          this.auditLogs = [];
          this.logsPagination = {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 20
          };
          this.loadingLogs = false;
        }
      });
  }
  
  onLogsPageChange(page: number) {
    this.logsFilters.page = page;
    this.loadAuditLogs();
  }
  
  onLogsFilterChange() {
    this.logsFilters.page = 1;
    this.loadAuditLogs();
  }
  
  viewLogDetails(log: AuditLog) {
    this.selectedLog = log;
    this.showLogDetails = true;
    this.lockBodyScroll();
  }
  
  closeLogDetails() {
    this.selectedLog = null;
    this.showLogDetails = false;
    this.unlockBodyScroll();
  }
  
  // ===== SECURITY EVENTS METHODS =====
  
  loadSecurityEvents() {
    this.loadingEvents = true;
    
    const params = {
      page: this.eventsFilters.page,
      limit: this.eventsFilters.limit,
      ...(this.eventsFilters.search && { search: this.eventsFilters.search }),
      ...(this.eventsFilters.eventType && { eventType: this.eventsFilters.eventType }),
      ...(this.eventsFilters.severity && { severity: this.eventsFilters.severity }),
      ...(this.eventsFilters.resolved && { resolved: this.eventsFilters.resolved }),
      ...(this.eventsFilters.userId && { userId: this.eventsFilters.userId }),
      ...(this.eventsFilters.startDate && { startDate: this.eventsFilters.startDate }),
      ...(this.eventsFilters.endDate && { endDate: this.eventsFilters.endDate })
    };
    
    this.apiService.getSecurityEvents(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.securityEvents = response.data.items || [];
            this.eventsPagination = {
              currentPage: response.data.page || 1,
              totalPages: response.data.totalPages || 1,
              totalItems: response.data.total || 0,
              itemsPerPage: response.data.limit || 20
            };
          } else {
            this.securityEvents = [];
            this.eventsPagination = {
              currentPage: 1,
              totalPages: 1,
              totalItems: 0,
              itemsPerPage: 20
            };
          }
          this.loadingEvents = false;
        },
        error: (error) => {
          console.error('Error loading security events:', error);
          this.securityEvents = [];
          this.eventsPagination = {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 20
          };
          this.loadingEvents = false;
        }
      });
  }
  
  onEventsPageChange(page: number) {
    this.eventsFilters.page = page;
    this.loadSecurityEvents();
  }
  
  onEventsFilterChange() {
    this.eventsFilters.page = 1;
    this.loadSecurityEvents();
  }
  
  viewEventDetails(event: SecurityEvent) {
    this.selectedEvent = event;
    this.showEventDetails = true;
    this.lockBodyScroll();
  }
  
  closeEventDetails() {
    this.selectedEvent = null;
    this.showEventDetails = false;
    this.unlockBodyScroll();
  }
  
  resolveEvent(event: SecurityEvent) {
    this.selectedEvent = event;
    this.resolutionNotes = '';
    this.lockBodyScroll();
  }
  
  confirmResolve() {
    if (!this.selectedEvent || !this.resolutionNotes.trim()) {
      return;
    }
    
    this.resolving = true;
    
    this.apiService.resolveSecurityEvent(this.selectedEvent.id, this.resolutionNotes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Update the event in the list
            const index = this.securityEvents.findIndex(e => e.id === this.selectedEvent!.id);
            if (index !== -1) {
              this.securityEvents[index] = response.data;
            }
          }
          
          this.selectedEvent = null;
          this.resolutionNotes = '';
          this.resolving = false;
          this.unlockBodyScroll();
          
          // Reload statistics to update counts
          this.loadStatistics();
          // Reload security events to refresh the list
          this.loadSecurityEvents();
        },
        error: (error) => {
          console.error('Error resolving security event:', error);
          this.resolving = false;
        }
      });
  }
  
  cancelResolve() {
    this.selectedEvent = null;
    this.resolutionNotes = '';
    this.resolving = false;
    this.unlockBodyScroll();
  }
  
  // ===== STATISTICS METHODS =====
  
  loadStatistics() {
    this.loadingStats = true;
    
    this.apiService.getAuditStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.statistics = response.data;
          } else {
            this.statistics = null;
          }
          this.loadingStats = false;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
          this.statistics = null;
          this.loadingStats = false;
        }
      });
  }
  
  // ===== UTILITY METHODS =====
  
  setActiveTab(tab: 'logs' | 'events' | 'statistics') {
    this.activeTab = tab;
  }
  
  getLevelClass(level: string): string {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }
  
  getCategoryClass(category: string): string {
    switch (category.toLowerCase()) {
      case 'authentication': return 'text-purple-600 bg-purple-50';
      case 'security': return 'text-red-600 bg-red-50';
      case 'data_access': return 'text-blue-600 bg-blue-50';
      case 'data_modification': return 'text-green-600 bg-green-50';
      case 'system': return 'text-gray-600 bg-gray-50';
      case 'user_activity': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  }
  
  formatDetails(details: any): string {
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  }
  
  // Helper methods to determine module and page from action/resource
  getModuleFromAction(action: string): string {
    const actionUpper = action.toUpperCase();
    
    if (actionUpper.includes('LOGIN') || actionUpper.includes('LOGOUT') || actionUpper.includes('PASSWORD') || actionUpper.includes('TOKEN')) {
      return 'Authentication';
    } else if (actionUpper.includes('APPOINTMENT')) {
      return 'Appointments';
    } else if (actionUpper.includes('CONSULTATION')) {
      return 'Consultations';
    } else if (actionUpper.includes('MEDICAL') || actionUpper.includes('RECORD')) {
      return 'Medical Records';
    } else if (actionUpper.includes('PRESCRIPTION')) {
      return 'Prescriptions';
    } else if (actionUpper.includes('DIAGNOSIS') || actionUpper.includes('DIAGNOSE')) {
      return 'Diagnoses';
    } else if (actionUpper.includes('DOCTOR')) {
      return 'Doctors';
    } else if (actionUpper.includes('PATIENT')) {
      return 'Patients';
    } else if (actionUpper.includes('ORGANIZATION')) {
      return 'Organizations';
    } else if (actionUpper.includes('LAB') || actionUpper.includes('REQUEST')) {
      return 'Lab Requests';
    } else if (actionUpper.includes('SELF') || actionUpper.includes('CHECK')) {
      return 'Self Check';
    } else if (actionUpper.includes('NOTIFICATION')) {
      return 'Notifications';
    } else if (actionUpper.includes('EMAIL') || actionUpper.includes('SEND')) {
      return 'Email';
    } else if (actionUpper.includes('AUDIT') || actionUpper.includes('SECURITY') || actionUpper.includes('ADMIN')) {
      return 'Super Admin';
    } else if (actionUpper.includes('SYSTEM') || actionUpper.includes('HEALTH') || actionUpper.includes('STATISTICS')) {
      return 'System';
    } else {
      return 'Unknown';
    }
  }
  
  getPageFromResource(resourceType: string): string {
    const resourceUpper = resourceType.toUpperCase();
    
    switch (resourceUpper) {
      case 'USER':
      case 'AUTH':
        return 'Login/Profile Page';
      case 'APPOINTMENT':
        return 'Appointments Page';
      case 'CONSULTATION':
        return 'Consultations Page';
      case 'MEDICAL_RECORD':
      case 'MEDICALRECORD':
        return 'Medical Records Page';
      case 'PRESCRIPTION':
        return 'Prescriptions Page';
      case 'DIAGNOSIS':
        return 'Diagnoses Page';
      case 'DOCTOR':
        return 'Doctors Page';
      case 'PATIENT':
        return 'Patients Page';
      case 'ORGANIZATION':
        return 'Organizations Page';
      case 'LAB_REQUEST':
      case 'LABREQUEST':
        return 'Lab Requests Page';
      case 'SELF_CHECK':
      case 'SELFCHECK':
        return 'Self Check Page';
      case 'NOTIFICATION':
        return 'Notifications Page';
      case 'EMAIL':
        return 'Email System';
      case 'AUDIT_LOG':
      case 'AUDITLOG':
        return 'Audit Logs Page';
      case 'SECURITY_EVENT':
      case 'SECURITYEVENT':
        return 'Security Events Page';
      case 'SYSTEM':
        return 'System/Dashboard';
      default:
        return resourceType || 'Unknown Page';
    }
  }
  
  // ===== MODAL UTILITY METHODS =====
  
  private lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px'; // Prevent layout shift
  }
  
  private unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}
