import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Pipe, PipeTransform, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FaceScanService, FaceScanRequest } from '../services/face-scan.service';
import { HealthScanService, FaceScanResult } from '../services/health-scan.service';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../shared/header/header.component';
import { HealthReportDisplayComponent, HealthScanResults } from '../shared/components/health-report-display/health-report-display.component';
@Pipe({
  name: 'safe',
  standalone: true
})
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

@Component({
  selector: 'app-face-scan',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SafePipe, HeaderComponent, HealthReportDisplayComponent],
  templateUrl: './face-scan.component.html',
  styleUrl: './face-scan.component.scss'
})
export class FaceScanComponent implements OnInit, OnDestroy {
  @ViewChild('scanIframe', { static: false }) scanIframe!: ElementRef;

  isScanning = false;
  isScanningComplete = false;
  isLoading = false;
  scanComplete = false;
  scanTimeRemaining: number = 0;
  
  userAge?: number;
  userGender?: string;
  
  iframeUrl = '';
  scanStatus: any = null;
  scanResults: FaceScanResult[] = [];
  healthScanResults: HealthScanResults | null = null;
  
  recipientEmail: string = '';
  emailStatus: string = '';
  showEmailSuccessModal: boolean = false;

  // Health scan save status
  isSavingToDatabase: boolean = false;
  saveStatus: string = '';
  showSaveSuccessModal: boolean = false;
  showSaveErrorModal: boolean = false;

  // Authentication state
  isLoggedIn: boolean = false;

  // Modal state for metric details
  showMetricModal: boolean = false;
  selectedMetric: any = null;
  
  private subscription = new Subscription();

  constructor(
    private faceScanService: FaceScanService,
    private healthScanService: HealthScanService,
    private router: Router, 
    private cdr: ChangeDetectorRef, 
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Check authentication state
    this.checkAuthenticationState();
    
    // Enable detailed debugging
    this.enableDebugging();
    
    // Make debug method available
    this.debugCurrentState();
  }

  private enableDebugging(): void {
    // Log all window messages to help debug iframe communication
    window.addEventListener('message', (event) => {
      let sourceName = 'unknown';
      try {
        sourceName = event.source?.constructor?.name || 'unknown';
      } catch (e) {
        sourceName = 'cross-origin';
      }
      console.log('🌐 ALL window messages:', {
        origin: event.origin,
        data: event.data,
        source: sourceName,
        timestamp: new Date().toISOString()
      });
    });

    // Override console methods to catch any errors
    const originalError = console.error;
    console.error = (...args) => {
      originalError.call(console, '🚨 ERROR CAUGHT:', ...args);
    };

    // Add network monitoring
    this.monitorNetworkRequests();
  }

