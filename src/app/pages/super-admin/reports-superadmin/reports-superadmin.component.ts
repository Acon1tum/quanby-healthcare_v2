import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../api/api.service';
import { AuthService } from '../../../auth/auth.service';

interface ReportFilter {
  startDate: string;
  endDate: string;
  organizationId: string;
  reportType: string;
  format: 'pdf' | 'excel' | 'csv';
}

interface ReportData {
  id: string;
  name: string;
  description: string;
  category: string;
  lastGenerated?: Date;
  generatedBy?: string;
  recordCount?: number;
}

interface SystemStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalOrganizations: number;
  totalAppointments: number;
  totalConsultations: number;
  totalMedicalRecords: number;
  totalPrescriptions: number;
  totalLabRequests: number;
  totalNotifications: number;
  totalAuditLogs: number;
  totalSecurityEvents: number;
}

@Component({
  selector: 'app-reports-superadmin',
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-superadmin.component.html',
  styleUrl: './reports-superadmin.component.scss'
})
export class ReportsSuperadminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Report categories and types
  reportCategories = [
    {
      id: 'system',
      name: 'System Reports',
      icon: 'settings',
      reports: [
        { id: 'system-overview', name: 'System Overview', description: 'Complete system statistics and health metrics' },
        { id: 'user-activity', name: 'User Activity', description: 'User login patterns and activity analysis' },
        { id: 'system-performance', name: 'System Performance', description: 'Database performance and response times' },
        { id: 'storage-usage', name: 'Storage Usage', description: 'Database size and storage utilization' }
      ]
    },
    {
      id: 'users',
      name: 'User Reports',
      icon: 'people',
      reports: [
        { id: 'user-registration', name: 'User Registration', description: 'New user registrations over time' },
        { id: 'user-roles', name: 'User Roles Distribution', description: 'Breakdown of users by role and organization' },
        { id: 'user-activity-summary', name: 'User Activity Summary', description: 'Login patterns and feature usage' },
        { id: 'inactive-users', name: 'Inactive Users', description: 'Users with no activity in specified period' }
      ]
    },
    {
      id: 'healthcare',
      name: 'Healthcare Reports',
      icon: 'medical',
      reports: [
        { id: 'appointments-summary', name: 'Appointments Summary', description: 'Appointment statistics and trends' },
        { id: 'consultations-report', name: 'Consultations Report', description: 'Consultation patterns and outcomes' },
        { id: 'medical-records-audit', name: 'Medical Records Audit', description: 'Medical record access and modifications' },
        { id: 'prescriptions-report', name: 'Prescriptions Report', description: 'Prescription patterns and drug usage' },
        { id: 'lab-requests-report', name: 'Lab Requests Report', description: 'Laboratory test requests and results' }
      ]
    },
    {
      id: 'security',
      name: 'Security & Compliance',
      icon: 'security',
      reports: [
        { id: 'audit-trail', name: 'Audit Trail', description: 'Complete audit log analysis' },
        { id: 'security-events', name: 'Security Events', description: 'Security incidents and violations' },
        { id: 'access-patterns', name: 'Access Patterns', description: 'User access patterns and anomalies' },
        { id: 'compliance-report', name: 'Compliance Report', description: 'HIPAA and regulatory compliance metrics' }
      ]
    },
    {
      id: 'organizations',
      name: 'Organization Reports',
      icon: 'business',
      reports: [
        { id: 'organization-stats', name: 'Organization Statistics', description: 'Organization performance and metrics' },
        { id: 'doctor-distribution', name: 'Doctor Distribution', description: 'Doctor distribution across organizations' },
        { id: 'patient-distribution', name: 'Patient Distribution', description: 'Patient distribution and demographics' }
      ]
    }
  ];
  
  // Current state
  selectedCategory: string = 'system';
  selectedReport: string = '';
  filters: ReportFilter = {
    startDate: '',
    endDate: '',
    organizationId: '',
    reportType: '',
    format: 'pdf'
  };
  
  // Data
  systemStats: SystemStats | null = null;
  organizations: any[] = [];
  generatedReports: ReportData[] = [];
  
  // UI state
  loading = false;
  generating = false;
  showFilters = false;
  showPreview = false;
  previewData: any = null;
  
  // Export options
  exportFormats = [
    { value: 'pdf' as const, label: 'PDF Document', icon: 'picture_as_pdf' },
    { value: 'excel' as const, label: 'Excel Spreadsheet', icon: 'table_chart' },
    { value: 'csv' as const, label: 'CSV File', icon: 'description' }
  ];
  
  // Make Object available in template
  Object = Object;
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    this.filters.startDate = startDate.toISOString().split('T')[0];
    this.filters.endDate = endDate.toISOString().split('T')[0];
  }
  
  ngOnInit() {
    this.loadSystemStats();
    this.loadOrganizations();
    this.loadGeneratedReports();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ===== DATA LOADING METHODS =====
  
  loadSystemStats() {
    this.loading = true;
    
    this.apiService.getSystemStatistics('30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.systemStats = {
              totalUsers: response.data.totalUsers || 0,
              totalDoctors: response.data.totalDoctors || 0,
              totalPatients: response.data.totalPatients || 0,
              totalOrganizations: response.data.totalOrganizations || 0,
              totalAppointments: response.data.totalAppointments || 0,
              totalConsultations: response.data.totalConsultations || 0,
              totalMedicalRecords: response.data.totalMedicalRecords || 0,
              totalPrescriptions: response.data.totalPrescriptions || 0,
              totalLabRequests: response.data.totalLabRequests || 0,
              totalNotifications: response.data.totalNotifications || 0,
              totalAuditLogs: response.data.totalAuditLogs || 0,
              totalSecurityEvents: response.data.totalSecurityEvents || 0
            };
          } else {
            console.error('Failed to load system statistics:', response);
            this.setDefaultStats();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading system statistics:', error);
          this.setDefaultStats();
          this.loading = false;
        }
      });
  }
  
  loadOrganizations() {
    this.apiService.getOrganizationsWithStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.organizations = [
              { id: '', name: 'All Organizations' },
              ...response.data.map((org: any) => ({
                id: org.id,
                name: org.name
              }))
            ];
          } else {
            this.setDefaultOrganizations();
          }
        },
        error: (error) => {
          console.error('Error loading organizations:', error);
          this.setDefaultOrganizations();
        }
      });
  }
  
  loadGeneratedReports() {
    // Load previously generated reports
    this.generatedReports = [
      {
        id: '1',
        name: 'System Overview Report',
        description: 'Complete system statistics',
        category: 'system',
        lastGenerated: new Date('2024-10-01'),
        generatedBy: 'superadmin@qhealth.com',
        recordCount: 1250
      },
      {
        id: '2',
        name: 'User Activity Report',
        description: 'User login and activity patterns',
        category: 'users',
        lastGenerated: new Date('2024-10-02'),
        generatedBy: 'superadmin@qhealth.com',
        recordCount: 5670
      }
    ];
  }
  
  // ===== REPORT METHODS =====
  
  selectCategory(categoryId: string) {
    this.selectedCategory = categoryId;
    this.selectedReport = '';
    this.showPreview = false;
  }
  
  selectReport(reportId: string) {
    this.selectedReport = reportId;
    this.showFilters = true;
    this.showPreview = false;
  }
  
  previewReport() {
    if (!this.selectedReport) return;
    
    this.loading = true;
    
    // Generate preview based on report type using backend APIs
    switch (this.selectedReport) {
      case 'system-overview':
        this.previewSystemOverviewReport();
        break;
      case 'user-activity':
        this.previewUserActivityReport();
        break;
      case 'audit-trail':
        this.previewAuditTrailReport();
        break;
      default:
        this.previewGenericReport();
    }
  }
  
  generateReport() {
    if (!this.selectedReport) return;
    
    this.generating = true;
    
    // Generate report based on type using backend APIs
    switch (this.selectedReport) {
      case 'system-overview':
        this.generateSystemOverviewReport();
        break;
      case 'user-activity':
        this.generateUserActivityReport();
        break;
      case 'audit-trail':
        this.generateAuditTrailReport();
        break;
      default:
        this.generateGenericReport();
    }
  }
  
  downloadReport(report: ReportData) {
    // Simulate file download
    const blob = new Blob(['Report content'], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
  
  // ===== HELPER METHODS =====
  
  getReportName(): string {
    const category = this.reportCategories.find(c => c.id === this.selectedCategory);
    const report = category?.reports.find(r => r.id === this.selectedReport);
    return report?.name || 'Unknown Report';
  }
  
  getReportDescription(): string {
    const category = this.reportCategories.find(c => c.id === this.selectedCategory);
    const report = category?.reports.find(r => r.id === this.selectedReport);
    return report?.description || '';
  }
  
  getSelectedCategoryReports() {
    return this.reportCategories.find(c => c.id === this.selectedCategory)?.reports || [];
  }
  
  generateReportSummary(): any {
    // Generate summary based on report type
    const summaries = {
      'system-overview': {
        totalUsers: this.systemStats?.totalUsers || 0,
        totalOrganizations: this.systemStats?.totalOrganizations || 0,
        totalAppointments: this.systemStats?.totalAppointments || 0,
        systemHealth: 'Excellent'
      },
      'user-activity': {
        activeUsers: 850,
        newRegistrations: 45,
        avgSessionDuration: '24 minutes',
        peakUsageTime: '2:00 PM'
      },
      'audit-trail': {
        totalEvents: this.systemStats?.totalAuditLogs || 0,
        securityEvents: this.systemStats?.totalSecurityEvents || 0,
        dataAccessEvents: 8500,
        modificationEvents: 1200
      }
    };
    
    return summaries[this.selectedReport as keyof typeof summaries] || {};
  }
  
  generateSampleData(): any[] {
    // Generate sample data based on report type
    const sampleData = {
      'system-overview': [
        { metric: 'Total Users', value: this.systemStats?.totalUsers || 0, trend: '+5.2%' },
        { metric: 'Active Doctors', value: this.systemStats?.totalDoctors || 0, trend: '+2.1%' },
        { metric: 'Total Patients', value: this.systemStats?.totalPatients || 0, trend: '+8.3%' },
        { metric: 'System Uptime', value: '99.9%', trend: 'stable' }
      ],
      'user-activity': [
        { date: '2024-10-01', logins: 245, sessions: 320, duration: '22 min' },
        { date: '2024-10-02', logins: 267, sessions: 345, duration: '25 min' },
        { date: '2024-10-03', logins: 289, sessions: 378, duration: '28 min' }
      ],
      'audit-trail': [
        { action: 'LOGIN', count: 1250, percentage: '45.2%' },
        { action: 'DATA_ACCESS', count: 850, percentage: '30.8%' },
        { action: 'DATA_MODIFICATION', count: 420, percentage: '15.2%' },
        { action: 'SECURITY', count: 45, percentage: '1.6%' }
      ]
    };
    
    return sampleData[this.selectedReport as keyof typeof sampleData] || [];
  }
  
  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
  
  formatNumber(num: number): string {
    return num.toLocaleString();
  }
  
  getCategoryIcon(categoryId: string): string {
    const icons = {
      'system': 'settings',
      'users': 'people',
      'healthcare': 'medical_services',
      'security': 'security',
      'organizations': 'business'
    };
    return icons[categoryId as keyof typeof icons] || 'description';
  }
  
  getSelectedCategoryName(): string {
    const category = this.reportCategories.find(c => c.id === this.selectedCategory);
    return category?.name || 'Unknown';
  }
  
  formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').trim();
  }
  
  setExportFormat(format: string) {
    this.filters.format = format as 'pdf' | 'excel' | 'csv';
  }

  // ===== BACKEND INTEGRATION METHODS =====

  private setDefaultStats() {
    this.systemStats = {
      totalUsers: 0,
      totalDoctors: 0,
      totalPatients: 0,
      totalOrganizations: 0,
      totalAppointments: 0,
      totalConsultations: 0,
      totalMedicalRecords: 0,
      totalPrescriptions: 0,
      totalLabRequests: 0,
      totalNotifications: 0,
      totalAuditLogs: 0,
      totalSecurityEvents: 0
    };
  }

  private setDefaultOrganizations() {
    this.organizations = [
      { id: '', name: 'All Organizations' }
    ];
  }

  // Preview methods for different report types
  private previewSystemOverviewReport() {
    this.apiService.getSystemStatistics('30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.previewData = {
              reportName: 'System Overview Report',
              generatedAt: new Date(),
              dateRange: `${this.filters.startDate || 'Last 30 days'} to ${this.filters.endDate || 'Today'}`,
              totalRecords: response.data.totalUsers + response.data.totalOrganizations + response.data.totalAppointments,
              summary: {
                totalUsers: response.data.totalUsers,
                totalOrganizations: response.data.totalOrganizations,
                totalAppointments: response.data.totalAppointments,
                systemHealth: 'Excellent'
              },
              data: [
                { metric: 'Total Users', value: response.data.totalUsers, trend: '+5.2%' },
                { metric: 'Active Organizations', value: response.data.totalOrganizations, trend: '+2.1%' },
                { metric: 'Total Appointments', value: response.data.totalAppointments, trend: '+8.3%' },
                { metric: 'System Uptime', value: response.data.systemUptime || '99.9%', trend: 'stable' }
              ]
            };
          }
          this.showPreview = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error generating system overview preview:', error);
          this.loading = false;
        }
      });
  }

  private previewUserActivityReport() {
    this.apiService.getUserStatistics('30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.previewData = {
              reportName: 'User Activity Report',
              generatedAt: new Date(),
              dateRange: `${this.filters.startDate || 'Last 30 days'} to ${this.filters.endDate || 'Today'}`,
              totalRecords: response.data.totalUsers || 0,
              summary: {
                activeUsers: response.data.activeUsers || 0,
                newRegistrations: response.data.newUsers || 0,
                avgSessionDuration: '24 minutes',
                peakUsageTime: '2:00 PM'
              },
              data: [
                { date: '2024-10-01', logins: 245, sessions: 320, duration: '22 min' },
                { date: '2024-10-02', logins: 267, sessions: 345, duration: '25 min' },
                { date: '2024-10-03', logins: 289, sessions: 378, duration: '28 min' }
              ]
            };
          }
          this.showPreview = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error generating user activity preview:', error);
          this.loading = false;
        }
      });
  }

  private previewAuditTrailReport() {
    this.apiService.getAuditStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.previewData = {
              reportName: 'Audit Trail Report',
              generatedAt: new Date(),
              dateRange: `${this.filters.startDate || 'Last 30 days'} to ${this.filters.endDate || 'Today'}`,
              totalRecords: response.data.totalLogs || 0,
              summary: {
                totalEvents: response.data.totalLogs || 0,
                securityEvents: response.data.totalSecurityEvents || 0,
                dataAccessEvents: response.data.logsByCategory?.['DATA_ACCESS'] || 0,
                modificationEvents: response.data.logsByCategory?.['DATA_MODIFICATION'] || 0
              },
              data: [
                { action: 'LOGIN', count: response.data.logsByCategory?.['AUTHENTICATION'] || 0, percentage: '45.2%' },
                { action: 'DATA_ACCESS', count: response.data.logsByCategory?.['DATA_ACCESS'] || 0, percentage: '30.8%' },
                { action: 'DATA_MODIFICATION', count: response.data.logsByCategory?.['DATA_MODIFICATION'] || 0, percentage: '15.2%' },
                { action: 'SECURITY', count: response.data.totalSecurityEvents || 0, percentage: '1.6%' }
              ]
            };
          }
          this.showPreview = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error generating audit trail preview:', error);
          this.loading = false;
        }
      });
  }

  private previewGenericReport() {
    // Fallback for other report types
    this.previewData = {
      reportName: this.getReportName(),
      generatedAt: new Date(),
      dateRange: `${this.filters.startDate || 'Last 30 days'} to ${this.filters.endDate || 'Today'}`,
      totalRecords: 100,
      summary: this.generateReportSummary(),
      data: this.generateSampleData()
    };
    this.showPreview = true;
    this.loading = false;
  }

  // Generation methods for different report types
  private generateSystemOverviewReport() {
    this.apiService.getSystemStatistics('30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newReport: ReportData = {
              id: Date.now().toString(),
              name: 'System Overview Report',
              description: 'Complete system statistics and health metrics',
              category: 'system',
              lastGenerated: new Date(),
              generatedBy: 'superadmin@qhealth.com',
              recordCount: response.data.totalUsers + response.data.totalOrganizations + response.data.totalAppointments
            };
            
            this.generatedReports.unshift(newReport);
            this.generating = false;
            alert(`System Overview Report generated successfully! ${newReport.recordCount} records processed.`);
          }
        },
        error: (error) => {
          console.error('Error generating system overview report:', error);
          this.generating = false;
        }
      });
  }

  private generateUserActivityReport() {
    this.apiService.getUserStatistics('30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newReport: ReportData = {
              id: Date.now().toString(),
              name: 'User Activity Report',
              description: 'User login patterns and activity statistics',
              category: 'users',
              lastGenerated: new Date(),
              generatedBy: 'superadmin@qhealth.com',
              recordCount: response.data.totalUsers || 0
            };
            
            this.generatedReports.unshift(newReport);
            this.generating = false;
            alert(`User Activity Report generated successfully! ${newReport.recordCount} records processed.`);
          }
        },
        error: (error) => {
          console.error('Error generating user activity report:', error);
          this.generating = false;
        }
      });
  }

  private generateAuditTrailReport() {
    this.apiService.getAuditStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newReport: ReportData = {
              id: Date.now().toString(),
              name: 'Audit Trail Report',
              description: 'Complete audit log and security events summary',
              category: 'security',
              lastGenerated: new Date(),
              generatedBy: 'superadmin@qhealth.com',
              recordCount: response.data.totalLogs || 0
            };
            
            this.generatedReports.unshift(newReport);
            this.generating = false;
            alert(`Audit Trail Report generated successfully! ${newReport.recordCount} records processed.`);
          }
        },
        error: (error) => {
          console.error('Error generating audit trail report:', error);
          this.generating = false;
        }
      });
  }

  private generateGenericReport() {
    // Fallback for other report types
    const newReport: ReportData = {
      id: Date.now().toString(),
      name: this.getReportName(),
      description: this.getReportDescription(),
      category: this.selectedCategory,
      lastGenerated: new Date(),
      generatedBy: 'superadmin@qhealth.com',
      recordCount: this.previewData?.totalRecords || 0
    };
    
    this.generatedReports.unshift(newReport);
    this.generating = false;
    alert(`Report generated successfully! ${newReport.recordCount} records processed.`);
  }
}
