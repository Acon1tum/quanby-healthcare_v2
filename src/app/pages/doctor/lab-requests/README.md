# Lab Request Management - Doctor

This component provides doctors with comprehensive lab request management functionality.

## Features

### For Doctors:
- **Create Lab Requests**: Create new lab requests for patients
- **View All Requests**: View all lab requests created by the doctor
- **Manage Status**: Approve, reject, or update lab request status
- **Add Test Results**: Add test results and findings to completed requests
- **Export PDF**: Export lab requests as PDF documents
- **Filter & Search**: Filter requests by status, date range, patient, etc.
- **Pagination**: Navigate through large lists of requests

### Key Functionality:
1. **Request Creation**: Select patient, laboratory organization, and add notes
2. **Status Management**: 
   - PENDING → APPROVED/REJECTED
   - APPROVED → COMPLETED (with results)
3. **Results Management**: Add detailed test results and findings
4. **PDF Export**: Generate professional PDF reports for lab requests

## Components

- `DoctorLabRequestsComponent`: Main component for doctor lab request management
- `LabRequestService`: Service for API integration and data management

## Routes

- `/doctor/lab-requests` - Main lab request management page

## Dependencies

- Angular Forms Module
- Lab Request Service
- Auth Service
- Material Icons

## Usage

1. Navigate to Lab Request Management from the sidebar
2. Use "New Lab Request" to create requests for patients
3. View and manage existing requests in the table
4. Click on request details to view full information
5. Use status buttons to approve/reject requests
6. Add test results when lab work is completed
7. Export PDFs for completed requests

## API Integration

The component integrates with the backend lab request API endpoints:
- GET `/lab-requests` - Fetch lab requests
- POST `/lab-requests` - Create new request
- PUT `/lab-requests/:id` - Update request
- PATCH `/lab-requests/:id/status` - Update status
- PATCH `/lab-requests/:id/results` - Add test results
- GET `/lab-requests/:id/export/pdf` - Export PDF
- DELETE `/lab-requests/:id` - Delete request
