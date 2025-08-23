import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';

interface ReportData {
  id: number;
  name: string;
  type: 'patient' | 'doctor' | 'consultation' | 'financial' | 'system';
  description: string;
  lastGenerated: string;
  status: 'ready' | 'generating' | 'failed';
  format: 'pdf' | 'excel' | 'csv';
  size: string;
  generatedBy: string;
}

interface ReportFilter {
  type: string;
  dateRange: string;
  status: string;
  format: string;
}

interface ReportType {
  value: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  reports: ReportData[] = [];
  filteredReports: ReportData[] = [];
  isLoading = true;
  selectedReport: ReportData | null = null;
  isGeneratingReport = false;
  showReportModal = false;
  
  filterForm: FormGroup;
  
  // Report types
  reportTypes: ReportType[] = [
    {
      value: 'patient',
      label: 'Patient Reports',
      icon: 'people',
      description: 'Patient demographics, medical history, and visit statistics'
    },
    {
      value: 'doctor',
      label: 'Doctor Reports',
      icon: 'medical_services',
      description: 'Doctor performance, consultation metrics, and availability'
    },
    {
      value: 'consultation',
      label: 'Consultation Reports',
      icon: 'video_call',
      description: 'Consultation logs, duration, and outcome analysis'
    },
    {
      value: 'financial',
      label: 'Financial Reports',
      icon: 'account_balance_wallet',
      description: 'Revenue, billing, and payment analytics'
    },
    {
      value: 'system',
      label: 'System Reports',
      icon: 'analytics',
      description: 'System usage, performance, and audit logs'
    }
  ];
  
