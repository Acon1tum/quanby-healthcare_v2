# Authentication System

This authentication system provides role-based access control for the QHealth application with automatic redirection based on user roles.

## Features

- **Role-Based Authentication**: Supports admin, doctor, and patient roles
- **Automatic Redirection**: Users are automatically redirected to their appropriate dashboard after login
- **Route Protection**: Routes are protected based on user roles and authentication status
- **Persistent Sessions**: User sessions are maintained using localStorage
- **Responsive Design**: Works on all device sizes

## Demo Accounts

For testing purposes, the following demo accounts are available:

### Admin User
- **Email**: `admin@qhealth.com`
- **Password**: `admin123`
- **Access**: Full system administration, schedule management, user management

### Doctor User
- **Email**: `doctor@qhealth.com`
- **Password**: `doctor123`
- **Access**: Doctor dashboard, patient meetings, profile management, scheduling

### Patient User
- **Email**: `patient@qhealth.com`
- **Password**: `patient123`
- **Access**: Patient dashboard, doctor meetings, profile management, scheduling

## How It Works

### 1. Login Process
1. User enters email and password
2. System validates credentials against mock user database
3. If valid, user is authenticated and redirected to role-appropriate dashboard
4. User session is stored in localStorage

### 2. Role-Based Redirection
- **Admin**: Redirected to `/admin/dashboard`
- **Doctor**: Redirected to `/doctor/dashboard`
- **Patient**: Redirected to `/patient/dashboard`

### 3. Route Protection
- All dashboard routes are protected by `AuthGuard` (requires authentication)
- Role-specific routes are protected by `RoleGuard` (requires specific role)
- Unauthorized access attempts redirect to appropriate dashboard

### 4. Session Management
- User sessions persist across browser refreshes
- Logout clears session and redirects to login page
- "Remember Me" functionality stores user preference

## Implementation Details

### AuthService
- Manages user authentication state
- Handles login/logout operations
- Provides role-based access control methods
- Manages user sessions

### Guards
- **AuthGuard**: Ensures user is authenticated
- **RoleGuard**: Ensures user has required role for specific routes

### Components
- **LoginComponent**: Handles user authentication
- **DashboardLayoutComponent**: Provides consistent layout for authenticated users
- **SidebarComponent**: Shows role-appropriate navigation

## Usage Examples

### Basic Login
```typescript
// In your component
constructor(private authService: AuthService) {}

async login(email: string, password: string) {
  const result = await this.authService.login({ email, password });
  if (result.success) {
    // User will be automatically redirected
  }
}
```

### Check User Role
```typescript
// Check if user has admin access
if (this.authService.hasRole('admin')) {
  // Show admin features
}

// Get current user role
const role = this.authService.userRole;
```

### Protect Routes
```typescript
// In your routing configuration
{
  path: 'admin',
  canActivate: [AuthGuard, RoleGuard],
  data: { role: 'admin' },
  component: AdminComponent
}
```

## Security Notes

⚠️ **Important**: This is a demo implementation with mock authentication. For production use:

1. Replace mock authentication with real API calls
2. Implement proper password hashing and validation
3. Use secure token-based authentication (JWT)
4. Add CSRF protection
5. Implement rate limiting
6. Use HTTPS for all authentication requests
7. Add proper error handling and logging

## Customization

### Adding New Roles
1. Update the `User` interface in `auth.service.ts`
2. Add new role to the role union type
3. Update the `hasRole` method logic
4. Add role-specific routes and components
5. Update the sidebar navigation

### Custom Authentication
1. Replace the `authenticateUser` method in `AuthService`
2. Update the `login` method to call your API
3. Modify the `User` interface to match your user model
4. Update guards if needed

## Troubleshooting

### Common Issues

1. **User not redirected after login**
   - Check browser console for errors
   - Verify route configuration
   - Ensure guards are properly configured

2. **Role-based access not working**
   - Verify user role is correctly set
   - Check guard configuration in routes
   - Ensure role data is properly passed

3. **Session not persisting**
   - Check localStorage availability
   - Verify user object structure
   - Check for JavaScript errors

### Debug Mode
Enable debug logging by adding console.log statements in the AuthService methods to track authentication flow.
