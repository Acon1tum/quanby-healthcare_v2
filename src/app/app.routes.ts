import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { FaceScanComponent } from './face-scan/face-scan.component';

// Shared Components
import { NotificationComponent } from './shared/notification/notification.component';

// Super Admin Components
import { DashboardSuperadminComponent } from './pages/super-admin/dashboard-superadmin/dashboard-superadmin.component';
import { OrgManagementComponent } from './pages/super-admin/org-management/org-management.component';
import { DoctorManagementComponent as DoctorManagementSuperadminComponent } from './pages/super-admin/doctor-management/doctor-management.component';
import { PatientManagementComponent as PatientManagementSuperadminComponent } from './pages/super-admin/patient-management/patient-management.component';
import { AuditLogsSuperadminComponent } from './pages/super-admin/audit-logs-superadmin/audit-logs-superadmin.component';
import { ReportsSuperadminComponent } from './pages/super-admin/reports-superadmin/reports-superadmin.component';
import { SettingsComponent } from './pages/super-admin/settings/settings.component';


// Admin Components
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { ScheduleManagementComponent } from './pages/admin/schedule-management/schedule-management.component';
import { SystemAdmininstrationComponent } from './pages/admin/system-admininstration/system-admininstration.component';
import { AuditLogsComponent } from './pages/admin/system-admininstration/audit-logs/audit-logs.component';
import { DoctorManagementComponent } from './pages/admin/system-admininstration/doctor-management/doctor-management.component';
import { PatientManagementComponent } from './pages/admin/system-admininstration/patient-management/patient-management.component';
import { PatientInformationComponent } from './pages/admin/system-admininstration/patient-management/patient-information/patient-information.component';
import { ReportsComponent } from './pages/admin/system-admininstration/reports/reports.component';
import { AdminMyProfileComponent } from './pages/admin/admin-my-profile/admin-my-profile.component';
import { DoctorInformationComponent } from './pages/admin/system-admininstration/doctor-management/doctor-information/doctor-information.component';

// Doctor Components
import { DoctorDashboardComponent } from './pages/doctor/doctor-dashboard/doctor-dashboard.component';
import { DoctorMeetComponent } from './pages/doctor/doctor-meet/doctor-meet.component';
import { DoctorMyProfileComponent } from './pages/doctor/doctor-my-profile/doctor-my-profile.component';
import { DoctorScheduleComponent } from './pages/doctor/doctor-schedule/doctor-schedule.component';
import { PatientRecordsComponent } from './pages/doctor/patient-records/patient-records.component';
import { DoctorLabRequestsComponent } from './pages/doctor/lab-requests/lab-requests.component';

// Patient Components
import { PatientDashboardComponent } from './pages/patient/patient-dashboard/patient-dashboard.component';
import { PatientMeetComponent } from './pages/patient/patient-meet/patient-meet.component';
import { PatientMyProfileComponent } from './pages/patient/patient-my-profile/patient-my-profile.component';
import { PatientScheduleComponent } from './pages/patient/patient-schedule/patient-schedule.component';
import { MedicalRecordsComponent } from './pages/patient/medical-records/medical-records.component';
import { SelfCheckComponent } from './pages/patient/self-check/self-check.component';
import { PatientLabRequestsComponent } from './pages/patient/lab-requests/lab-requests.component';

// Layout Components
import { DashboardLayoutComponent } from './shared/layouts/dashboard-layout.component';

// Guards
import { AuthGuard } from './shared/guards/auth.guard';
import { RoleGuard } from './shared/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'face-scan', component: FaceScanComponent },
  
  // Protected Routes with Dashboard Layout
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [

      // Super Admin Routes - Protected with super admin role requirement 
      { 
        path: 'super-admin', 
        canActivate: [RoleGuard],
        data: { role: 'SUPER_ADMIN' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: DashboardSuperadminComponent },
          { path: 'notifications', component: NotificationComponent },
          { path: 'org-management', component: OrgManagementComponent },
          { path: 'doctor-management', component: DoctorManagementSuperadminComponent },
          { path: 'patient-management', component: PatientManagementSuperadminComponent },
          { path: 'audit-logs', component: AuditLogsSuperadminComponent },
          { path: 'reports', component: ReportsSuperadminComponent },
          { path: 'settings', component: SettingsComponent }
        ]
      },
      // Admin Routes - Protected with admin role requirement
      { 
        path: 'admin', 
        canActivate: [RoleGuard],
        data: { role: 'ADMIN' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: AdminDashboardComponent },
          { path: 'notifications', component: NotificationComponent },
          { path: 'schedule-management', component: ScheduleManagementComponent },
          { path: 'my-profile', component: AdminMyProfileComponent },
          { 
            path: 'system-administration', 
            children: [
              { path: '', component: SystemAdmininstrationComponent },
              { path: 'audit-logs', component: AuditLogsComponent },
              { path: 'doctor-management', component: DoctorManagementComponent },
              { path: 'doctor-management/doctor-information/:id', component: DoctorInformationComponent },
              { path: 'patient-management', component: PatientManagementComponent },
              { path: 'patient-management/patient-information', component: PatientInformationComponent },
              { path: 'reports', component: ReportsComponent }
            ]
          }
        ]
      },
      
      // Doctor Routes - Protected with doctor role requirement
      { 
        path: 'doctor', 
        canActivate: [RoleGuard],
        data: { role: 'DOCTOR' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: DoctorDashboardComponent },
          { path: 'notifications', component: NotificationComponent },
          { path: 'meet', component: DoctorMeetComponent },
          { path: 'my-profile', component: DoctorMyProfileComponent },
          { path: 'schedule', component: DoctorScheduleComponent },
          { path: 'patient-records', component: PatientRecordsComponent },
          { path: 'lab-requests', component: DoctorLabRequestsComponent }
        ]
      },
      
      // Patient Routes - Protected with patient role requirement
      { 
        path: 'patient', 
        canActivate: [RoleGuard],
        data: { role: 'PATIENT' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: PatientDashboardComponent },
          { path: 'notifications', component: NotificationComponent },
          { path: 'meet', component: PatientMeetComponent },
          { path: 'my-profile', component: PatientMyProfileComponent },
          { path: 'schedule', component: PatientScheduleComponent },
          { path: 'medical-record', component: MedicalRecordsComponent},
          { path: 'self-check', component: SelfCheckComponent},
          { path: 'lab-requests', component: PatientLabRequestsComponent }
        ]
      }
    ]
  },
  
  // Catch all route
  { path: '**', redirectTo: '' }
];
