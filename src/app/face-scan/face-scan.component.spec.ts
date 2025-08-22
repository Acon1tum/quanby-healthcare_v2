import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

import { FaceScanComponent, SafePipe } from './face-scan.component';
import { FaceScanService } from '../services/face-scan.service';

describe('FaceScanComponent', () => {
  let component: FaceScanComponent;
  let fixture: ComponentFixture<FaceScanComponent>;
  let mockFaceScanService: jasmine.SpyObj<FaceScanService>;
  let mockDomSanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    // Create spy objects for dependencies
    mockFaceScanService = jasmine.createSpyObj('FaceScanService', [
      'createDefaultRequest',
      'generateVideoToken',
      'setupIframeMessageHandler',
      'getScore'
    ]);

    mockDomSanitizer = jasmine.createSpyObj('DomSanitizer', [
      'bypassSecurityTrustResourceUrl'
    ]);

    // Setup default return values
    mockFaceScanService.createDefaultRequest.and.returnValue({
      clientId: 'test-client-id',
      age: undefined,
      gender: undefined
    });

    mockFaceScanService.generateVideoToken.and.returnValue(of({
      success: true,
      videoIframeUrl: 'https://test-iframe-url.com'
    }));

    mockFaceScanService.getScore.and.returnValue(of({
      scores: {
        score: 85,
        audioSubScores: {
          'stress': 70,
          'wellness': 90
        }
      }
    }));

    mockDomSanitizer.bypassSecurityTrustResourceUrl.and.returnValue('safe-url' as any);

    await TestBed.configureTestingModule({
      imports: [FaceScanComponent, FormsModule, SafePipe],
      providers: [
        { provide: FaceScanService, useValue: mockFaceScanService },
        { provide: DomSanitizer, useValue: mockDomSanitizer }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FaceScanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.isScanning).toBeFalse();
    expect(component.isLoading).toBeFalse();
    expect(component.scanComplete).toBeFalse();
    expect(component.scanResults).toEqual([]);
    expect(component.scanTimeRemaining).toBe(0);
  });

  it('should start scan with user data', () => {
    component.userAge = 25;
    component.userGender = 'male';

    component.startScan();

    expect(mockFaceScanService.createDefaultRequest).toHaveBeenCalled();
    expect(mockFaceScanService.generateVideoToken).toHaveBeenCalled();
    expect(component.isLoading).toBeTrue();
  });

  it('should handle successful scan start', () => {
    component.startScan();

    expect(component.isScanning).toBeTrue();
    expect(component.isLoading).toBeFalse();
    expect(component.iframeUrl).toBe('https://test-iframe-url.com');
  });

  it('should handle scan error', () => {
    mockFaceScanService.generateVideoToken.and.returnValue(of({
      success: false,
      videoIframeUrl: ''
    }));

    spyOn(console, 'error');
    component.startScan();

    expect(console.error).toHaveBeenCalledWith('Failed to generate video token');
    expect(component.isLoading).toBeFalse();
  });

  it('should start new scan and reset state', () => {
    // Set some state
    component.isScanning = true;
    component.scanComplete = true;
    component.scanResults = [{ title: 'Test', description: 'Test', score: 75 }];
    component.scanStatus = { centered: true };
    component.scanTimeRemaining = 30;
    component.iframeUrl = 'test-url';

    component.startNewScan();

    expect(component.isScanning).toBeFalse();
    expect(component.scanComplete).toBeFalse();
    expect(component.scanResults).toEqual([]);
    expect(component.scanStatus).toBeNull();
    expect(component.scanTimeRemaining).toBe(0);
    expect(component.iframeUrl).toBe('');
  });

  it('should download results as text file', () => {
    component.scanResults = [
      { title: 'Skin Health', description: 'Good condition', score: 85 },
      { title: 'Stress Level', description: 'Low stress', score: 70 }
    ];

    // Mock the download functionality
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob-url');
    spyOn(window.URL, 'revokeObjectURL');
    const mockClick = jasmine.createSpy('click');
    spyOn(document, 'createElement').and.returnValue({
      click: mockClick,
      href: '',
      download: ''
    } as any);

    component.downloadResults();

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob-url');
  });

  it('should process results with scores', () => {
    const testData = {
      scores: {
        score: 85,
        audioSubScores: {
          'wellness': 90,
          'stress': 70
        }
      }
    };

    const results = (component as any).processResults(testData);

    expect(results.length).toBe(3);
    expect(results[0].title).toBe('Overall Score');
    expect(results[0].score).toBe(85);
    expect(results[1].title).toBe('wellness');
    expect(results[1].score).toBe(90);
    expect(results[2].title).toBe('stress');
    expect(results[2].score).toBe(70);
  });

  it('should process fallback results', () => {
    const testData = {
      skinHealth: { score: 75 },
      stressLevel: { score: 60 }
    };

    const results = (component as any).processResults(testData);

    expect(results.length).toBe(2);
    expect(results[0].title).toBe('Skin Health');
    expect(results[0].score).toBe(75);
    expect(results[1].title).toBe('Stress Level');
    expect(results[1].score).toBe(60);
  });

  it('should handle scan error correctly', () => {
    spyOn(console, 'error');
    component.isScanning = true;

    (component as any).handleScanError();

    expect(component.isScanning).toBeFalse();
    expect(console.error).toHaveBeenCalledWith('Scan failed');
  });

  it('should clean up subscriptions on destroy', () => {
    spyOn(component['subscription'], 'unsubscribe');

    component.ngOnDestroy();

    expect(component['subscription'].unsubscribe).toHaveBeenCalled();
  });
});

describe('SafePipe', () => {
  let pipe: SafePipe;
  let mockDomSanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    mockDomSanitizer = jasmine.createSpyObj('DomSanitizer', [
      'bypassSecurityTrustResourceUrl'
    ]);
    pipe = new SafePipe(mockDomSanitizer);
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform URL safely', () => {
    const testUrl = 'https://test-url.com';
    const expectedResult = 'safe-url' as any;
    mockDomSanitizer.bypassSecurityTrustResourceUrl.and.returnValue(expectedResult);

    const result = pipe.transform(testUrl);

    expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(testUrl);
    expect(result).toBe(expectedResult);
  });
}); 