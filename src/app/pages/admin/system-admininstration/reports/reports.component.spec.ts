import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ReportsComponent } from './reports.component';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReportsComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.reports).toEqual([]);
    expect(component.filteredReports).toEqual([]);
    expect(component.isLoading).toBe(true);
    expect(component.selectedReport).toBeNull();
    expect(component.isGeneratingReport).toBe(false);
    expect(component.showReportModal).toBe(false);
  });

  it('should have report types defined', () => {
    expect(component.reportTypes.length).toBe(5);
    expect(component.reportTypes[0].value).toBe('patient');
    expect(component.reportTypes[0].label).toBe('Patient Reports');
  });

  it('should have filter options defined', () => {
    expect(component.dateRangeOptions.length).toBeGreaterThan(0);
    expect(component.statusOptions.length).toBeGreaterThan(0);
    expect(component.formatOptions.length).toBeGreaterThan(0);
  });

  it('should load reports on init', (done) => {
    setTimeout(() => {
      expect(component.reports.length).toBeGreaterThan(0);
      expect(component.isLoading).toBe(false);
      done();
    }, 1100);
  });

  it('should apply filters correctly', (done) => {
    setTimeout(() => {
      const initialCount = component.filteredReports.length;
      
      component.filterForm.patchValue({ type: 'patient' });
      expect(component.filteredReports.length).toBeLessThanOrEqual(initialCount);
      
      done();
    }, 1100);
  });

  it('should clear filters', (done) => {
    setTimeout(() => {
      component.filterForm.patchValue({ type: 'patient' });
      component.clearFilters();
      
      expect(component.filterForm.get('type')?.value).toBe('');
      expect(component.filterForm.get('dateRange')?.value).toBe('last30days');
      done();
    }, 1100);
  });

  it('should generate new report', (done) => {
    component.generateReport('patient');
    expect(component.isGeneratingReport).toBe(true);
    
    setTimeout(() => {
      expect(component.isGeneratingReport).toBe(false);
      expect(component.reports.length).toBeGreaterThan(0);
      done();
    }, 3100);
  });

  it('should get report type label', () => {
    const label = component.getReportTypeLabel('patient');
    expect(label).toBe('Patient Reports');
  });

  it('should get status class', () => {
    expect(component.getStatusClass('ready')).toBe('status-ready');
    expect(component.getStatusClass('generating')).toBe('status-generating');
    expect(component.getStatusClass('failed')).toBe('status-failed');
  });

  it('should get status icon', () => {
    expect(component.getStatusIcon('ready')).toBe('check_circle');
    expect(component.getStatusIcon('generating')).toBe('hourglass_empty');
    expect(component.getStatusIcon('failed')).toBe('error');
  });

  it('should get format icon', () => {
    expect(component.getFormatIcon('pdf')).toBe('picture_as_pdf');
    expect(component.getFormatIcon('excel')).toBe('table_chart');
    expect(component.getFormatIcon('csv')).toBe('description');
  });

  it('should get report type icon', () => {
    const icon = component.getReportTypeIcon('patient');
    expect(icon).toBe('people');
  });

  it('should count reports by type', (done) => {
    setTimeout(() => {
      const patientCount = component.getReportCountByType('patient');
      expect(patientCount).toBeGreaterThanOrEqual(0);
      done();
    }, 1100);
  });

  it('should get total report count', (done) => {
    setTimeout(() => {
      const totalCount = component.getTotalReportCount();
      expect(totalCount).toBeGreaterThan(0);
      done();
    }, 1100);
  });

  it('should get ready report count', (done) => {
    setTimeout(() => {
      const readyCount = component.getReadyReportCount();
      expect(readyCount).toBeGreaterThanOrEqual(0);
      done();
    }, 1100);
  });

  it('should open report modal', (done) => {
    setTimeout(() => {
      const firstReport = component.reports[0];
      component.viewReportDetails(firstReport);
      
      expect(component.selectedReport).toBe(firstReport);
      expect(component.showReportModal).toBe(true);
      done();
    }, 1100);
  });

  it('should close report modal', (done) => {
    setTimeout(() => {
      const firstReport = component.reports[0];
      component.viewReportDetails(firstReport);
      component.closeReportModal();
      
      expect(component.selectedReport).toBeNull();
      expect(component.showReportModal).toBe(false);
      done();
    }, 1100);
  });

  it('should handle report download', (done) => {
    setTimeout(() => {
      const readyReport = component.reports.find(r => r.status === 'ready');
      if (readyReport) {
        spyOn(window, 'alert');
        component.downloadReport(readyReport);
        expect(window.alert).toHaveBeenCalled();
      }
      done();
    }, 1100);
  });

  it('should handle report regeneration', (done) => {
    setTimeout(() => {
      const firstReport = component.reports[0];
      const initialStatus = firstReport.status;
      
      component.regenerateReport(firstReport);
      expect(firstReport.status).toBe('generating');
      
      setTimeout(() => {
        expect(firstReport.status).toBe('ready');
        done();
      }, 2100);
    }, 1100);
  });

  it('should handle report deletion', (done) => {
    setTimeout(() => {
      const initialCount = component.reports.length;
      const firstReport = component.reports[0];
      
      spyOn(window, 'confirm').and.returnValue(true);
      component.deleteReport(firstReport);
      
      expect(component.reports.length).toBe(initialCount - 1);
      done();
    }, 1100);
  });
});
