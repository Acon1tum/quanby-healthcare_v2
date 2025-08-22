import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FaceScanRequest {
  clientId: string;
  age?: number;
  gender?: string;
  showResults?: string;
  noDesign?: boolean;
  faceOutline?: boolean;
  buttonBgColor?: string;
  buttonTextColor?: string;
  isVoiceAnalysisOn?: boolean;
  voiceAnalysisType?: string;
  forceFrontCamera?: boolean;
  diabetesHypertensionParameters?: {
    height?: number;
    weight?: number;
    smoker?: boolean;
    hypertension?: boolean;
    bpMedication?: boolean;
    diabetic?: number;
    waistCircumference?: number;
    heartDisease?: boolean;
    depression?: boolean;
    totalCholesterol?: number;
    hdl?: number;
    parentalHypertension?: number;
    physicalActivity?: boolean;
    healthyDiet?: boolean;
    antiHypertensive?: boolean;
    historyBloodGlucose?: boolean;
    historyFamilyDiabetes?: number;
  };
  language?: string;
  showDisclaimer?: boolean;
}

export interface FaceScanResponse {
  success: boolean;
  videoIframeUrl: string;
}

export interface WebSDKTokenResponse {
  success: boolean;
  videoToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class FaceScanService {
  private readonly API_BASE_URL = environment.insightGenieApi.baseUrl;
  private institutionToken$: Observable<string> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Get the API base URL for debugging purposes
   */
  getApiBaseUrl(): string {
    return this.API_BASE_URL;
  }

  /**
   * Authenticate institution and get Bearer token
   */
  authenticateInstitution(): Observable<string> {
    if (!this.institutionToken$) {
      this.institutionToken$ = this.http.post<{ token: string }>(
        `${this.API_BASE_URL}/auth/authenticate`,
        {
          key: environment.insightGenieApi.apiKey,
          secret: environment.insightGenieApi.apiSecret
        }
      ).pipe(
        map(res => res.token),
        shareReplay(1)
      );
    }
    return this.institutionToken$;
  }

  /**
   * Generate a video token for iframe integration (using institution token)
   */
  generateVideoToken(request: FaceScanRequest): Observable<FaceScanResponse> {
    return this.authenticateInstitution().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<FaceScanResponse>(
          `${this.API_BASE_URL}/face-scan/generate-video-token`,
          request,
          { headers }
        );
      })
    );
  }

  /**
   * Generate a Web SDK token (using institution token)
   */
  generateWebSDKToken(): Observable<WebSDKTokenResponse> {
    return this.authenticateInstitution().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        });
        return this.http.post<WebSDKTokenResponse>(
          `${this.API_BASE_URL}/face-scan/generate-web-sdk-token`,
          {},
          { headers }
        );
      })
    );
  }

  /**
   * Create a default face scan request
   */
  createDefaultRequest(clientId: string): FaceScanRequest {
    return {
      clientId,
      showResults: 'display', // Try display mode to trigger result messaging
      noDesign: false,
      faceOutline: true,
      buttonBgColor: '#1993e5',
      buttonTextColor: '#ffffff',
      isVoiceAnalysisOn: false,
      forceFrontCamera: true,
      language: 'en',
      showDisclaimer: true
    };
  }

  /**
   * Handle iframe messages
   */
  setupIframeMessageHandler(iframeId: string, callbacks: {
    onAnalysisStart?: (data: any) => void;
    onHealthAnalysisFinished?: (data: any) => void;
    onVoiceAnalysisFinished?: (data: any) => void;
    onFailedToGetResults?: (data: any) => void;
    onConditionStatus?: (data: any) => void;
    onScanTimeRemaining?: (data: any) => void;
    onVideoElementDimensions?: (data: any) => void;
  }): void {
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    
    if (!iframe) {
      console.error('Iframe not found:', iframeId);
      return;
    }

    window.addEventListener('message', (event) => {
      if (event.source === iframe.contentWindow) {
        const data = event.data;
        
        switch (data.action) {
          case 'onAnalysisStart':
            callbacks.onAnalysisStart?.(data);
            break;
          case 'onHealthAnalysisFinished':
            callbacks.onHealthAnalysisFinished?.(data);
            break;
          case 'onVoiceAnalysisFinished':
            callbacks.onVoiceAnalysisFinished?.(data);
            break;
          case 'failedToGetResults':
            callbacks.onFailedToGetResults?.(data);
            break;
          case 'conditionStatus':
            callbacks.onConditionStatus?.(data);
            break;
          case 'scanTimeRemaining':
            callbacks.onScanTimeRemaining?.(data);
            break;
          case 'videoElementDimensions':
            callbacks.onVideoElementDimensions?.(data);
            break;
          default:
            console.log('Unknown action:', data.action, data);
            break;
        }
      }
    });
  }

  /**
   * Fetch the score for a completed scan
   */
  getScore(id: string): Observable<any> {
    return this.authenticateInstitution().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(
          `${this.API_BASE_URL}/get-score?id=${id}`,
          { headers }
        );
      })
    );
  }

  /**
   * Get health assessment results
   */
  getHealthAssessment(analysisId: string): Observable<any> {
    return this.authenticateInstitution().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(
          `${this.API_BASE_URL}/health-assessment?analysisId=${analysisId}`,
          { headers }
        );
      })
    );
  }

  /**
   * Get detailed results with all biomarkers
   */
  getDetailedResults(id: string): Observable<any> {
    return this.authenticateInstitution().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(
          `${this.API_BASE_URL}/detailed-results?id=${id}`,
          { headers }
        );
      })
    );
  }
} 