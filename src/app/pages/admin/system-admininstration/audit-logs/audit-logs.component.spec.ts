import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AuditLogsComponent } from './audit-logs.component';

describe('AuditLogsComponent', () => {
  let component: AuditLogsComponent;
  let fixture: ComponentFixture<AuditLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuditLogsComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.auditLogs).toEqual([]);
    expect(component.securityEvents).toEqual([]);
    expect(component.filteredAuditLogs).toEqual([]);
    expect(component.filteredSecurityEvents).toEqual([]);
    expect(component.isLoading).toBe(true);
    expect(component.selectedView).toBe('audit');
    expect(component.selectedLog).toBeNull();
    expect(component.selectedEvent).toBeNull();
    expect(component.showLogModal).toBe(false);
    expect(component.showEventModal).toBe(false);
  });

  it('should have filter options defined', () => {
    expect(component.categoryOptions.length).toBeGreaterThan(0);
    expect(component.levelOptions.length).toBeGreaterThan(0);
    expect(component.dateRangeOptions.length).toBeGreaterThan(0);
    expect(component.actionOptions.length).toBeGreaterThan(0);
  });

  it('should load data on init', (done) => {
    setTimeout(() => {
      expect(component.auditLogs.length).toBeGreaterThan(0);
      expect(component.securityEvents.length).toBeGreaterThan(0);
      expect(component.isLoading).toBe(false);
      done();
    }, 1100);
  });

  it('should apply filters correctly', (done) => {
    setTimeout(() => {
      const initialCount = component.filteredAuditLogs.length;
      
      component.filterForm.patchValue({ category: 'AUTHENTICATION' });
      expect(component.filteredAuditLogs.length).toBeLessThanOrEqual(initialCount);
      
      done();
    }, 1100);
  });

  it('should clear filters', (done) => {
    setTimeout(() => {
      component.filterForm.patchValue({ category: 'AUTHENTICATION' });
      component.clearFilters();
      
      expect(component.filterForm.get('category')?.value).toBe('');
      expect(component.filterForm.get('dateRange')?.value).toBe('last30days');
      done();
    }, 1100);
  });

  it('should switch views correctly', () => {
    expect(component.selectedView).toBe('audit');
    
    component.switchView('security');
    expect(component.selectedView).toBe('security');
    
    component.switchView('audit');
    expect(component.selectedView).toBe('audit');
  });

  it('should open log modal', (done) => {
    setTimeout(() => {
      const firstLog = component.auditLogs[0];
      component.viewLogDetails(firstLog);
      
      expect(component.selectedLog).toBe(firstLog);
      expect(component.showLogModal).toBe(true);
      done();
    }, 1100);
  });

  it('should close log modal', (done) => {
    setTimeout(() => {
      const firstLog = component.auditLogs[0];
      component.viewLogDetails(firstLog);
      component.closeLogModal();
      
      expect(component.selectedLog).toBeNull();
      expect(component.showLogModal).toBe(false);
      done();
    }, 1100);
  });

  it('should open event modal', (done) => {
    setTimeout(() => {
      const firstEvent = component.securityEvents[0];
      component.viewEventDetails(firstEvent);
      
      expect(component.selectedEvent).toBe(firstEvent);
      expect(component.showEventModal).toBe(true);
      done();
    }, 1100);
  });

  it('should close event modal', (done) => {
    setTimeout(() => {
      const firstEvent = component.securityEvents[0];
      component.viewEventDetails(firstEvent);
      component.closeEventModal();
      
      expect(component.selectedEvent).toBeNull();
      expect(component.showEventModal).toBe(false);
      done();
    }, 1100);
  });

  it('should resolve security event', (done) => {
    setTimeout(() => {
      const unresolvedEvent = component.securityEvents.find(e => !e.resolved);
      if (unresolvedEvent) {
        component.resolveSecurityEvent(unresolvedEvent);
        expect(unresolvedEvent.resolved).toBe(true);
        expect(unresolvedEvent.resolvedAt).toBeDefined();
        expect(unresolvedEvent.resolvedBy).toBe(1);
      }
      done();
    }, 1100);
  });

  it('should get severity class correctly', () => {
    expect(component.getSeverityClass('low')).toBe('severity-low');
    expect(component.getSeverityClass('medium')).toBe('severity-medium');
    expect(component.getSeverityClass('high')).toBe('severity-high');
    expect(component.getSeverityClass('critical')).toBe('severity-critical');
  });

  it('should get level class correctly', () => {
    expect(component.getLevelClass('INFO')).toBe('level-info');
    expect(component.getLevelClass('WARNING')).toBe('level-warning');
    expect(component.getLevelClass('ERROR')).toBe('level-error');
    expect(component.getLevelClass('CRITICAL')).toBe('level-critical');
  });

  it('should get level icon correctly', () => {
    expect(component.getLevelIcon('INFO')).toBe('info');
    expect(component.getLevelIcon('WARNING')).toBe('warning');
    expect(component.getLevelIcon('ERROR')).toBe('error');
    expect(component.getLevelIcon('CRITICAL')).toBe('error_outline');
  });

  it('should get category icon correctly', () => {
    expect(component.getCategoryIcon('AUTHENTICATION')).toBe('security');
    expect(component.getCategoryIcon('AUTHORIZATION')).toBe('verified_user');
    expect(component.getCategoryIcon('DATA_ACCESS')).toBe('visibility');
    expect(component.getCategoryIcon('DATA_MODIFICATION')).toBe('edit');
    expect(component.getCategoryIcon('SECURITY')).toBe('shield');
    expect(component.getCategoryIcon('SYSTEM')).toBe('computer');
    expect(component.getCategoryIcon('USER_ACTIVITY')).toBe('person');
  });

  it('should get action icon correctly', () => {
    expect(component.getActionIcon('LOGIN')).toBe('login');
    expect(component.getActionIcon('LOGOUT')).toBe('logout');
    expect(component.getActionIcon('CREATE')).toBe('add');
    expect(component.getActionIcon('UPDATE')).toBe('edit');
    expect(component.getActionIcon('DELETE')).toBe('delete');
    expect(component.getActionIcon('VIEW')).toBe('visibility');
  });

  it('should count audit logs by level', (done) => {
    setTimeout(() => {
      const infoCount = component.getAuditLogCountByLevel('INFO');
      expect(infoCount).toBeGreaterThanOrEqual(0);
      done();
    }, 1100);
  });

  it('should count security events by severity', (done) => {
    setTimeout(() => {
      const warningCount = component.getSecurityEventCountBySeverity('WARNING');
      expect(warningCount).toBeGreaterThanOrEqual(0);
      done();
    }, 1100);
  });

  it('should get total counts', (done) => {
    setTimeout(() => {
      const totalLogs = component.getTotalAuditLogs();
      const totalEvents = component.getTotalSecurityEvents();
      
      expect(totalLogs).toBeGreaterThan(0);
      expect(totalEvents).toBeGreaterThan(0);
      done();
    }, 1100);
  });

  it('should get unresolved security events count', (done) => {
    setTimeout(() => {
      const unresolvedCount = component.getUnresolvedSecurityEvents();
      expect(unresolvedCount).toBeGreaterThanOrEqual(0);
      done();
    }, 1100);
  });

  it('should get critical events count', (done) => {
    setTimeout(() => {
      const criticalCount = component.getCriticalEvents();
      expect(criticalCount).toBeGreaterThanOrEqual(0);
      done();
    }, 1100);
  });

  it('should handle export functions', () => {
    spyOn(window, 'alert');
    
    component.exportAuditLogs();
    expect(window.alert).toHaveBeenCalledWith('Exporting audit logs...');
    
    component.exportSecurityEvents();
    expect(window.alert).toHaveBeenCalledWith('Exporting security events...');
  });

  it('should get time ago correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);
    
    expect(component.getTimeAgo(oneMinuteAgo.toISOString())).toContain('m ago');
    expect(component.getTimeAgo(oneHourAgo.toISOString())).toContain('h ago');
    expect(component.getTimeAgo(oneDayAgo.toISOString())).toContain('d ago');
  });

  it('should get resource type label correctly', () => {
    expect(component.getResourceTypeLabel('USER')).toBe('User');
    expect(component.getResourceTypeLabel('PATIENT')).toBe('Patient');
    expect(component.getResourceTypeLabel('DOCTOR')).toBe('Doctor');
    expect(component.getResourceTypeLabel('CONSULTATION')).toBe('Consultation');
    expect(component.getResourceTypeLabel('HEALTH_SCAN')).toBe('Health Scan');
  });

  it('should get event type label correctly', () => {
    expect(component.getEventTypeLabel('AUTH_FAILURE')).toBe('Authentication Failure');
    expect(component.getEventTypeLabel('RATE_LIMIT_VIOLATION')).toBe('Rate Limit Violation');
    expect(component.getEventTypeLabel('SUSPICIOUS_ACTIVITY')).toBe('Suspicious Activity');
    expect(component.getEventTypeLabel('LOGIN_ATTEMPT')).toBe('Login Attempt');
  });
});
