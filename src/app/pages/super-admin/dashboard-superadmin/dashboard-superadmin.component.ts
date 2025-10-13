import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SuperAdminService, SystemStatistics, SystemHealth, SecurityEvent, OrganizationWithStats, RecentActivity } from '../../../services/super-admin.service';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: 'system' | 'users' | 'organizations' | 'security';
}

@Component({
  selector: 'app-dashboard-superadmin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-superadmin.component.html',
  styleUrl: './dashboard-superadmin.component.scss'
})
export class DashboardSuperadminComponent implements OnInit, OnDestroy {
  stats: SystemStatistics | null = null;
  securityEvents: SecurityEvent[] = [];
  systemHealth: SystemHealth | null = null;
  organizations: OrganizationWithStats[] = [];
  recentActivities: RecentActivity[] = [];
  quickActions: QuickAction[] = [];

  isLoading = true;
  selectedTimeRange = '7d'; // 7 days, 30 days, 90 days
  refreshInterval: any;
  error: string | null = null;

  constructor(
    private router: Router,
    private superAdminService: SuperAdminService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupQuickActions();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    // Load all data in parallel
    Promise.all([
      this.superAdminService.getSystemStatistics().toPromise(),
      this.superAdminService.getSystemHealth().toPromise(),
      this.superAdminService.getSecurityEvents(10).toPromise(),
      this.superAdminService.getOrganizationsWithStats().toPromise(),
      this.superAdminService.getRecentActivities(20).toPromise()
    ]).then(([stats, health, events, organizations, activities]) => {
      this.stats = stats || null;
      this.systemHealth = health || null;
      this.securityEvents = events || [];
      this.organizations = organizations || [];
      this.recentActivities = activities || [];
      this.isLoading = false;
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
      this.error = error.message || 'Failed to load dashboard data';
      this.isLoading = false;
    });
  }

  setupQuickActions(): void {
    this.quickActions = [
      // System Management
      {
        title: 'System Settings',
        description: 'Configure global system parameters',
        icon: 'settings',
        route: '/super-admin/system-settings',
        color: '#6b7280',
        category: 'system'
      },
      {
        title: 'Database Management',
        description: 'Manage database operations and backups',
        icon: 'storage',
        route: '/super-admin/database-management',
        color: '#3b82f6',
        category: 'system'
      },
      {
        title: 'System Monitoring',
        description: 'Monitor system performance and health',
        icon: 'monitor_heart',
        route: '/super-admin/system-monitoring',
        color: '#10b981',
        category: 'system'
      },
      
      // User Management
      {
        title: 'User Management',
        description: 'Manage all users across organizations',
        icon: 'people',
        route: '/super-admin/user-management',
        color: '#8b5cf6',
        category: 'users'
      },
      {
        title: 'Role Management',
        description: 'Configure user roles and permissions',
        icon: 'admin_panel_settings',
        route: '/super-admin/role-management',
        color: '#f59e0b',
        category: 'users'
      },
      
      // Organization Management
      {
        title: 'Organization Management',
        description: 'Manage healthcare organizations',
        icon: 'business',
        route: '/super-admin/organization-management',
        color: '#ef4444',
        category: 'organizations'
      },
      {
        title: 'Organization Analytics',
        description: 'View organization performance metrics',
        icon: 'analytics',
        route: '/super-admin/organization-analytics',
        color: '#06b6d4',
        category: 'organizations'
      },
      
      // Security Management
      {
        title: 'Security Center',
        description: 'Monitor security events and threats',
        icon: 'security',
        route: '/super-admin/security-center',
        color: '#dc2626',
        category: 'security'
      },
      {
        title: 'Audit Logs',
        description: 'View comprehensive system audit logs',
        icon: 'history',
        route: '/super-admin/audit-logs',
        color: '#7c3aed',
        category: 'security'
      }
    ];
  }

  startAutoRefresh(): void {
    // Refresh data every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 5 * 60 * 1000);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'severity-critical';
      case 'ERROR':
        return 'severity-error';
      case 'WARNING':
        return 'severity-warning';
      case 'INFO':
        return 'severity-info';
      default:
        return '';
    }
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

  getSystemStatusClass(status: string): string {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'status-success';
      case 'degraded':
      case 'slow':
        return 'status-warning';
      case 'offline':
      case 'error':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  }

  formatTimeAgo(dateString: string): string {
    return this.superAdminService.formatTimeAgo(dateString);
  }

  formatCurrency(amount: number): string {
    return this.superAdminService.formatCurrency(amount);
  }

  formatNumber(num: number): string {
    return this.superAdminService.formatNumber(num);
  }

  onTimeRangeChange(range: string): void {
    this.selectedTimeRange = range;
    this.loadDashboardData();
  }

  resolveSecurityEvent(eventId: string): void {
    this.superAdminService.resolveSecurityEvent(eventId).subscribe({
      next: (resolvedEvent) => {
        const index = this.securityEvents.findIndex(e => e.id === eventId);
        if (index !== -1) {
          this.securityEvents[index] = resolvedEvent;
        }
        console.log('Security event resolved:', eventId);
      },
      error: (error) => {
        console.error('Error resolving security event:', error);
        this.error = 'Failed to resolve security event';
      }
    });
  }

  getQuickActionsByCategory(category: string): QuickAction[] {
    return this.quickActions.filter(action => action.category === category);
  }

  // Expose Math for template
  Math = Math;

  // Get last backup time
  getLastBackupTime(): string {
    const lastBackup = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return this.formatTimeAgo(lastBackup.toISOString());
  }

  // Helper methods for template calculations
  getApiResponseTimeWidth(): number {
    if (!this.systemHealth) return 0;
    return Math.min(this.systemHealth.apiResponseTime / 5, 100);
  }

  getActiveConnectionsWidth(): number {
    if (!this.systemHealth) return 0;
    return Math.min(this.systemHealth.activeConnections / 10, 100);
  }
}