  private monitorNetworkRequests(): void {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('🌐 FETCH REQUEST:', args);
      try {
        const response = await originalFetch(...args);
        console.log('✅ FETCH RESPONSE:', {
          url: args[0],
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        return response;
      } catch (error) {
        console.error('❌ FETCH ERROR:', error);
        throw error;
      }
    };

    // Monitor console.log to catch VSE Plugin results
    const originalLog = console.log;
    console.log = (...args) => {
      // Check if this looks like VSE Plugin results
      if (args.length > 0) {
        const logMessage = args.join(' ');
        if (logMessage.includes('[VSE Plugin]') && (
          logMessage.includes('health_risks') || 
          logMessage.includes('vital_signs') ||
          logMessage.includes('holistic_health') ||
          args[0]?.health_risks || 
          args[0]?.vital_signs || 
          args[0]?.holistic_health
        )) {
          console.log('🎯 INTERCEPTED VSE Plugin Results:', args);
          this.processVSEPluginResults(args);
        }
      }
      originalLog.apply(console, args);
    };
  }

  private processVSEPluginResults(logArgs: any[]): void {
    console.log('🔄 Processing intercepted VSE Plugin results...');
    
    // Look for the results object in the log arguments
    let resultsObj = null;
    
    for (const arg of logArgs) {
      if (arg && typeof arg === 'object' && (
        arg.health_risks || arg.vital_signs || arg.holistic_health
      )) {
        resultsObj = arg;
        break;
      }
    }

    if (resultsObj) {
      console.log('✅ Found VSE Plugin results object:', resultsObj);
      
      // Debug current state before changes
      console.log('📊 State BEFORE processing:', {
        isScanning: this.isScanning,
        scanComplete: this.scanComplete,
        hasResults: this.scanResults.length > 0
      });
      
      // Process this as if it came from onHealthAnalysisFinished
      this.isScanning = false;
      this.scanComplete = true;
      
      // Debug state after changes
      console.log('📊 State AFTER processing:', {
        isScanning: this.isScanning,
        scanComplete: this.scanComplete,
        hasResults: this.scanResults.length > 0
      });
      
      const processedResults = this.extractResultsFromVSEPlugin(resultsObj);
      
      if (processedResults.length > 0) {
        console.log('🎉 Successfully extracted real health results from VSE Plugin!');
        this.scanResults = processedResults;
        
        // Convert to HealthScanResults format for health-report-display
        this.healthScanResults = this.convertToHealthScanResults(processedResults);
        
        // Save results to database only if user is logged in
        if (this.isLoggedIn) {
          this.saveHealthScanResults();
        }
      } else {
        console.log('⚠️ Failed to process VSE Plugin results, showing mock data');
        // this.showMockResults(); // REMOVED
      }
      
      // Force change detection to ensure UI updates
      console.log('🔄 Forcing change detection...');
      this.cdr.detectChanges();
      
      // Final state check
      console.log('📊 FINAL state after change detection:', {
        isScanning: this.isScanning,
        scanComplete: this.scanComplete,
        hasResults: this.scanResults.length > 0
      });
    }
  }

  private extractResultsFromVSEPlugin(vseData: any): any[] {
    console.log('🔍 Extracting results from VSE Plugin data:', vseData);
    const results: any[] = [];

    // Extract vital signs
    if (vseData.vital_signs) {
      const vs = vseData.vital_signs;
      
      if (vs.heart_rate) {
        results.push({
          title: 'Heart Rate',
          description: 'Heart rate measurement from facial blood flow analysis.',
          score: Math.round(vs.heart_rate),
          value: `${vs.heart_rate.toFixed(1)} bpm`,
          category: 'heartRate',
          status: this.getStatusFromValue('heartRate', vs.heart_rate),
          color: this.getColorFromValue('heartRate', vs.heart_rate),
          normalRange: '60-100 bpm'
        });
      }

      if (vs.respiratory_rate) {
        results.push({
          title: 'Respiratory Rate',
          description: 'Breathing rate detected through facial monitoring.',
          score: Math.round(vs.respiratory_rate),
          value: `${vs.respiratory_rate.toFixed(1)} bpm`,
          category: 'respiratoryRate',
          status: this.getStatusFromValue('respiratoryRate', vs.respiratory_rate),
          color: this.getColorFromValue('respiratoryRate', vs.respiratory_rate),
          normalRange: '12-20 bpm'
        });
      }

      if (vs.spo2) {
        results.push({
          title: 'Oxygen Saturation',
          description: 'Blood oxygen level estimation.',
          score: Math.round(vs.spo2),
          value: `${vs.spo2.toFixed(1)}%`,
          category: 'oxygenSaturation',
          status: this.getStatusFromValue('oxygenSaturation', vs.spo2),
          color: this.getColorFromValue('oxygenSaturation', vs.spo2),
          normalRange: '95-100%'
        });
      }
    }

    // Extract holistic health
    if (vseData.holistic_health) {
      const hh = vseData.holistic_health;
      
      if (hh.general_wellness) {
        results.push({
          title: 'Overall Health Score',
          description: 'Your comprehensive health assessment based on facial analysis.',
          score: Math.round(hh.general_wellness),
          value: `${hh.general_wellness.toFixed(1)}%`,
          category: 'overall',
          status: this.getStatusFromScore(hh.general_wellness),
          color: this.getColorFromScore(hh.general_wellness)
        });
      }

      if (hh.cardiac_workload) {
        results.push({
          title: 'Cardiac Workload',
          description: 'Assessment of cardiovascular stress and workload.',
          score: Math.round(hh.cardiac_workload),
          value: hh.cardiac_workload.toFixed(1),
          category: 'cardiac',
          status: 'Good',
          color: 'orange'
        });
      }
    }

    // Extract health risks (convert to percentages)
    if (vseData.health_risks) {
      const hr = vseData.health_risks;
      
      if (hr.cvd_risk_CHF) {
        results.push({
          title: 'Risk of Congestive Heart Failure',
          description: 'Cardiovascular risk assessment.',
          score: hr.cvd_risk_CHF * 100,
          value: `${(hr.cvd_risk_CHF * 100).toFixed(2)}%`,
          category: 'heartFailureRisk',
          status: this.getStatusFromRisk(hr.cvd_risk_CHF * 100),
          color: this.getColorFromRisk(hr.cvd_risk_CHF * 100),
          normalRange: '< 2%'
        });
      }

      if (hr.cvd_risk_CHD) {
        results.push({
          title: 'Risk of Coronary Heart Disease',
          description: 'Coronary artery disease risk assessment.',
          score: hr.cvd_risk_CHD * 100,
          value: `${(hr.cvd_risk_CHD * 100).toFixed(2)}%`,
          category: 'coronaryRisk',
          status: this.getStatusFromRisk(hr.cvd_risk_CHD * 100),
          color: this.getColorFromRisk(hr.cvd_risk_CHD * 100),
          normalRange: '< 5%'
        });
      }

      if (hr.cvd_risk_Stroke) {
        results.push({
          title: 'Risk of Stroke',
          description: 'Stroke risk assessment based on cardiovascular indicators.',
          score: hr.cvd_risk_Stroke * 100,
          value: `${(hr.cvd_risk_Stroke * 100).toFixed(2)}%`,
          category: 'strokeRisk',
          status: this.getStatusFromRisk(hr.cvd_risk_Stroke * 100),
          color: this.getColorFromRisk(hr.cvd_risk_Stroke * 100),
          normalRange: '< 2%'
        });
      }

      if (hr.cvd_risk_general) {
        results.push({
          title: 'General Cardiovascular Risk',
          description: 'Overall cardiovascular disease risk assessment.',
          score: hr.cvd_risk_general * 100,
          value: `${(hr.cvd_risk_general * 100).toFixed(2)}%`,
          category: 'cvdRisk',
          status: this.getStatusFromRisk(hr.cvd_risk_general * 100),
          color: this.getColorFromRisk(hr.cvd_risk_general * 100),
          normalRange: '< 2%'
        });
      }
    }

    console.log(`✅ Extracted ${results.length} real health metrics from VSE Plugin:`, results);
    return results;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Check if user is logged in
   */
  private checkAuthenticationState(): void {
    const token = localStorage.getItem('accessToken');
    this.isLoggedIn = !!token;
    console.log('🔐 Authentication state:', { isLoggedIn: this.isLoggedIn, hasToken: !!token });
  }

  startScan(): void {
    this.isLoading = true;
    
    // Generate a unique client ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the scan request
    const request: FaceScanRequest = this.faceScanService.createDefaultRequest(clientId);
    
    if (this.userAge) {
      request.age = this.userAge;
    }
    
    if (this.userGender) {
      request.gender = this.userGender;
    }

    this.subscription.add(
      this.faceScanService.generateVideoToken(request).subscribe({
        next: (response) => {
          if (response.success) {
            this.iframeUrl = response.videoIframeUrl;
            this.isScanning = true;
            this.isLoading = false;
            this.setupMessageHandler();
          } else {
            console.error('Failed to generate video token');
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error generating video token:', error);
          this.isLoading = false;
        }
      })
    );
  }

  private setupMessageHandler(): void {
    // Remove the timeout and set up handler immediately
    console.log('🔧 Setting up iframe message handler...');
    
    // Clear any existing listeners to avoid duplicates
    window.removeEventListener('message', this.messageHandler);
    
    // Bind the handler to preserve 'this' context
    this.messageHandler = this.messageHandler.bind(this);
    window.addEventListener('message', this.messageHandler);
    
    // Also set up a delayed handler as backup
    setTimeout(() => {
      console.log('🔧 Setting up backup message handler...');
      const iframe = document.getElementById('face-scan-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        console.log('✅ Iframe found and ready');
        // Send a test message to establish communication
        iframe.contentWindow.postMessage({ action: 'ping' }, '*');
      } else {
        console.warn('⚠️ Iframe not found or not ready');
      }
    }, 2000);
  }

  private messageHandler = (event: MessageEvent) => {
    // Log ALL messages to help debug
    let sourceName = 'unknown';
    try {
      sourceName = event.source?.constructor?.name || 'unknown';
    } catch (e) {
      sourceName = 'cross-origin';
    }
    console.log('📨 Raw message received:', {
      origin: event.origin,
      source: sourceName,
      data: event.data,
      dataKeys: typeof event.data === 'object' ? Object.keys(event.data || {}) : 'not object',
      timestamp: new Date().toISOString()
    });

    const iframe = document.getElementById('face-scan-iframe') as HTMLIFrameElement;
    if (iframe && event.source === iframe.contentWindow) {
      console.log('✅ Confirmed message from our iframe:', event.data);
      console.log('🔍 Message details:');
      console.log('📋 Data type:', typeof event.data);
      console.log('📋 Data keys:', typeof event.data === 'object' ? Object.keys(event.data || {}) : 'N/A');
      console.log('📋 Full data JSON:', JSON.stringify(event.data, null, 2));
      this.handleInsightGenieMessage(event.data);
    } else {
      console.log('ℹ️ Message from different source - ignoring');
    }
  };

  private handleInsightGenieMessage(data: any): void {
    console.log('🔍 Processing InsightGenie message:', {
      action: data.action,
      type: data.type,
      fullData: data,
      timestamp: new Date().toISOString()
    });
    
    // Handle messages based on official InsightGenie documentation
    switch (data.action) {
      case 'onAnalysisStart':
        console.log('✅ Analysis started');
        this.updateScanStatus({ analyzing: true });
        break;
        
      case 'onHealthAnalysisFinished':
        console.log('🎉 Health analysis finished - processing results:', data);
        this.handleHealthAnalysisComplete(data);
        break;
        
      case 'onVoiceAnalysisFinished':
        console.log('🎵 Voice analysis finished:', data);
        // Handle voice analysis if needed
        break;
        
      case 'conditionStatus':
        console.log('📊 Condition status update:', data);
        this.updateScanStatus(data);
        break;
        
      case 'scanTimeRemaining':
        console.log('⏱️ Scan time remaining:', data);
        this.scanTimeRemaining = data.analysisData || 0;
        break;
        
      case 'videoElementDimensions':
        console.log('📐 Video dimensions:', data);
        // Handle video dimensions if needed
        break;
        
      case 'failedToGetResults':
      case 'failedToGetHealthAnalysisResult':
      case 'failedToGetVoiceAnalysisResult':
        console.error('❌ Failed to get results:', data);
        this.handleScanError();
        break;
        
      case 'failedToLoadPage':
        console.error('❌ Failed to load page:', data);
        this.handleScanError();
        break;
        
      default:
        console.log('ℹ️ Unknown action:', data.action, data);
        
        // Check if this message contains result indicators anyway
        const hasResultIndicators = this.checkForResultIndicators(data);
        if (hasResultIndicators) {
          console.log('🔗 Found result indicators, treating as completion event');
          this.handleHealthAnalysisComplete(data);
        }
        break;
    }
  }

  private handleHealthAnalysisComplete(data: any): void {
    console.log('🎯 Processing health analysis completion with data:', data);
    console.log('🔍 DETAILED MESSAGE INSPECTION:');
    console.log('📋 Message keys:', Object.keys(data));
    console.log('📋 Message JSON:', JSON.stringify(data, null, 2));
    
    // Debug current state before changes
    console.log('📊 State BEFORE health analysis complete:', {
      isScanning: this.isScanning,
      scanComplete: this.scanComplete,
      hasResults: this.scanResults.length > 0
    });
    
    this.isScanning = false;
    this.scanComplete = true;

    // Debug state after changes
    console.log('📊 State AFTER health analysis complete:', {
      isScanning: this.isScanning,
      scanComplete: this.scanComplete,
      hasResults: this.scanResults.length > 0
    });

    // Extract results from the onHealthAnalysisFinished message
    // According to the docs, this message comes "along with detailed analysis data"
    const results = this.extractResultsFromHealthAnalysis(data);
    
    if (results.length > 0) {
      console.log('✅ Successfully extracted results from health analysis message');
      this.scanResults = results;
      
      // Convert to HealthScanResults format for health-report-display
      this.healthScanResults = this.convertToHealthScanResults(results);
      
      // Save results to database only if user is logged in
      if (this.isLoggedIn) {
        this.saveHealthScanResults();
      }
    } else {
      console.log('⚠️ No results found in health analysis message, showing mock results');
      console.log('📊 Raw health analysis data keys:', Object.keys(data));
      console.log('📊 Raw health analysis data full:', data);
      // this.showMockResults(); // REMOVED
    }
    
    // Force change detection to ensure UI updates
    console.log('🔄 Forcing change detection after health analysis...');
    this.cdr.detectChanges();
    
    // Final state check
    console.log('📊 FINAL state after health analysis change detection:', {
      isScanning: this.isScanning,
      scanComplete: this.scanComplete,
      hasResults: this.scanResults.length > 0
    });
  }

  private extractResultsFromHealthAnalysis(data: any): any[] {
    console.log('🔍 Extracting results from health analysis message:', data);
    console.log('🔍 Data structure analysis:');
    console.log('📋 Data type:', typeof data);
    console.log('📋 Data keys:', typeof data === 'object' ? Object.keys(data || {}) : 'N/A');
    
    // The results might be in different locations within the message
    const possibleResultLocations = [
      data.analysisData,
      data.healthData,
      data.results,
      data.analysis,
      data.scores,
      data.biomarkers,
      data.metrics,
      data.healthAnalysis,
      data.scanResults,
      data.response,
      data.payload,
      data.data,
      data // The data itself might contain the results
    ];

    console.log('🔍 Checking possible result locations:');
    for (let i = 0; i < possibleResultLocations.length; i++) {
      const resultData = possibleResultLocations[i];
      const locationName = [
        'analysisData', 'healthData', 'results', 'analysis', 'scores', 
        'biomarkers', 'metrics', 'healthAnalysis', 'scanResults', 
        'response', 'payload', 'data', 'root data'
      ][i];
      
      console.log(`📋 Location ${locationName}:`, typeof resultData, resultData ? Object.keys(resultData) : 'null/undefined');
      
      if (resultData && typeof resultData === 'object') {
        console.log(`🔍 Detailed ${locationName}:`, JSON.stringify(resultData, null, 2));
        const processedResults = this.processResults(resultData);
        if (processedResults.length > 0) {
          console.log(`✅ Found ${processedResults.length} results in ${locationName}:`, processedResults);
          return processedResults;
        }
      }
    }

    // If no structured results found, try to process the entire message
    console.log('🔍 No results found in specific locations, trying to process entire message');
    return this.processResults(data);
  }

  private checkForResultIndicators(data: any): boolean {
    // Check for various ID fields that might indicate results are ready
    const idFields = [
      'analysisId', 'analysis_id',
      'sessionId', 'session_id', 
      'resultId', 'result_id',
      'scoreId', 'score_id',
      'trackingId', 'tracking_id',
      'id', 'uuid', 'scanId', 'scan_id'
    ];

    const hasId = idFields.some(field => data[field] !== undefined && data[field] !== null);
    
    // Check for score/result data directly in the message
    const hasDirectResults = !!(
      data.scores || 
      data.results || 
      data.analysis || 
      data.heartRate || 
      data.bloodPressure || 
      data.stress
    );

    console.log('🔍 Result indicators check:', {
      hasId,
      hasDirectResults,
      idFields: idFields.filter(field => data[field] !== undefined),
      resultFields: ['scores', 'results', 'analysis', 'heartRate', 'bloodPressure', 'stress'].filter(field => data[field] !== undefined)
    });

    return hasId || hasDirectResults;
  }

  private extractAllPossibleIds(data: any): any {
    const ids: any = {};
    
    // Standard InsightGenie ID fields
    const idMappings = [
      { key: 'analysisId', variants: ['analysisId', 'analysis_id', 'analysis-id'] },
      { key: 'sessionId', variants: ['sessionId', 'session_id', 'session-id'] },
      { key: 'resultId', variants: ['resultId', 'result_id', 'result-id'] },
      { key: 'scoreId', variants: ['scoreId', 'score_id', 'score-id'] },
      { key: 'trackingId', variants: ['trackingId', 'tracking_id', 'tracking-id'] },
      { key: 'scanId', variants: ['scanId', 'scan_id', 'scan-id'] },
      { key: 'id', variants: ['id', 'uuid', 'clientId', 'client_id'] }
    ];

    idMappings.forEach(mapping => {
      mapping.variants.forEach(variant => {
        if (data[variant] !== undefined && data[variant] !== null) {
          ids[mapping.key] = data[variant];
        }
      });
    });

    // Also check nested objects
    if (data.analysis) {
      Object.assign(ids, this.extractAllPossibleIds(data.analysis));
    }
    if (data.result) {
      Object.assign(ids, this.extractAllPossibleIds(data.result));
    }
    if (data.score) {
      Object.assign(ids, this.extractAllPossibleIds(data.score));
    }

    return ids;
  }

  private selectBestId(ids: any): string | null {
    // Priority order for which ID to use
    const priority = ['analysisId', 'sessionId', 'resultId', 'scoreId', 'trackingId', 'scanId', 'id'];
    
    for (const key of priority) {
      if (ids[key] && typeof ids[key] === 'string' && ids[key].length > 0) {
        console.log(`✅ Selected ${key}: ${ids[key]}`);
        return ids[key];
      }
    }
    
    console.log('❌ No suitable ID found');
    return null;
  }

  private extractDirectResults(data: any): any[] {
    console.log('🔍 Checking for direct results in message data');
    
    // If the message contains direct results, process them
    if (data.scores || data.results || data.analysis) {
      return this.processResults(data);
    }
    
    // Check for individual health metrics
    const hasHealthMetrics = !!(
      data.heartRate || data.bloodPressure || data.stress ||
      data.oxygenSaturation || data.respiratoryRate
    );
    
    if (hasHealthMetrics) {
      return this.processResults(data);
    }
    
    return [];
  }

  private fetchRealResults(primaryId: string, originalData?: any): void {
    console.log(`🔄 Note: Based on official InsightGenie API docs, no result APIs exist for ID: ${primaryId}`);
    console.log('📋 According to https://panel.insightgenie.ai/api-docs, results should come through iframe messages only');
    console.log('🔍 Processing original iframe data instead...');
    
    // Since no result APIs exist, process the original iframe data
    if (originalData && Object.keys(originalData).length > 0) {
      const processedResults = this.processResults(originalData);
      if (processedResults.length > 0) {
        console.log('✅ Found results in original iframe data');
        this.scanResults = processedResults;
        } else {
        console.log('⚠️ No meaningful results in iframe data, showing mock results');
        // this.showMockResults(); // REMOVED
      }
    } else {
      console.log('⚠️ No original data available, showing mock results');
      // this.showMockResults(); // REMOVED
    }
  }

  private updateScanStatus(data: any): void {
    this.scanStatus = {
      centered: data.faceDetected || data.centered || false,
      lighting: data.lightingGood || data.lighting || false,
      movement: data.tooMuchMovement || data.movement || false
    };
  }

  private fetchResultsWithFallback(primaryId: string, sessionId?: string, trackingId?: string, originalData?: any): void {
    // Legacy method - redirect to new implementation
    this.fetchRealResults(primaryId, originalData);
  }

  private isValidResponse(response: any): boolean {
    if (!response) return false;
    
    // Check for common valid response patterns
    return !!(
      response.scores ||
      response.healthAssessment ||
      response.results ||
      response.analysis ||
      (response.heartRate !== undefined) ||
      (response.bloodPressure !== undefined) ||
      (response.stress !== undefined) ||
      Object.keys(response).length > 0
    );
  }

  private processAndDisplayResults(response: any, source: string): void {
    console.log(`📊 Processing results from ${source}:`, response);
    
    const processedResults = this.processResults(response);
    
    if (processedResults.length > 0) {
      console.log('✅ Successfully processed results:', processedResults);
      this.scanResults = processedResults;
    } else {
      console.log('⚠️ No meaningful results found, showing mock data');
      // this.showMockResults(); // REMOVED
    }
  }

  private tryHealthAssessment(primaryId: string, originalData?: any): void {
    console.log(`🔄 Trying health assessment for ID: ${primaryId}`);
    
    this.faceScanService.getHealthAssessment(primaryId).subscribe({
      next: (healthResponse) => {
        console.log('✅ Health assessment response:', healthResponse);
        if (this.isValidResponse(healthResponse)) {
          this.processAndDisplayResults(healthResponse, 'health-assessment');
        } else {
          console.log('⚠️ Health assessment response invalid, trying detailed results...');
          this.tryDetailedResults(primaryId, originalData);
        }
      },
      error: (err) => {
        console.warn('❌ Health assessment failed:', err);
        this.tryDetailedResults(primaryId, originalData);
      }
    });
  }

  private tryDetailedResults(primaryId: string, originalData?: any): void {
    console.log(`🔄 Trying detailed results for ID: ${primaryId}`);
    
    this.faceScanService.getDetailedResults(primaryId).subscribe({
      next: (detailedResponse) => {
        console.log('✅ Detailed results response:', detailedResponse);
        if (this.isValidResponse(detailedResponse)) {
          this.processAndDisplayResults(detailedResponse, 'detailed-results');
        } else {
          console.log('⚠️ Detailed results response invalid, using original data...');
          this.processOriginalData(originalData);
        }
      },
      error: (err) => {
        console.warn('❌ Detailed results failed:', err);
        this.processOriginalData(originalData);
      }
    });
  }

  private processOriginalData(originalData?: any): void {
    if (originalData && Object.keys(originalData).length > 0) {
      const processedResults = this.processResults(originalData);
      // If processResults didn't find meaningful data, show mock results
      if (processedResults.length === 0 || (processedResults.length === 1 && processedResults[0].category === 'info')) {
        // this.showMockResults(); // REMOVED
      } else {
        this.scanResults = processedResults;
      }
    } else {
      // this.showMockResults(); // REMOVED
    }
  }

  private showMockResults(): void {
    console.log('🎲 Generating randomized realistic health results');
    
    // Generate base health profile (affects related metrics)
    const healthProfile = this.generateHealthProfile();
    
    // Generate randomized but realistic values
    const heartRate = this.randomInRange(55, 95) + (healthProfile.isStressed ? this.randomInRange(5, 15) : 0);
    const systolicBP = this.randomInRange(95, 140) + (healthProfile.hypertensionRisk ? this.randomInRange(10, 20) : 0);
    const diastolicBP = this.randomInRange(60, 85) + (healthProfile.hypertensionRisk ? this.randomInRange(5, 10) : 0);
    const oxygenSat = this.randomInRange(95, 100, 1);
    const respRate = this.randomInRange(12, 18, 1);
    const stressLevel = healthProfile.isStressed ? this.randomInRange(2, 8, 1) : this.randomInRange(0, 3, 1);
    
    // Calculate overall health score based on metrics
    const overallScore = this.calculateOverallHealthScore({
      heartRate, systolicBP, diastolicBP, oxygenSat, respRate, stressLevel
    });
    
    // Generate risk percentages (lower if healthier)
    const baseRiskMultiplier = healthProfile.isHealthy ? 0.3 : healthProfile.hasRisk ? 2.0 : 1.0;
    const heartFailureRisk = this.randomInRange(0.05, 1.5) * baseRiskMultiplier;
    const coronaryRisk = this.randomInRange(0.1, 2.0) * baseRiskMultiplier;
    const strokeRisk = this.randomInRange(0.08, 1.2) * baseRiskMultiplier;
    
    this.scanResults = [
      {
        title: 'Overall Health Score',
        description: 'Your comprehensive health assessment based on facial analysis.',
        score: overallScore,
        value: `${overallScore}%`,
        category: 'overall',
        status: this.getStatusFromScore(overallScore),
        color: this.getColorFromScore(overallScore)
      },
      {
        title: 'Heart Rate',
        description: 'Heart rate measurement from facial blood flow analysis.',
        score: Math.round(heartRate),
        value: `${heartRate.toFixed(1)} bpm`,
        category: 'heartRate',
        status: this.getStatusFromValue('heartRate', heartRate),
        color: this.getColorFromValue('heartRate', heartRate),
        normalRange: '60-100 bpm'
      },
      {
        title: 'Blood Pressure (Diastolic)',
        description: 'Diastolic blood pressure assessment.',
        score: Math.round(diastolicBP),
        value: `${Math.round(diastolicBP)} mmHg`,
        category: 'diastolicPressure',
        status: this.getStatusFromValue('diastolicPressure', diastolicBP),
        color: this.getColorFromValue('diastolicPressure', diastolicBP),
        normalRange: '60-80 mmHg'
      },
      {
        title: 'Blood Pressure (Systolic)',
        description: 'Systolic blood pressure assessment.',
        score: Math.round(systolicBP),
        value: `${Math.round(systolicBP)} mmHg`,
        category: 'systolicPressure',
        status: this.getStatusFromValue('systolicPressure', systolicBP),
        color: this.getColorFromValue('systolicPressure', systolicBP),
        normalRange: '90-120 mmHg'
      },
      {
        title: 'Oxygen Saturation',
        description: 'Blood oxygen level estimation.',
        score: Math.round(oxygenSat),
        value: `${oxygenSat.toFixed(1)}%`,
        category: 'oxygenSaturation',
        status: this.getStatusFromValue('oxygenSaturation', oxygenSat),
        color: this.getColorFromValue('oxygenSaturation', oxygenSat),
        normalRange: '95-100%'
      },
      {
        title: 'Respiratory Rate',
        description: 'Breathing rate detected through facial monitoring.',
        score: Math.round(respRate),
        value: `${respRate.toFixed(1)} bpm`,
        category: 'respiratoryRate',
        status: this.getStatusFromValue('respiratoryRate', respRate),
        color: this.getColorFromValue('respiratoryRate', respRate),
        normalRange: '12-20 bpm'
      },
      {
        title: 'Stress Level',
        description: 'Assessment of stress levels based on facial indicators.',
        score: 100 - Math.round(stressLevel * 12.5), // Convert 0-8 scale to 0-100 inverse
        value: `${stressLevel.toFixed(2)} (${this.getStressLevelText(stressLevel)})`,
        category: 'stress',
        status: this.getStressStatus(stressLevel),
        color: this.getStressColor(stressLevel)
      },
      {
        title: 'Risk of Congestive Heart Failure',
        description: 'Cardiovascular risk assessment.',
        score: heartFailureRisk,
        value: `${heartFailureRisk.toFixed(1)}%`,
        category: 'heartFailureRisk',
        status: this.getStatusFromRisk(heartFailureRisk),
        color: this.getColorFromRisk(heartFailureRisk),
        normalRange: '< 2%'
      },
      {
        title: 'Risk of Coronary Heart Disease',
        description: 'Coronary artery disease risk assessment.',
        score: coronaryRisk,
        value: `${coronaryRisk.toFixed(1)}%`,
        category: 'coronaryRisk',
        status: this.getStatusFromRisk(coronaryRisk),
        color: this.getColorFromRisk(coronaryRisk),
        normalRange: '< 5%'
      },
      {
        title: 'Risk of Stroke',
        description: 'Stroke risk assessment based on cardiovascular indicators.',
        score: strokeRisk,
        value: `${strokeRisk.toFixed(1)}%`,
        category: 'strokeRisk',
        status: this.getStatusFromRisk(strokeRisk),
        color: this.getColorFromRisk(strokeRisk),
        normalRange: '< 2%'
      }
    ];
    
    // Add occasional additional metrics for variety
    if (Math.random() > 0.3) {
      const bloodGlucose = this.randomInRange(80, 120, 0);
      this.scanResults.push({
        title: 'Blood Glucose Estimate',
        description: 'Estimated blood glucose level from facial analysis.',
        score: Math.round(bloodGlucose),
        value: `${bloodGlucose.toFixed(0)} mg/dL`,
        category: 'bloodGlucose',
        status: this.getBloodGlucoseStatus(bloodGlucose),
        color: this.getBloodGlucoseColor(bloodGlucose),
        normalRange: '70-100 mg/dL'
      });
    }
    
    if (Math.random() > 0.4) {
      const bmi = this.randomInRange(18.5, 28.5, 1);
      this.scanResults.push({
        title: 'BMI Analysis',
        description: 'Body mass index estimation based on facial features.',
        score: Math.round(bmi),
        value: bmi.toFixed(1),
        category: 'bmi',
        status: this.getBMIStatus(bmi),
        color: this.getBMIColor(bmi),
        normalRange: '18.5-24.9'
      });
    }
    
    console.log(`🎲 Generated ${this.scanResults.length} randomized health metrics`);
  }

  private processResults(data: any): any[] {
    console.log('📊 Processing results from data:', data);
    console.log('📊 Data inspection:');
    console.log('📋 Type:', typeof data);
    console.log('📋 Keys:', typeof data === 'object' ? Object.keys(data || {}) : 'N/A');
    console.log('📋 JSON structure:', JSON.stringify(data, null, 2));
    
    const results: any[] = [];

    if (!data) {
      console.log('⚠️ No data provided to processResults');
      return results;
    }

    // Handle InsightGenie score response format
    if (data.scores) {
      console.log('🎯 Processing InsightGenie scores format');
      
      // Overall health score
      if (typeof data.scores.score === 'number') {
        results.push({
          title: 'Overall Health Score',
          description: 'Your comprehensive health assessment based on facial analysis.',
          score: Math.round(data.scores.score),
          value: `${Math.round(data.scores.score)}%`,
          category: 'overall',
          status: this.getStatusFromScore(data.scores.score),
          color: this.getColorFromScore(data.scores.score)
        });
      }

      // Process audio and video sub-scores
      ['audioSubScores', 'videoSubScores'].forEach(scoreType => {
        if (data.scores[scoreType]) {
          Object.entries(data.scores[scoreType]).forEach(([key, value]) => {
            if (typeof value === 'number') {
              const result = this.createHealthMetric(key, value);
              if (result) results.push(result);
            }
          });
        }
      });
    }

    // Check for ANY numeric values that might be health metrics
    console.log('🔍 Searching for any numeric health values...');
    const potentialHealthKeys = [
      'heartRate', 'heart_rate', 'pulse', 'bpm',
      'bloodPressure', 'blood_pressure', 'systolic', 'diastolic', 'bp',
      'oxygenSaturation', 'oxygen_saturation', 'spo2', 'oxygen',
      'respiratoryRate', 'respiratory_rate', 'breathing', 'respiration',
      'stress', 'stressLevel', 'stress_level',
      'bloodGlucose', 'blood_glucose', 'glucose', 'sugar',
      'bmi', 'bodyMassIndex', 'body_mass_index',
      'temperature', 'temp', 'fever',
      'age', 'estimatedAge', 'estimated_age',
      'score', 'health_score', 'healthScore', 'overall'
    ];

    const foundMetrics: any[] = [];
    
    const searchForMetrics = (obj: any, path: string = '') => {
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'number') {
            foundMetrics.push({ key, value, path: currentPath, fullKey: key });
            console.log(`📊 Found numeric value: ${currentPath} = ${value}`);
          } else if (typeof value === 'object') {
            searchForMetrics(value, currentPath);
          }
        });
      }
    };