  // Filter options
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
  
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'ready', label: 'Ready' },
    { value: 'generating', label: 'Generating' },
    { value: 'failed', label: 'Failed' }
  ];
  
  formatOptions = [
    { value: '', label: 'All Formats' },
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' }
  ];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      type: [''],
      dateRange: ['last30days'],
      status: [''],
      format: [''],
      searchTerm: ['']
    });
  }

  ngOnInit(): void {
    this.loadReports();
    this.setupFilterListener();
  }

  loadReports(): void {
    this.isLoading = true;
    
    // Simulate API call delay
    setTimeout(() => {
      this.reports = [
        {
          id: 1,
          name: 'Monthly Patient Summary',
          type: 'patient',
          description: 'Comprehensive monthly report of patient demographics and visit patterns',
          lastGenerated: '2024-01-15T10:30:00',
          status: 'ready',
          format: 'pdf',
          size: '2.4 MB',
          generatedBy: 'John Admin'
        },
        {
          id: 2,
          name: 'Doctor Performance Q4 2023',
          type: 'doctor',
          description: 'Quarterly analysis of doctor consultation metrics and patient satisfaction',
          lastGenerated: '2024-01-10T14:20:00',
          status: 'ready',
          format: 'excel',
          size: '1.8 MB',
          generatedBy: 'Sarah Manager'
        },
        {
          id: 3,
          name: 'Consultation Volume Analysis',
          type: 'consultation',
          description: 'Daily consultation volume trends and peak hour analysis',
          lastGenerated: '2024-01-14T09:15:00',
          status: 'ready',
          format: 'csv',
          size: '856 KB',
          generatedBy: 'Mike Analyst'
        },
        {
          id: 4,
          name: 'Financial Revenue Report',
          type: 'financial',
          description: 'Monthly revenue breakdown by service type and payment method',
          lastGenerated: '2024-01-12T16:45:00',
          status: 'ready',
          format: 'pdf',
          size: '3.2 MB',
          generatedBy: 'Lisa Finance'
        },
        {
          id: 5,
          name: 'System Performance Metrics',
          type: 'system',
          description: 'System uptime, response times, and error rate analysis',
          lastGenerated: '2024-01-13T11:30:00',
          status: 'ready',
          format: 'excel',
          size: '1.5 MB',
          generatedBy: 'David IT'
        },
        {
          id: 6,
          name: 'Patient Satisfaction Survey',
          type: 'patient',
          description: 'Monthly patient satisfaction scores and feedback analysis',
          lastGenerated: '2024-01-11T13:20:00',
          status: 'generating',
          format: 'pdf',
          size: '--',
          generatedBy: 'John Admin'
        },
        {
          id: 7,
          name: 'Doctor Availability Report',
          type: 'doctor',
          description: 'Weekly doctor availability and scheduling efficiency',
          lastGenerated: '2024-01-09T15:10:00',
          status: 'failed',
          format: 'excel',
          size: '--',
          generatedBy: 'Sarah Manager'
        }
      ];
      
      this.filteredReports = [...this.reports];
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
    
    this.filteredReports = this.reports.filter(report => {
      // Type filter
      if (filters.type && report.type !== filters.type) return false;
      
      // Status filter
      if (filters.status && report.status !== filters.status) return false;
      
      // Format filter
      if (filters.format && report.format !== filters.format) return false;
      
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          report.name.toLowerCase().includes(searchLower) ||
          report.description.toLowerCase().includes(searchLower) ||
          report.generatedBy.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      type: '',
      dateRange: 'last30days',
      status: '',
      format: '',
      searchTerm: ''
    });
  }

  generateReport(reportType: string): void {
    this.isGeneratingReport = true;
    
    // Simulate report generation
    setTimeout(() => {
      const newReport: ReportData = {
        id: Date.now(),
        name: `${this.getReportTypeLabel(reportType)} Report - ${new Date().toLocaleDateString()}`,
        type: reportType as any,
        description: `Automatically generated ${reportType} report`,
        lastGenerated: new Date().toISOString(),
        status: 'ready',
        format: 'pdf',
        size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
        generatedBy: 'John Admin'
      };
      
      this.reports.unshift(newReport);
      this.applyFilters();
      this.isGeneratingReport = false;
      
      // Show success message
      alert(`Report generated successfully!`);
    }, 3000);
  }

  getReportTypeLabel(type: string): string {
    const reportType = this.reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.label : type;
  }

  downloadReport(report: ReportData): void {
    if (report.status === 'ready') {
      // Simulate download
      alert(`Downloading ${report.name}...`);
    } else if (report.status === 'generating') {
      alert('Report is still being generated. Please wait.');
    } else {
      alert('Report generation failed. Please try regenerating.');
    }
  }

  regenerateReport(report: ReportData): void {
    report.status = 'generating';
    report.size = '--';
    
    // Simulate regeneration
    setTimeout(() => {
      report.status = 'ready';
      report.size = `${(Math.random() * 5 + 1).toFixed(1)} MB`;
      report.lastGenerated = new Date().toISOString();
    }, 2000);
  }

  deleteReport(report: ReportData): void {
    if (confirm(`Are you sure you want to delete "${report.name}"?`)) {
      const index = this.reports.findIndex(r => r.id === report.id);
      if (index > -1) {
        this.reports.splice(index, 1);
        this.applyFilters();
      }
    }
  }

  viewReportDetails(report: ReportData): void {
    this.selectedReport = report;
    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.selectedReport = null;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ready': return 'status-ready';
      case 'generating': return 'status-generating';
      case 'failed': return 'status-failed';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ready': return 'check_circle';
      case 'generating': return 'hourglass_empty';
      case 'failed': return 'error';
      default: return 'help';
    }
  }

  getFormatIcon(format: string): string {
    switch (format) {
      case 'pdf': return 'picture_as_pdf';
      case 'excel': return 'table_chart';
      case 'csv': return 'description';
      default: return 'insert_drive_file';
    }
  }

  getReportTypeIcon(type: string): string {
    const reportType = this.reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.icon : 'description';
  }

  getReportCountByType(type: string): number {
    return this.reports.filter(r => r.type === type).length;
  }

  getTotalReportCount(): number {
    return this.reports.length;
  }

  getReadyReportCount(): number {
    return this.reports.filter(r => r.status === 'ready').length;
  }
}
