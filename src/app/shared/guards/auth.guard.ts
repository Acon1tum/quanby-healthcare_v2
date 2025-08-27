import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Check if user is logged in
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check if route requires specific role
    const requiredRole = route.data['role'] as 'ADMIN' | 'DOCTOR' | 'PATIENT';
    if (requiredRole && !this.authService.hasRole(requiredRole)) {
      // Redirect to appropriate dashboard based on user's actual role
      this.authService.redirectBasedOnRole();
      return false;
    }

    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const requiredRole = route.data['role'] as 'ADMIN' | 'DOCTOR' | 'PATIENT';
    
    if (!requiredRole) {
      return true;
    }

    if (!this.authService.hasRole(requiredRole)) {
      // Redirect to appropriate dashboard based on user's actual role
      this.authService.redirectBasedOnRole();
      return false;
    }

    return true;
  }
}
