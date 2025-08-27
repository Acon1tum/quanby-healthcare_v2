# Face Scanning Integration in Video Meetings

This document explains how face scanning functionality has been integrated into the doctor and patient video meeting components.

## Overview

The face scanning feature allows doctors to conduct health assessments on patients during video consultations using the InsightGenie AI API. The integration includes:

- **Doctor Side**: Ability to initiate face scans and view results
- **Patient Side**: Automatic display of scan results when completed
- **Real-time Communication**: WebRTC data channels for instant result sharing

## How It Works

### 1. Doctor Initiates Face Scan

When a doctor is in a video meeting with a patient:

1. The "🔍 Start Face Scan" button appears in the video controls (only visible when patient is connected)
2. Clicking the button sends a face scan request to the patient via WebRTC data channel
3. Doctor sees a status modal with instructions and progress updates
4. Patient receives a notification to start the face scan

### 2. Patient Completes Face Scan

The patient receives the face scan request and can choose to proceed:

1. Patient sees a request modal asking to start face scanning
2. Patient clicks "Start Face Scan" to begin the process
3. Patient sees the actual InsightGenie face scanning interface in a modal
4. Camera access is requested and patient follows on-screen instructions
5. The scan analyzes health metrics using AI
6. Results are processed and displayed to the patient

### 3. Results Display

Once scanning is complete:

1. **Patient sees**: Results immediately in their face scan modal with detailed health metrics
2. **Doctor sees**: Results are automatically shared via WebRTC data channel and displayed in their modal
3. Both parties can view the same comprehensive health assessment
4. Results are securely transmitted through the established WebRTC connection

## Technical Implementation

### Components Modified

- `doctor-meet.component.ts` - Added face scanning initiation and result handling
- `patient-meet.component.ts` - Added result display and data channel subscription
- `webrtc.service.ts` - Added data channel functionality for result sharing

### Key Features

- **Modal Interface**: Clean, responsive modal design for both components
- **Real-time Updates**: Live status updates during scanning process
- **Error Handling**: Comprehensive error handling for API failures
- **Responsive Design**: Mobile-friendly interface for all screen sizes

### API Integration

Uses the InsightGenie Health Assessment API:
- Endpoint: `/face-scan/generate-video-token`
- Features: Face analysis, health metrics, customizable interface
- Security: Bearer token authentication

## Usage Instructions

### For Doctors

1. Start a video meeting with a patient
2. Wait for patient to join and establish video connection
3. Click "🔍 Start Face Scan" button
4. Patient will see the scanning interface
5. Monitor scan progress and view results when complete

### For Patients

1. Join the video meeting using the room code
2. Allow camera access when prompted
3. Follow doctor's instructions for face scanning
4. Results will automatically appear when scanning is complete

## Configuration

The face scanning feature is configured with these default settings:

- `noDesign: true` - Minimal interface for integration
- `faceOutline: true` - Visual face guidance overlay
- `showResults: 'display'` - Results shown to patient
- `isVoiceAnalysisOn: false` - Voice analysis disabled by default
- `forceFrontCamera: true` - Ensures front camera usage

## Troubleshooting

### Common Issues

1. **Camera Access Denied**: Ensure patient grants camera permissions
2. **Scan Initialization Failed**: Check API credentials and network connection
3. **Results Not Displaying**: Verify WebRTC data channel connection

### Debug Information

- Check browser console for detailed logging
- Verify WebRTC connection state
- Monitor data channel status

## Security Considerations

- All API calls use secure HTTPS
- Bearer token authentication required
- Patient data transmitted via secure WebRTC channels
- No sensitive data stored locally

## Future Enhancements

- Voice analysis integration
- Custom health parameter input
- Result history and comparison
- Export functionality for medical records
- Integration with electronic health records (EHR) systems