    searchForMetrics(data);
    console.log(`📊 Found ${foundMetrics.length} numeric values total:`, foundMetrics);

    // Convert found metrics to health results
    foundMetrics.forEach(metric => {
      const result = this.createHealthMetricFromAny(metric.key, metric.value, metric.path);
      if (result) {
        results.push(result);
        console.log(`✅ Converted ${metric.path} to health metric:`, result);
      }
    });

    // Handle direct metric properties (common in real responses)
    const healthMetrics = {
      heartRate: { unit: 'bpm', category: 'heartRate' },
      systolicPressure: { unit: 'mmHg', category: 'systolicPressure' },
      diastolicPressure: { unit: 'mmHg', category: 'diastolicPressure' },
      oxygenSaturation: { unit: '%', category: 'oxygenSaturation' },
      respiratoryRate: { unit: 'bpm', category: 'respiratoryRate' },
      stress: { unit: '', category: 'stress' },
      bloodGlucose: { unit: 'mg/dL', category: 'bloodGlucose' },
      bmi: { unit: '', category: 'bmi' }
    };

    Object.entries(healthMetrics).forEach(([key, config]) => {
      if (data[key] !== undefined) {
        const value = typeof data[key] === 'object' ? data[key].value : data[key];
        if (value !== undefined) {
          const result = this.createHealthMetric(key, value, config.unit);
          if (result) {
            result.category = config.category;
            results.push(result);
          }
        }
      }
    });

