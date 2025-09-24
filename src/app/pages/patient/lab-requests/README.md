# Lab Request Management - Patient

This component provides patients with the ability to view and manage their lab requests.

## Features

### For Patients:
- **View Lab Requests**: View all lab requests created for the patient
- **Request Details**: View detailed information about each request
- **Status Tracking**: Track the status of lab requests (Pending, Approved, Completed, etc.)
- **Export PDF**: Download PDF reports for completed lab requests
- **Filter & Search**: Filter requests by status and date range
- **Status Descriptions**: Clear explanations of what each status means

### Key Functionality:
1. **Request Viewing**: View all lab requests created by doctors for the patient
2. **Status Monitoring**: Track progress from request to completion
3. **Results Access**: View test results when available
4. **PDF Downloads**: Download professional PDF reports

## Components

- `PatientLabRequestsComponent`: Main component for patient lab request viewing
- `LabRequestService`: Service for API integration and data management

## Routes

- `/patient/lab-requests` - Main lab request viewing page

## Dependencies

- Angular Forms Module
- Lab Request Service
- Auth Service
- Material Icons

## Usage

1. Navigate to Lab Request Management from the sidebar
2. View all lab requests created by your doctors
3. Use filters to find specific requests
4. Click on request details to view full information
5. Download PDF reports for completed requests
6. Track the status of your lab requests

## Status Descriptions

- **Pending**: Your lab request is being reviewed by the doctor
- **Approved**: Your lab request has been approved. You can now visit the laboratory
- **Rejected**: Your lab request has been rejected. Please contact your doctor for more information
- **Completed**: Your lab tests have been completed. Results are available for download
- **Cancelled**: Your lab request has been cancelled

## API Integration

The component integrates with the backend lab request API endpoints:
- GET `/lab-requests` - Fetch patient's lab requests
- GET `/lab-requests/:id` - Get specific request details
- GET `/lab-requests/:id/export/pdf` - Export PDF

## Security

- Patients can only view their own lab requests
- PDF export is only available for completed or approved requests
- All requests are filtered by patient ID for security
