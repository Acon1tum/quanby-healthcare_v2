import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Pipe, PipeTransform, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FaceScanService, FaceScanRequest } from '../../../services/face-scan.service';
import { Subscription } from 'rxjs';


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
  selector: 'app-self-check',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SafePipe],
  templateUrl: './self-check.component.html',
  styleUrl: './self-check.component.scss'
})
export class SelfCheckComponent implements OnInit, OnDestroy {
  @ViewChild('scanIframe', { static: false }) scanIframe!: ElementRef;

  isScanning = false;
  isScanningComplete = false;
  isLoading = false;
  scanComplete = false;
  resultsSaved = false; // Flag to prevent duplicate saves
  
  userAge?: number;
  userGender?: string;
  
  iframeUrl = '';
  scanStatus: any = null;
  scanResults: any[] = [];
  
  recipientEmail: string = '';
  emailStatus: string = '';
  showEmailSuccessModal: boolean = false;

  // Modal state for metric details
  showMetricModal: boolean = false;
  selectedMetric: any = null;
  
  private subscription = new Subscription();

  constructor(
    private faceScanService: FaceScanService, 
    private router: Router, 
    private cdr: ChangeDetectorRef, 
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.enableDebugging();
    this.debugCurrentState();
    
    // Start scan immediately - skip the initial form screen
    this.startScan();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
          logMessage.includes('risks') ||
          logMessage.includes('vitalSigns') ||
          logMessage.includes('holisticHealth') ||
          args[0]?.health_risks || 
          args[0]?.vital_signs || 
          args[0]?.holistic_health ||
          args[0]?.risks ||
          args[0]?.vitalSigns ||
          args[0]?.holisticHealth
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
        arg.health_risks || arg.vital_signs || arg.holistic_health ||
        arg.risks || arg.vitalSigns || arg.holisticHealth
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
        // Save results to user profile
        this.saveSelfCheckResults(processedResults);
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

  startScan(): void {
    this.isLoading = true;
    
    // Generate a unique client ID
    const clientId = `self_check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
    console.log('🔧 Setting up iframe message handler...');
    
    // Clear any existing listeners to avoid duplicates
    window.removeEventListener('message', this.messageHandler);
    
    // Bind the handler to preserve 'this' context
    this.messageHandler = this.messageHandler.bind(this);
    window.addEventListener('message', this.messageHandler);
    
    // Also set up a delayed handler as backup
    setTimeout(() => {
      console.log('🔧 Setting up backup message handler...');
      const iframe = document.getElementById('self-check-iframe') as HTMLIFrameElement;
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

    const iframe = document.getElementById('self-check-iframe') as HTMLIFrameElement;
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
        break;
        
      case 'conditionStatus':
        console.log('📊 Condition status update:', data);
        this.updateScanStatus(data);
        break;
        
      case 'scanTimeRemaining':
        console.log('⏱️ Scan time remaining:', data);
        break;
        
      case 'videoElementDimensions':
        console.log('📐 Video dimensions:', data);
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
    
    this.isScanning = false;
    this.scanComplete = true;

    // Extract results from the onHealthAnalysisFinished message
    const results = this.extractResultsFromHealthAnalysis(data);
    
    if (results.length > 0) {
      console.log('✅ Successfully extracted results from health analysis message');
      this.scanResults = results;
      // Save results to user profile
      this.saveSelfCheckResults(results);
    }
    
    // Force change detection to ensure UI updates
    console.log('🔄 Forcing change detection after health analysis...');
    this.cdr.detectChanges();
  }

  private extractResultsFromHealthAnalysis(data: any): any[] {
    console.log('🔍 Extracting results from health analysis message:', data);
    
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

  private updateScanStatus(data: any): void {
    this.scanStatus = {
      centered: data.faceDetected || data.centered || false,
      lighting: data.lightingGood || data.lighting || false,
      movement: data.tooMuchMovement || data.movement || false
    };
  }

  private handleScanError(): void {
    this.isScanning = false;
    console.error('Scan failed');
  }

  startNewScan(): void {
    console.log('🔄 Starting new scan - resetting all state...');
    
    this.isScanning = false;
    this.scanComplete = false;
    this.scanResults = [];
    this.scanStatus = null;
    this.iframeUrl = '';
    this.isLoading = false;
    this.isScanningComplete = false;
    this.resultsSaved = false; // Reset the saved flag for new scan
    
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
    const subject = 'Your Self-Check Health Results';
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
    (window as any).selfCheckComponent = this;
    console.log('💡 Component exposed as window.selfCheckComponent for debugging');
  }

  // Save self-check results to user profile
  private saveSelfCheckResults(results: any[]): void {
    console.log('💾 Saving self-check results to user profile:', results);
    
    // Prevent duplicate saves
    if (this.resultsSaved) {
      console.log('⚠️ Results already saved, skipping duplicate save');
      return;
    }
    
    // Get authentication token from localStorage
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('❌ No authentication token found');
      return;
    }

    // Prepare health data for backend
    const healthData = this.prepareHealthDataForBackend(results);
    
    this.http.post(`${environment.backendApi}/self-check/save`, {
      healthData,
      scanResults: results,
      scanType: 'self_check',
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        console.log('✅ Self-check results saved successfully:', response);
        this.resultsSaved = true; // Mark as saved to prevent duplicates
      },
      error: (error) => {
        console.error('❌ Failed to save self-check results:', error);
        // Don't set resultsSaved = true on error, allow retry
      }
    });
  }

  // Prepare health data in the format expected by the backend
  private prepareHealthDataForBackend(results: any[]): any {
    const healthData: any = {};
    
    console.log('🔍 Preparing health data for backend from results:', results);
    
    results.forEach(result => {
      console.log(`📊 Processing result: ${result.category} = ${result.score}`);
      
      switch (result.category) {
        case 'heartRate':
          healthData.heartRate = result.score;
          break;
        case 'systolicPressure':
          healthData.bloodPressure = healthData.bloodPressure || '';
          healthData.bloodPressure = `${result.score}/${healthData.bloodPressure.split('/')[1] || '80'}`;
          break;
        case 'diastolicPressure':
          healthData.bloodPressure = healthData.bloodPressure || '';
          healthData.bloodPressure = `${healthData.bloodPressure.split('/')[0] || '120'}/${result.score}`;
          break;
        case 'oxygenSaturation':
          healthData.spO2 = result.score;
          break;
        case 'respiratoryRate':
          healthData.respiratoryRate = result.score;
          break;
        case 'stress':
          healthData.stressLevel = result.score;
          break;
        case 'stressScore':
          healthData.stressScore = result.score;
          break;
        case 'hrvSdnn':
          healthData.hrvSdnn = result.score;
          break;
        case 'hrvRmsdd':
          healthData.hrvRmsdd = result.score;
          break;
        case 'overall':
        case 'generalWellness':
          healthData.generalWellness = result.score;
          break;
        case 'coronaryRisk':
        case 'coronaryHeartDisease':
          healthData.coronaryHeartDisease = result.score;
          break;
        case 'heartFailureRisk':
        case 'congestiveHeartFailure':
          healthData.congestiveHeartFailure = result.score;
          break;
        case 'strokeRisk':
          healthData.strokeRisk = result.score;
          break;
        case 'cvdRisk':
        case 'generalRisk':
          healthData.generalRisk = result.score;
          break;
        case 'intermittentClaudication':
          healthData.intermittentClaudication = result.score;
          break;
        case 'covidRisk':
          healthData.covidRisk = result.score;
          break;
        default:
          console.log(`⚠️ Unmapped category: ${result.category} with value: ${result.score}`);
          break;
      }
    });
    
    console.log('📋 Final health data for backend:', healthData);
    console.log('📊 Health data keys:', Object.keys(healthData));
    console.log('📊 Health data values:', Object.values(healthData));
    return healthData;
  }

  // Extract results from VSE Plugin data (copied from face-scan component)
  private extractResultsFromVSEPlugin(vseData: any): any[] {
    console.log('🔍 Extracting results from VSE Plugin data:', vseData);
    const results: any[] = [];

    // Extract vital signs - handle both camelCase and snake_case formats
    const vitalSigns = vseData.vitalSigns || vseData.vital_signs;
    if (vitalSigns) {
      const vs = vitalSigns;
      
      if (vs.heartRate || vs.heart_rate) {
        const heartRate = vs.heartRate || vs.heart_rate;
        results.push({
          title: 'Heart Rate',
          description: 'Heart rate measurement from facial blood flow analysis.',
          score: Math.round(heartRate),
          value: `${heartRate.toFixed(1)} bpm`,
          category: 'heartRate',
          status: this.getStatusFromValue('heartRate', heartRate),
          color: this.getColorFromValue('heartRate', heartRate),
          normalRange: '60-100 bpm'
        });
      }

      if (vs.respiratoryRate || vs.respiratory_rate) {
        const respiratoryRate = vs.respiratoryRate || vs.respiratory_rate;
        results.push({
          title: 'Respiratory Rate',
          description: 'Breathing rate detected through facial monitoring.',
          score: Math.round(respiratoryRate),
          value: `${respiratoryRate.toFixed(1)} bpm`,
          category: 'respiratoryRate',
          status: this.getStatusFromValue('respiratoryRate', respiratoryRate),
          color: this.getColorFromValue('respiratoryRate', respiratoryRate),
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

      if (vs.stress) {
        results.push({
          title: 'Stress Level',
          description: 'Stress level assessment from facial analysis.',
          score: vs.stress,
          value: vs.stress.toFixed(2),
          category: 'stress',
          status: 'Good',
          color: 'orange'
        });
      }

      if (vs.stressScore) {
        results.push({
          title: 'Stress Score',
          description: 'Composite stress score from facial analysis.',
          score: Math.round(vs.stressScore),
          value: vs.stressScore.toFixed(1),
          category: 'stressScore',
          status: 'Good',
          color: 'orange'
        });
      }

      if (vs.hrvSdnn) {
        results.push({
          title: 'HRV SDNN',
          description: 'Heart Rate Variability Standard Deviation of NN intervals.',
          score: vs.hrvSdnn,
          value: `${vs.hrvSdnn.toFixed(1)} ms`,
          category: 'hrvSdnn',
          status: 'Good',
          color: 'green'
        });
      }

      if (vs.hrvRmsdd) {
        results.push({
          title: 'HRV RMSSD',
          description: 'Heart Rate Variability Root Mean Square of Successive Differences.',
          score: vs.hrvRmsdd,
          value: `${vs.hrvRmsdd.toFixed(1)} ms`,
          category: 'hrvRmsdd',
          status: 'Good',
          color: 'green'
        });
      }

      if (vs.bloodPressure) {
        results.push({
          title: 'Blood Pressure',
          description: 'Blood pressure measurement.',
          score: vs.bloodPressure,
          value: vs.bloodPressure,
          category: 'bloodPressure',
          status: 'Good',
          color: 'green'
        });
      }
    }

    // Extract holistic health - handle both camelCase and snake_case formats
    const holisticHealth = vseData.holisticHealth || vseData.holistic_health;
    if (holisticHealth) {
      const hh = holisticHealth;
      
      if (hh.generalWellness || hh.general_wellness) {
        const generalWellness = hh.generalWellness || hh.general_wellness;
        results.push({
          title: 'Overall Health Score',
          description: 'Your comprehensive health assessment based on facial analysis.',
          score: Math.round(generalWellness),
          value: `${generalWellness.toFixed(1)}%`,
          category: 'overall',
          status: this.getStatusFromScore(generalWellness),
          color: this.getColorFromScore(generalWellness)
        });
      }
    }

    // Extract health risks (convert to percentages) - handle both camelCase and snake_case formats
    const healthRisks = vseData.risks?.cardiovascularRisks || vseData.health_risks;
    if (healthRisks) {
      const hr = healthRisks;
      
      if (hr.congestiveHeartFailure || hr.cvd_risk_CHF) {
        const chfRisk = hr.congestiveHeartFailure || hr.cvd_risk_CHF;
        results.push({
          title: 'Risk of Congestive Heart Failure',
          description: 'Cardiovascular risk assessment.',
          score: chfRisk * 100,
          value: `${(chfRisk * 100).toFixed(2)}%`,
          category: 'heartFailureRisk',
          status: this.getStatusFromRisk(chfRisk * 100),
          color: this.getColorFromRisk(chfRisk * 100),
          normalRange: '< 2%'
        });
      }

      if (hr.coronaryHeartDisease || hr.cvd_risk_CHD) {
        const chdRisk = hr.coronaryHeartDisease || hr.cvd_risk_CHD;
        results.push({
          title: 'Risk of Coronary Heart Disease',
          description: 'Coronary artery disease risk assessment.',
          score: chdRisk * 100,
          value: `${(chdRisk * 100).toFixed(2)}%`,
          category: 'coronaryRisk',
          status: this.getStatusFromRisk(chdRisk * 100),
          color: this.getColorFromRisk(chdRisk * 100),
          normalRange: '< 5%'
        });
      }

      if (hr.stroke || hr.cvd_risk_Stroke) {
        const strokeRisk = hr.stroke || hr.cvd_risk_Stroke;
        results.push({
          title: 'Risk of Stroke',
          description: 'Stroke risk assessment based on cardiovascular indicators.',
          score: strokeRisk * 100,
          value: `${(strokeRisk * 100).toFixed(2)}%`,
          category: 'strokeRisk',
          status: this.getStatusFromRisk(strokeRisk * 100),
          color: this.getColorFromRisk(strokeRisk * 100),
          normalRange: '< 2%'
        });
      }

      if (hr.generalRisk || hr.cvd_risk_general) {
        const generalRisk = hr.generalRisk || hr.cvd_risk_general;
        results.push({
          title: 'General Cardiovascular Risk',
          description: 'Overall cardiovascular disease risk assessment.',
          score: generalRisk * 100,
          value: `${(generalRisk * 100).toFixed(2)}%`,
          category: 'cvdRisk',
          status: this.getStatusFromRisk(generalRisk * 100),
          color: this.getColorFromRisk(generalRisk * 100),
          normalRange: '< 2%'
        });
      }

      if (hr.intermittentClaudication) {
        results.push({
          title: 'Intermittent Claudication Risk',
          description: 'Risk of intermittent claudication (leg pain during exercise).',
          score: hr.intermittentClaudication * 100,
          value: `${(hr.intermittentClaudication * 100).toFixed(2)}%`,
          category: 'intermittentClaudication',
          status: this.getStatusFromRisk(hr.intermittentClaudication * 100),
          color: this.getColorFromRisk(hr.intermittentClaudication * 100),
          normalRange: '< 1%'
        });
      }
    }

    // Extract COVID risk - handle both camelCase and snake_case formats
    const covidRisk = vseData.risks?.covidRisk?.covidRisk || vseData.covidRisk?.covidRisk;
    if (covidRisk) {
      results.push({
        title: 'COVID-19 Risk',
        description: 'COVID-19 risk assessment.',
        score: covidRisk * 100,
        value: `${(covidRisk * 100).toFixed(2)}%`,
        category: 'covidRisk',
        status: this.getStatusFromRisk(covidRisk * 100),
        color: this.getColorFromRisk(covidRisk * 100),
        normalRange: '< 5%'
      });
    }

    console.log(`✅ Extracted ${results.length} real health metrics from VSE Plugin:`, results);
    return results;
  }

  // Process results from data (copied from face-scan component)
  private processResults(data: any): any[] {
    console.log('📊 Processing results from data:', data);
    
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

    console.log(`✅ Processed ${results.length} health metrics:`, results);
    return results;
  }

  // Create health metric from any data (copied from face-scan component)
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
      category = 'hrvRmsdd';
      title = 'HRV RMSSD';
      description = 'Heart Rate Variability Root Mean Square of Successive Differences';
    } else if (lowerKey === 'hrvsdnn' || lowerPath.includes('hrvsdnn')) {
      unit = 'ms';
      category = 'hrvSdnn';
      title = 'HRV SDNN';
      description = 'Heart Rate Variability Standard Deviation of NN intervals';
    }
    // Heart Rate
    else if ((lowerKey.includes('heart') || lowerKey.includes('pulse') || lowerKey.includes('bpm')) && (lowerPath.includes('vitalsigns.heart') || lowerPath.includes('vitalsigns.heartrate'))) {
      unit = 'bpm';
      category = 'heartRate';
      title = 'Heart Rate';
      description = 'Heart rate measurement from facial analysis';
    }
    // Respiratory Rate
    else if ((lowerKey.includes('respiratory') || lowerKey.includes('breathing')) && (lowerPath.includes('vitalsigns.respiratory') || lowerPath.includes('vitalsigns.respiratoryrate'))) {
      unit = 'bpm';
      category = 'respiratoryRate';
      title = 'Respiratory Rate';
      description = 'Breathing rate detected through facial monitoring';
    }
    // Oxygen Saturation
    else if (lowerKey.includes('oxygen') || lowerKey.includes('spo2')) {
      unit = '%';
      category = 'oxygenSaturation';
      title = 'Oxygen Saturation';
      description = 'Blood oxygen level estimation';
    }
    // Stress Level
    else if (lowerKey === 'stress' && (lowerPath.includes('vitalsigns.stress') || lowerPath.includes('vitalsigns.stress'))) {
      unit = '';
      category = 'stress';
      title = 'Stress Level';
      description = 'Stress level assessment from facial analysis';
    }
    // Stress Score
    else if (lowerKey === 'stressscore' && (lowerPath.includes('vitalsigns.stressscore') || lowerPath.includes('vitalsigns.stressscore'))) {
      unit = '';
      category = 'stressScore';
      title = 'Stress Score';
      description = 'Composite stress score from facial analysis';
    }
    // Blood Pressure - Diastolic
    else if (lowerKey.includes('diastolic')) {
      unit = 'mmHg';
      category = 'diastolicPressure';
      title = 'Blood Pressure (Diastolic)';
      description = 'Diastolic blood pressure assessment';
    }
    // Blood Pressure - Systolic
    else if (lowerKey.includes('systolic')) {
      unit = 'mmHg';
      category = 'systolicPressure';
      title = 'Blood Pressure (Systolic)';
      description = 'Systolic blood pressure assessment';
    }
    // General Wellness
    else if (lowerKey.includes('wellness') && (lowerPath.includes('holistichealth.generalwellness') || lowerPath.includes('holistichealth.generalwellness'))) {
      unit = '%';
      category = 'generalWellness';
      title = 'General Wellness';
      description = 'Overall health and wellness score';
    }
    // Cardiovascular Risks
    else if (lowerPath.includes('coronaryheartdisease')) {
      unit = '%';
      category = 'coronaryRisk';
      title = 'Coronary Heart Disease Risk';
      description = 'Coronary artery disease risk assessment';
      value = value * 100;
    } else if (lowerPath.includes('congestiveheartfailure')) {
      unit = '%';
      category = 'heartFailureRisk';
      title = 'Congestive Heart Failure Risk';
      description = 'Congestive heart failure risk assessment';
      value = value * 100;
    } else if (lowerPath.includes('stroke')) {
      unit = '%';
      category = 'strokeRisk';
      title = 'Stroke Risk';
      description = 'Stroke risk assessment';
      value = value * 100;
    } else if (lowerPath.includes('generalrisk')) {
      unit = '%';
      category = 'generalRisk';
      title = 'General Cardiovascular Risk';
      description = 'Overall cardiovascular disease risk assessment';
      value = value * 100;
    } else if (lowerPath.includes('intermittentclaudication')) {
      unit = '%';
      category = 'intermittentClaudication';
      title = 'Intermittent Claudication Risk';
      description = 'Risk of intermittent claudication (leg pain during exercise)';
      value = value * 100;
    }
    // COVID Risk
    else if (lowerPath.includes('covidrisk.covidrisk')) {
      unit = '%';
      category = 'covidRisk';
      title = 'COVID-19 Risk';
      description = 'COVID-19 risk assessment';
      value = value * 100;
    }
    // Fallback for stress
    else if (lowerKey.includes('stress')) {
      unit = '';
      category = 'stress';
      title = 'Stress Level';
      description = 'Stress level assessment';
    }
    // Fallback for score
    else if (lowerKey.includes('score')) {
      unit = '%';
      category = 'overall';
      title = 'Health Score';
      description = 'Overall health assessment score';
    }

    if (value >= 0 && value <= 1000) {
      // For risk values, preserve decimal precision; for other values, round to integers
      const isRiskValue = category.includes('Risk') || category.includes('Disease') || category.includes('Failure') || category.includes('Claudication') || category.includes('Stroke') || category.includes('Covid');
      const scoreValue = isRiskValue ? value : Math.round(value);
      
      return {
        title: title,
        description: description,
        score: scoreValue,
        value: unit ? `${value.toFixed(1)} ${unit}` : value.toFixed(2),
        category: category,
        status: 'Good',
        color: 'orange',
        source: path
      };
    }
    return null;
  }

  // Helper methods for status and color determination (copied from face-scan component)
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

  // Helper methods for UI
  getOverallScore() {
    return this.scanResults.find(result => result.category === 'overall');
  }

  getResultsByCategory(categories: string[]) {
    return this.scanResults.filter(result => categories.includes(result.category));
  }

  getScoreDescription(key: string): string {
    const descriptionMap: { [key: string]: string } = {
      skinHealth: `Skin health analysis evaluates the condition of your skin, including hydration, elasticity, and the presence of any visible issues. Healthy skin is a reflection of overall well-being and can be influenced by factors such as nutrition, hydration, sleep, and environmental exposure.`,
      stressLevel: `Stress level is assessed by analyzing subtle facial cues, such as micro-expressions, muscle tension, and skin color changes. Chronic stress can negatively impact your cardiovascular, immune, and mental health. Managing stress through relaxation, exercise, and mindfulness is important for long-term well-being.`,
      heartRate: `Heart rate is the number of times your heart beats per minute (bpm). It is a key indicator of cardiovascular health. A normal resting heart rate for adults ranges from 60 to 100 bpm. Factors such as fitness, stress, medication, and illness can affect your heart rate. Consistently high or low heart rates may indicate underlying health issues and should be discussed with a healthcare provider.`,
      bloodPressure: `Blood pressure is the force of blood pushing against the walls of your arteries. It is measured in millimeters of mercury (mmHg) and recorded as two numbers: systolic (pressure during heartbeats) and diastolic (pressure between beats). Normal blood pressure is typically around 120/80 mmHg. High blood pressure (hypertension) increases the risk of heart disease and stroke.`,
      systolicPressure: `Systolic blood pressure is the top number in a blood pressure reading. It measures the pressure in your arteries when your heart beats. Normal systolic pressure is between 90 and 120 mmHg. Elevated systolic pressure can be a sign of hypertension and may require lifestyle changes or medical treatment.`,
      diastolicPressure: `Diastolic blood pressure is the bottom number in a blood pressure reading. It measures the pressure in your arteries when your heart rests between beats. Normal diastolic pressure is between 60 and 80 mmHg. High diastolic pressure can increase the risk of cardiovascular events.`,
      oxygenSaturation: `Oxygen saturation (SpO2) indicates the percentage of hemoglobin in your blood that is saturated with oxygen. Normal SpO2 levels are typically between 95% and 100%. Low oxygen saturation can be a sign of respiratory or circulatory problems and may require medical attention.`,
      respiratoryRate: `Respiratory rate is the number of breaths you take per minute. The normal range for adults is 12 to 20 breaths per minute. Changes in respiratory rate can indicate stress, illness, or underlying health conditions such as asthma or infection.`,
      overall: `The overall health score is a composite measure based on multiple health indicators analyzed from your facial scan. It provides a summary of your general health status and highlights areas for improvement.`,
      stress: `Stress is your body's response to challenges or demands. Chronic stress can affect your heart, immune system, and mental health. This metric is estimated from facial cues and physiological signals, and high levels may suggest the need for relaxation or lifestyle adjustments.`,
      coronaryRisk: `Coronary heart disease (CHD) risk estimates your likelihood of developing blockages in the arteries that supply blood to your heart. CHD is a leading cause of heart attacks. Risk factors include high blood pressure, high cholesterol, smoking, diabetes, obesity, and a sedentary lifestyle. Lowering your risk involves healthy eating, regular exercise, not smoking, and managing blood pressure and cholesterol levels. This score is based on facial and physiological indicators detected during your scan.`,
      heartFailureRisk: `Congestive heart failure (CHF) risk reflects the chance that your heart may not pump blood as efficiently as it should. CHF can develop due to conditions like coronary artery disease, high blood pressure, or previous heart attacks. Symptoms include shortness of breath, fatigue, and swelling in the legs. Early detection and management of risk factors can help prevent heart failure. This risk score is calculated using advanced facial analysis and health data.`,
      strokeRisk: `Stroke risk measures the probability of experiencing a stroke, which occurs when blood flow to part of the brain is interrupted. Major risk factors include high blood pressure, atrial fibrillation, diabetes, smoking, and high cholesterol. Strokes can cause lasting brain damage, disability, or death. Reducing your risk involves controlling blood pressure, maintaining a healthy weight, staying active, and avoiding tobacco. This score is derived from your facial scan and health metrics.`,
      cvdRisk: `Cardiovascular disease (CVD) risk is an overall estimate of your likelihood of developing diseases of the heart and blood vessels, such as heart attack, stroke, or peripheral artery disease. CVD is influenced by genetics, lifestyle, and other health conditions. Preventive measures include a balanced diet, regular physical activity, not smoking, and regular health checkups. This risk score is based on a combination of facial features and physiological signals detected during your scan.`
    };
    return descriptionMap[key] || `Assessment of ${key} based on facial analysis. Click the info icon for a detailed explanation.`;
  }
}