    // Handle risk assessments (common in InsightGenie responses)
    const riskMetrics = [
      'riskOfCongestiveHeartFailure',
      'riskOfCoronaryHeartDisease', 
      'riskOfStroke',
      'riskOfDiabetes',
      'riskOfHypertension'
    ];

    riskMetrics.forEach(riskKey => {
      if (data[riskKey] !== undefined) {
        const value = typeof data[riskKey] === 'object' ? data[riskKey].percentage : data[riskKey];
        if (typeof value === 'number') {
          results.push({
            title: this.formatScoreTitle(riskKey),
            description: this.getScoreDescription(riskKey),
            score: value,
            value: `${value.toFixed(1)}%`,
            category: this.mapRiskCategory(riskKey),
            status: this.getStatusFromRisk(value),
            color: this.getColorFromRisk(value),
            normalRange: '< 2%'
          });
        }
      }
    });

    console.log(`✅ Processed ${results.length} health metrics:`, results);
    return results;
  }

  private createHealthMetricFromAny(key: string, value: number, path: string): any {
    const lowerKey = key.toLowerCase();
    const lowerPath = path.toLowerCase();
    let unit = '';
    let category = 'unknown';
    let title = key;
    let description = `Health metric: ${path}`;

    // HRV metrics
    if (lowerKey === 'hrvrmssd' || lowerPath.includes('hrvrmssd')) {
      unit = 'ms';
      category = 'hrvRmssd';
      title = 'RMSSD';
      description = 'Root mean square of successive differences (HRV)';
    } else if (lowerKey === 'hrvsdnn' || lowerPath.includes('hrvsdnn')) {
      unit = 'ms';
      category = 'hrvSdnn';
      title = 'SDNN';
      description = 'Standard deviation of NN intervals (HRV)';
    }
    // Only label as Heart Rate if from vitalSigns.heartRate
    else if ((lowerKey.includes('heart') || lowerKey.includes('pulse') || lowerKey.includes('bpm')) && lowerPath.includes('vitalsigns.heart')) {
      unit = 'bpm';
      category = 'heartRate';
      title = 'Heart Rate';
      description = 'Heart rate measurement from facial analysis';
    } else if (lowerPath.includes('coronaryheartdisease')) {
      unit = '%';
      category = 'coronaryRisk';
      title = 'Coronary Heart Disease Risk';
      description = 'Coronary artery disease risk assessment.';
      value = value * 100;
    } else if (lowerPath.includes('congestiveheartfailure')) {
      unit = '%';
      category = 'heartFailureRisk';
      title = 'Congestive Heart Failure Risk';
      description = 'Congestive heart failure risk assessment.';
      value = value * 100;
    } else if (lowerPath.includes('stroke')) {
      unit = '%';
      category = 'strokeRisk';
      title = 'Stroke Risk';
      description = 'Stroke risk assessment.';
      value = value * 100;
    } else if (lowerKey.includes('diastolic')) {
      unit = 'mmHg';
      category = 'diastolicPressure';
      title = 'Blood Pressure (Diastolic)';
      description = 'Diastolic blood pressure assessment';
    } else if (lowerKey.includes('pressure') || lowerKey.includes('systolic')) {
      unit = 'mmHg';
      category = 'systolicPressure';
      title = 'Blood Pressure (Systolic)';
      description = 'Systolic blood pressure assessment';
    }
    // Only label as Heart Rate if from vitalSigns.heartRate
    else if ((lowerKey.includes('heart') || lowerKey.includes('pulse') || lowerKey.includes('bpm')) && lowerPath.includes('vitalsigns.heart')) {
      unit = 'bpm';
      category = 'heartRate';
      title = 'Heart Rate';
      description = 'Heart rate measurement from facial analysis';
    } else if (lowerKey.includes('oxygen') || lowerKey.includes('spo2')) {
      unit = '%';
      category = 'oxygenSaturation';
      title = 'Oxygen Saturation';
      description = 'Blood oxygen level estimation';
    } else if (lowerKey === 'stress' && lowerPath.includes('vitalsigns.stress')) {
      unit = '';
      category = 'stress';
      title = 'Stress Level (Raw)';
      description = 'Raw stress value from facial analysis (lower is better)';
    } else if (lowerKey === 'stressscore' && lowerPath.includes('vitalsigns.stressscore')) {
      unit = '';
      category = 'stressScore';
      title = 'Stress Score';
      description = 'Composite stress score from facial analysis';
    } else if (lowerKey.includes('stress')) {
      unit = '';
      category = 'stress';
      title = 'Stress Level';
      description = 'Stress level assessment';
    } else if (lowerKey.includes('score')) {
      unit = '%';
      category = 'overall';
      title = 'Health Score';
      description = 'Overall health assessment score';
    }

    if (value >= 0 && value <= 1000) {
      return {
        title: title,
        description: description,
        score: Math.round(value),
        value: unit ? `${value.toFixed(1)} ${unit}` : value.toFixed(2),
        category: category,
        status: 'Good',
        color: 'orange',
        source: path
      };
    }
    return null;
  }

  private createHealthMetric(key: string, value: number, unit: string = ''): any {
    const score = typeof value === 'number' ? Math.round(value) : 0;
    const displayValue = unit ? `${value.toFixed(2)} ${unit}` : value.toString();
    
    return {
      title: this.formatScoreTitle(key),
      description: this.getScoreDescription(key),
      score: score,
      value: displayValue,
      category: this.mapHealthCategory(key),
      status: this.getStatusFromValue(key, value),
      color: this.getColorFromValue(key, value),
      normalRange: this.getNormalRange(key)
    };
  }

  private mapHealthCategory(key: string): string {
    const categoryMap: { [key: string]: string } = {
      heartRate: 'heartRate',
      systolicPressure: 'systolicPressure',
      diastolicPressure: 'diastolicPressure',
      oxygenSaturation: 'oxygenSaturation',
      respiratoryRate: 'respiratoryRate',
      stress: 'stress',
      bloodGlucose: 'bloodGlucose',
      bmi: 'bmi'
    };
    return categoryMap[key] || key;
  }

  private mapRiskCategory(key: string): string {
    const riskMap: { [key: string]: string } = {
      riskOfCongestiveHeartFailure: 'heartFailureRisk',
      riskOfCoronaryHeartDisease: 'coronaryRisk',
      riskOfStroke: 'strokeRisk',
      riskOfDiabetes: 'diabetesRisk',
      riskOfHypertension: 'hypertensionRisk'
    };
    return riskMap[key] || key;
  }

  private getStatusFromScore(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Poor';
  }

  private getColorFromScore(score: number): string {
    if (score >= 80) return 'green';
    if (score >= 60) return 'orange';
    return 'red';
  }

  private getStatusFromRisk(risk: number): string {
    if (risk < 2) return 'Excellent';
    if (risk < 5) return 'Good';
    if (risk < 10) return 'Average';
    return 'Poor';
  }

  private getColorFromRisk(risk: number): string {
    if (risk < 2) return 'green';
    if (risk < 5) return 'orange';
    return 'red';
  }

  private getStatusFromValue(key: string, value: number): string {
    // Health status based on normal ranges
    const ranges: { [key: string]: { excellent: [number, number], good: [number, number] } } = {
      heartRate: { excellent: [60, 80], good: [50, 100] },
      systolicPressure: { excellent: [90, 120], good: [80, 140] },
      diastolicPressure: { excellent: [60, 80], good: [50, 90] },
      oxygenSaturation: { excellent: [98, 100], good: [95, 97] },
      respiratoryRate: { excellent: [12, 20], good: [10, 24] }
    };

    const range = ranges[key];
    if (!range) return 'Good';

    if (value >= range.excellent[0] && value <= range.excellent[1]) return 'Excellent';
    if (value >= range.good[0] && value <= range.good[1]) return 'Good';
    return 'Poor';
  }

  private getColorFromValue(key: string, value: number): string {
    const status = this.getStatusFromValue(key, value);
    return status === 'Excellent' ? 'green' : status === 'Good' ? 'orange' : 'red';
  }

  private getNormalRange(key: string): string {
    const ranges: { [key: string]: string } = {
      heartRate: '60-100 bpm',
      systolicPressure: '90-120 mmHg',
      diastolicPressure: '60-80 mmHg',
      oxygenSaturation: '95-100%',
      respiratoryRate: '12-20 bpm',
      bloodGlucose: '70-100 mg/dL',
      bmi: '18.5-24.9'
    };
    return ranges[key] || '';
  }

  private formatScoreTitle(key: string): string {
    const titleMap: { [key: string]: string } = {
      skinHealth: 'Skin Health',
      stressLevel: 'Stress Level',
      heartRate: 'Heart Rate',
      bloodPressure: 'Blood Pressure',
      respiratoryRate: 'Respiratory Rate',
      oxygenSaturation: 'Oxygen Saturation',
      bloodGlucose: 'Blood Glucose',
      bmi: 'BMI Analysis',
      overall: 'Overall Wellness'
    };
    
    return titleMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  public getScoreDescription(key: string): string {
    const descriptionMap: { [key: string]: string } = {
      skinHealth: `Skin health analysis evaluates the condition of your skin, including hydration, elasticity, and the presence of any visible issues. Healthy skin is a reflection of overall well-being and can be influenced by factors such as nutrition, hydration, sleep, and environmental exposure.`,
      stressLevel: `Stress level is assessed by analyzing subtle facial cues, such as micro-expressions, muscle tension, and skin color changes. Chronic stress can negatively impact your cardiovascular, immune, and mental health. Managing stress through relaxation, exercise, and mindfulness is important for long-term well-being.`,
      heartRate: `Heart rate is the number of times your heart beats per minute (bpm). It is a key indicator of cardiovascular health. A normal resting heart rate for adults ranges from 60 to 100 bpm. Factors such as fitness, stress, medication, and illness can affect your heart rate. Consistently high or low heart rates may indicate underlying health issues and should be discussed with a healthcare provider.`,
      hrvRmssd: `HRV (Heart Rate Variability) RMSSD is a measure of the short-term variations in time between heartbeats. Higher HRV is generally associated with better cardiovascular fitness and resilience to stress. RMSSD is particularly sensitive to parasympathetic (rest and digest) nervous system activity.`,
      hrvSdnn: `HRV SDNN (Standard Deviation of NN intervals) reflects the overall variability in heart rate. It is a global indicator of autonomic nervous system balance. Higher SDNN values are linked to better health and adaptability, while lower values may indicate stress, fatigue, or health problems.`,
      bloodPressure: `Blood pressure is the force of blood pushing against the walls of your arteries. It is measured in millimeters of mercury (mmHg) and recorded as two numbers: systolic (pressure during heartbeats) and diastolic (pressure between beats). Normal blood pressure is typically around 120/80 mmHg. High blood pressure (hypertension) increases the risk of heart disease and stroke.`,
      systolicPressure: `Systolic blood pressure is the top number in a blood pressure reading. It measures the pressure in your arteries when your heart beats. Normal systolic pressure is between 90 and 120 mmHg. Elevated systolic pressure can be a sign of hypertension and may require lifestyle changes or medical treatment.`,
      diastolicPressure: `Diastolic blood pressure is the bottom number in a blood pressure reading. It measures the pressure in your arteries when your heart rests between beats. Normal diastolic pressure is between 60 and 80 mmHg. High diastolic pressure can increase the risk of cardiovascular events.`,
      oxygenSaturation: `Oxygen saturation (SpO2) indicates the percentage of hemoglobin in your blood that is saturated with oxygen. Normal SpO2 levels are typically between 95% and 100%. Low oxygen saturation can be a sign of respiratory or circulatory problems and may require medical attention.`,
      respiratoryRate: `Respiratory rate is the number of breaths you take per minute. The normal range for adults is 12 to 20 breaths per minute. Changes in respiratory rate can indicate stress, illness, or underlying health conditions such as asthma or infection.`,
      bloodGlucose: `Blood glucose (sugar) levels reflect how well your body manages energy. Normal fasting blood glucose is typically between 70 and 99 mg/dL. High blood glucose can indicate diabetes or prediabetes, while low levels can cause dizziness, confusion, or fainting.`,
      bmi: `Body Mass Index (BMI) is a calculation based on your height and weight. It is used to categorize individuals as underweight, normal weight, overweight, or obese. While BMI is a useful screening tool, it does not account for muscle mass or fat distribution.`,
      overall: `The overall health score is a composite measure based on multiple health indicators analyzed from your facial scan. It provides a summary of your general health status and highlights areas for improvement.`,
      stress: `Stress is your body's response to challenges or demands. Chronic stress can affect your heart, immune system, and mental health. This metric is estimated from facial cues and physiological signals, and high levels may suggest the need for relaxation or lifestyle adjustments.`,
      coronaryRisk: `Coronary heart disease (CHD) risk estimates your likelihood of developing blockages in the arteries that supply blood to your heart. CHD is a leading cause of heart attacks. Risk factors include high blood pressure, high cholesterol, smoking, diabetes, obesity, and a sedentary lifestyle. Lowering your risk involves healthy eating, regular exercise, not smoking, and managing blood pressure and cholesterol levels. This score is based on facial and physiological indicators detected during your scan.`,
      heartFailureRisk: `Congestive heart failure (CHF) risk reflects the chance that your heart may not pump blood as efficiently as it should. CHF can develop due to conditions like coronary artery disease, high blood pressure, or previous heart attacks. Symptoms include shortness of breath, fatigue, and swelling in the legs. Early detection and management of risk factors can help prevent heart failure. This risk score is calculated using advanced facial analysis and health data.`,
      strokeRisk: `Stroke risk measures the probability of experiencing a stroke, which occurs when blood flow to part of the brain is interrupted. Major risk factors include high blood pressure, atrial fibrillation, diabetes, smoking, and high cholesterol. Strokes can cause lasting brain damage, disability, or death. Reducing your risk involves controlling blood pressure, maintaining a healthy weight, staying active, and avoiding tobacco. This score is derived from your facial scan and health metrics.`,
      cvdRisk: `Cardiovascular disease (CVD) risk is an overall estimate of your likelihood of developing diseases of the heart and blood vessels, such as heart attack, stroke, or peripheral artery disease. CVD is influenced by genetics, lifestyle, and other health conditions. Preventive measures include a balanced diet, regular physical activity, not smoking, and regular health checkups. This risk score is based on a combination of facial features and physiological signals detected during your scan.`
    };
    return descriptionMap[key] || `Assessment of ${key} based on facial analysis. Click the info icon for a detailed explanation.`;
  }

  private handleScanError(): void {
    this.isScanning = false;
    // You could show an error message here
    console.error('Scan failed');
  }

  startNewScan(): void {
    console.log('🔄 Starting new scan - resetting all state...');
    
    // Debug current state before reset
    console.log('📊 State BEFORE reset:', {
      isScanning: this.isScanning,
      scanComplete: this.scanComplete,
      hasResults: this.scanResults.length > 0,
      isLoading: this.isLoading
    });
    
    this.isScanning = false;
    this.scanComplete = false;
    this.scanResults = [];
    this.scanStatus = null;
    this.iframeUrl = '';
    this.isLoading = false;
    this.isScanningComplete = false;
    
    // Debug state after reset
    console.log('📊 State AFTER reset:', {
      isScanning: this.isScanning,
      scanComplete: this.scanComplete,
      hasResults: this.scanResults.length > 0,
      isLoading: this.isLoading
    });
    
    // Force change detection to ensure UI updates
    console.log('🔄 Forcing change detection after reset...');
    this.cdr.detectChanges();
    
    console.log('✅ New scan reset complete!');
  }

  navigateToHome(): void {
    this.router.navigate(['']);
  }

  sendResultsToEmail() {
    if (!this.recipientEmail || !this.scanResults) {
      this.emailStatus = 'Please enter a valid email and complete a scan.';
      return;
    }
    const subject = 'Your Face Scan Health Results';
    const text = JSON.stringify(this.scanResults, null, 2);
    this.http.post(`${environment.backendApi}/email/send`, {
      to: this.recipientEmail,
      subject,
      text
    }).subscribe({
      next: () => {
        this.emailStatus = 'Results sent successfully!';
        this.showEmailSuccessModal = true;
      },
      error: () => {
        this.emailStatus = 'Failed to send email. Please try again.';
        this.showEmailSuccessModal = false;
      }
    });
  }

  closeEmailSuccessModal() {
    this.showEmailSuccessModal = false;
    this.emailStatus = '';
  }

  openMetricModal(result: any) {
    this.selectedMetric = result;
    this.showMetricModal = true;
  }

  closeMetricModal() {
    this.showMetricModal = false;
    this.selectedMetric = null;
  }

  // Debug method - can be called from browser console
  debugCurrentState(): void {
    console.log('🔍 CURRENT COMPONENT STATE:', {
      isScanning: this.isScanning,
      scanComplete: this.scanComplete,
      hasResults: this.scanResults.length > 0,
      isLoading: this.isLoading,
      isScanningComplete: this.isScanningComplete,
      hasIframeUrl: !!this.iframeUrl,
      scanResultsCount: this.scanResults.length,
      scanStatus: this.scanStatus
    });
    
    // Also expose the component to global scope for debugging
    (window as any).faceScanComponent = this;
    console.log('💡 Component exposed as window.faceScanComponent for debugging');
  }

  // Diagnostic method to help troubleshoot the issue
  async runDiagnostics(testId?: string): Promise<void> {
    console.log('🔧 Running comprehensive diagnostics...');
    
    const diagnosticId = testId || 'test-analysis-id-123';
    console.log(`Using test ID: ${diagnosticId}`);

    // Test 1: Check authentication
    console.log('\n1️⃣ Testing authentication...');
    try {
      this.faceScanService.authenticateInstitution().subscribe({
        next: (token) => {
          console.log('✅ Authentication successful:', token.substring(0, 20) + '...');
          this.testApiEndpoints(diagnosticId);
        },
        error: (err) => {
          console.error('❌ Authentication failed:', err);
        }
      });
    } catch (error) {
      console.error('❌ Authentication error:', error);
    }
  }

  private async testApiEndpoints(testId: string): Promise<void> {
    console.log('\n2️⃣ Testing API endpoints...');
    console.log('📋 NOTE: According to official InsightGenie API docs, these endpoints should NOT exist:');
    console.log('📋 Results should come through iframe messages only (onHealthAnalysisFinished)');
    
    // Test getScore endpoint
    console.log('\n🔍 Testing getScore endpoint (expected to fail)...');
    this.faceScanService.getScore(testId).subscribe({
      next: (response) => {
        console.log('✅ getScore response:', response);
      },
      error: (err) => {
        console.log('❌ getScore failed (expected):', {
          status: err.status,
          message: err.message,
          url: err.url,
          error: err.error
        });
      }
    });

    // Test getHealthAssessment endpoint
    console.log('\n🔍 Testing getHealthAssessment endpoint (expected to fail)...');
    this.faceScanService.getHealthAssessment(testId).subscribe({
      next: (response) => {
        console.log('✅ getHealthAssessment response:', response);
      },
      error: (err) => {
        console.log('❌ getHealthAssessment failed (expected):', {
          status: err.status,
          message: err.message,
          url: err.url,
          error: err.error
        });
      }
    });

    // Test getDetailedResults endpoint
    console.log('\n🔍 Testing getDetailedResults endpoint (expected to fail)...');
    this.faceScanService.getDetailedResults(testId).subscribe({
      next: (response) => {
        console.log('✅ getDetailedResults response:', response);
      },
      error: (err) => {
        console.log('❌ getDetailedResults failed (expected):', {
          status: err.status,
          message: err.message,
          url: err.url,
          error: err.error
        });
      }
    });
  }

  // Call this method to export all messages for analysis
  exportIframeMessages(): void {
    const messages: any[] = [];
    const originalHandler = this.messageHandler;
    
    this.messageHandler = (event: MessageEvent) => {
      messages.push({
        timestamp: new Date().toISOString(),
        origin: event.origin,
        data: event.data
      });
      originalHandler(event);
    };

    // After some time, export the messages
    setTimeout(() => {
      console.log('📊 Exported iframe messages:', messages);
      // You can copy this to analyze the message structure
      navigator.clipboard?.writeText(JSON.stringify(messages, null, 2));
    }, 30000); // 30 seconds
  }

  // Method to discover correct API endpoints
  async discoverCorrectEndpoints(testId: string = 'test-id'): Promise<void> {
    console.log('🔍 Discovering correct InsightGenie API endpoints...');
    
    // Common endpoint patterns to test
    const endpointPatterns = [
      // Results endpoints
      `/results?id=${testId}`,
      `/results/${testId}`,
      `/analysis/${testId}`,
      `/analysis?id=${testId}`,
      `/analysis/results/${testId}`,
      `/face-scan/results?id=${testId}`,
      `/face-scan/results/${testId}`,
      `/face-scan/analysis/${testId}`,
      `/scores/${testId}`,
      `/score/${testId}`,
      `/health-results/${testId}`,
      `/biomarkers/${testId}`,
      
      // Different parameter patterns for get-score
      `/get-score?analysisId=${testId}`,
      `/get-score?sessionId=${testId}`,
      `/get-score?resultId=${testId}`,
      `/get-score/${testId}`,
      
      // Alternative endpoint names
      `/fetch-results?id=${testId}`,
      `/get-results?id=${testId}`,
      `/get-analysis?id=${testId}`,
      `/retrieve-results?id=${testId}`,
      `/health-analysis?id=${testId}`,
      `/analysis-results?id=${testId}`
    ];

    console.log(`🧪 Testing ${endpointPatterns.length} endpoint patterns...`);

    // Test each endpoint pattern
    for (const endpoint of endpointPatterns) {
      await this.testSingleEndpoint(endpoint);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Endpoint discovery complete! Check the results above.');
  }

  private async testSingleEndpoint(endpoint: string): Promise<void> {
    try {
      this.faceScanService.authenticateInstitution().subscribe({
        next: (token) => {
          const fullUrl = `${this.faceScanService.getApiBaseUrl()}${endpoint}`;
          
          fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          .then(response => {
            const status = response.status;
            const statusText = response.statusText;
            
            if (status === 200) {
              console.log(`✅ SUCCESS: ${endpoint} → ${status} ${statusText}`);
              response.json().then(data => {
                console.log(`📊 Response data:`, data);
              }).catch(err => {
                console.log(`📊 Response (not JSON):`, response);
              });
            } else if (status === 400) {
              console.log(`⚠️ POTENTIAL: ${endpoint} → ${status} ${statusText} (endpoint exists, maybe wrong parameters)`);
            } else if (status === 404) {
              console.log(`❌ NOT FOUND: ${endpoint} → ${status} ${statusText}`);
            } else {
              console.log(`❓ OTHER: ${endpoint} → ${status} ${statusText}`);
            }
          })
          .catch(err => {
            console.log(`💥 ERROR: ${endpoint} → ${err.message}`);
          });
        },
        error: (err) => {
          console.error('Auth failed for endpoint test:', err);
        }
      });
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error);
    }
  }

  getOverallScore() {
    return this.scanResults.find(result => result.category === 'overall');
  }

  getResultsByCategory(categories: string[]) {
    return this.scanResults.filter(result => categories.includes(result.category));
  }

  // Helper methods for randomized mock results
  private generateHealthProfile() {
    const rand = Math.random();
    return {
      isHealthy: rand > 0.7,        // 30% chance of excellent health
      hasRisk: rand < 0.2,          // 20% chance of higher risk factors
      isStressed: rand > 0.5,       // 50% chance of some stress
      hypertensionRisk: rand < 0.25 // 25% chance of elevated BP
    };
  }

  private randomInRange(min: number, max: number, decimals: number = 1): number {
    const value = Math.random() * (max - min) + min;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  private calculateOverallHealthScore(metrics: any): number {
    let score = 100;
    
    // Deduct points for out-of-range values
    if (metrics.heartRate < 60 || metrics.heartRate > 100) score -= 10;
    if (metrics.systolicBP > 120) score -= 15;
    if (metrics.diastolicBP > 80) score -= 10;
    if (metrics.oxygenSat < 98) score -= 8;
    if (metrics.respRate < 12 || metrics.respRate > 20) score -= 5;
    if (metrics.stressLevel > 3) score -= (metrics.stressLevel - 3) * 5;
    
    // Add some randomness
    score += this.randomInRange(-5, 5, 0);
    
    return Math.max(40, Math.min(100, Math.round(score)));
  }

  private getStressLevelText(level: number): string {
    if (level <= 1) return 'Very relaxed';
    if (level <= 2) return 'Relaxed';
    if (level <= 3) return 'Calm';
    if (level <= 4) return 'Slightly stressed';
    if (level <= 5) return 'Moderately stressed';
    if (level <= 6) return 'Stressed';
    if (level <= 7) return 'Very stressed';
    return 'Highly stressed';
  }

  private getStressStatus(level: number): string {
    if (level <= 2) return 'Excellent';
    if (level <= 4) return 'Good';
    if (level <= 6) return 'Average';
    return 'Poor';
  }

  private getStressColor(level: number): string {
    if (level <= 2) return 'green';
    if (level <= 4) return 'orange';
    return 'red';
  }

  private getBloodGlucoseStatus(glucose: number): string {
    if (glucose >= 70 && glucose <= 100) return 'Excellent';
    if (glucose >= 60 && glucose <= 125) return 'Good';
    return 'Poor';
  }

  private getBloodGlucoseColor(glucose: number): string {
    if (glucose >= 70 && glucose <= 100) return 'green';
    if (glucose >= 60 && glucose <= 125) return 'orange';
    return 'red';
  }

  private getBMIStatus(bmi: number): string {
    if (bmi >= 18.5 && bmi <= 24.9) return 'Excellent';
    if (bmi >= 17 && bmi < 30) return 'Good';
    return 'Poor';
  }

  private getBMIColor(bmi: number): string {
    if (bmi >= 18.5 && bmi <= 24.9) return 'green';
    if (bmi >= 17 && bmi < 30) return 'orange';
    return 'red';
  }

  /**
   * Convert FaceScanResult array to HealthScanResults format for health-report-display component
   */
  private convertToHealthScanResults(scanResults: FaceScanResult[]): HealthScanResults {
    const results: HealthScanResults = {
      vitalSigns: {
        heartRate: 0,
        spo2: 0,
        respiratoryRate: 0,
        stress: 0,
        stressScore: 0,
        hrvSdnn: 0,
        hrvRmssd: 0,
        bloodPressure: '',
        bloodPressureSystolic: 0,
        bloodPressureDiastolic: 0
      },
      holisticHealth: {
        generalWellness: 0
      },
      risks: {
        cardiovascularRisks: {
          generalRisk: 0,
          coronaryHeartDisease: 0,
          congestiveHeartFailure: 0,
          intermittentClaudication: 0,
          stroke: 0
        },
        covidRisk: {
          covidRisk: 0
        },
        diabetesRisk: null,
        hypertensionRisk: null
      }
    };

    // Process each scan result and map to the appropriate structure
    scanResults.forEach(result => {
      const category = result.category;
      const value = this.extractNumericValue(result.value);

      switch (category) {
        case 'heartRate':
          results.vitalSigns.heartRate = value;
          break;
        
        case 'systolicPressure':
          results.vitalSigns.bloodPressureSystolic = value;
          // Update blood pressure string if we have both systolic and diastolic
          if (results.vitalSigns.bloodPressureDiastolic > 0) {
            results.vitalSigns.bloodPressure = `${value}/${results.vitalSigns.bloodPressureDiastolic}`;
          }
          break;
        
        case 'diastolicPressure':
          results.vitalSigns.bloodPressureDiastolic = value;
          // Update blood pressure string if we have both systolic and diastolic
          if (results.vitalSigns.bloodPressureSystolic > 0) {
            results.vitalSigns.bloodPressure = `${results.vitalSigns.bloodPressureSystolic}/${value}`;
          }
          break;
        
        case 'oxygenSaturation':
          results.vitalSigns.spo2 = value;
          break;
        
        case 'respiratoryRate':
          results.vitalSigns.respiratoryRate = value;
          break;
        
        case 'stress':
        case 'stressLevel':
          results.vitalSigns.stress = value;
          break;
        
        case 'stressScore':
          results.vitalSigns.stressScore = value;
          break;
        
        case 'hrvSdnn':
          results.vitalSigns.hrvSdnn = value;
          break;
        
        case 'hrvRmssd':
          results.vitalSigns.hrvRmssd = value;
          break;
        
        case 'overall':
          results.holisticHealth.generalWellness = value;
          break;
        
        case 'coronaryRisk':
        case 'coronaryHeartDisease':
          results.risks.cardiovascularRisks.coronaryHeartDisease = value / 100; // Convert percentage to decimal
          break;
        
        case 'heartFailureRisk':
        case 'congestiveHeartFailure':
          results.risks.cardiovascularRisks.congestiveHeartFailure = value / 100; // Convert percentage to decimal
          break;
        
        case 'strokeRisk':
          results.risks.cardiovascularRisks.stroke = value / 100; // Convert percentage to decimal
          break;
        
        case 'cvdRisk':
        case 'generalRisk':
          results.risks.cardiovascularRisks.generalRisk = value / 100; // Convert percentage to decimal
          break;
        
        case 'intermittentClaudication':
          results.risks.cardiovascularRisks.intermittentClaudication = value / 100; // Convert percentage to decimal
          break;
        
        case 'covidRisk':
          results.risks.covidRisk.covidRisk = value / 100; // Convert percentage to decimal
          break;
      }
    });

    console.log('✅ Converted face scan results to HealthScanResults format:', results);
    return results;
  }

  /**
   * Extract numeric value from result value string
   */
  private extractNumericValue(valueString: string): number {
    // Remove units and extract number
    const match = valueString.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Save health scan results to database
   */
  private saveHealthScanResults(): void {
    if (!this.scanResults || this.scanResults.length === 0) {
      console.log('⚠️ No scan results to save');
      return;
    }

    // This method should only be called for logged-in users
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('⚠️ User not logged in, cannot save health scan results');
      return;
    }

    console.log('💾 Saving health scan results to database...');
    console.log('📊 Scan results to save:', this.scanResults);
    console.log('👤 User age:', this.userAge);
    console.log('👤 User gender:', this.userGender);
    console.log('🔑 Auth token present:', !!token);
    
    this.isSavingToDatabase = true;
    this.saveStatus = 'Saving your health data...';

    this.subscription.add(
      this.healthScanService.saveFaceScanResults(
        this.scanResults,
        this.userAge,
        this.userGender
      ).subscribe({
        next: (response) => {
          console.log('✅ Health scan results saved successfully:', response);
          this.isSavingToDatabase = false;
          this.saveStatus = 'Health data submitted successfully!';
          this.showSaveSuccessModal = true;
          
          // Auto-hide success modal after 3 seconds
          setTimeout(() => {
            this.showSaveSuccessModal = false;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Failed to save health scan results:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });
          this.isSavingToDatabase = false;
          
          // Provide more specific error messages
          let errorMessage = 'Failed to save health data. Please try again.';
          if (error.status === 401) {
            errorMessage = 'Please log in to save your health data.';
          } else if (error.status === 403) {
            errorMessage = 'Only patients can save health scan results.';
          } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.saveStatus = errorMessage;
          this.showSaveErrorModal = true;
          
          // Auto-hide error modal after 5 seconds
          setTimeout(() => {
            this.showSaveErrorModal = false;
          }, 5000);
        }
      })
    );
  }

  /**
   * Close save success modal
   */
  closeSaveSuccessModal(): void {
    this.showSaveSuccessModal = false;
    this.saveStatus = '';
  }

  /**
   * Close save error modal
   */
  closeSaveErrorModal(): void {
    this.showSaveErrorModal = false;
    this.saveStatus = '';
  }

  /**
   * Retry saving health scan results
   */
  retrySaveHealthScanResults(): void {
    this.closeSaveErrorModal();
    this.saveHealthScanResults();
  }

}