import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { SuperadminComponent } from './dashboard/superadmin/superadmin.component';
import { UserComponent } from './dashboard/user/user.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { FaceScanComponent } from './face-scan/face-scan.component';

export const appRoutes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard/superadmin', component: SuperadminComponent },
  { path: 'dashboard/user', component: UserComponent },
  { path: 'face-scan', component: FaceScanComponent },
  // Add any other routes you need
];
