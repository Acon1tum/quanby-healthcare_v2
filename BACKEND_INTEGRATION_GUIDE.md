# Backend Integration Guide

## Overview
Your Angular application has been updated to use the real backend authentication system instead of mock data. The login now connects to your Node.js/Prisma backend at `https://qhealth-backend-v2.onrender.com/api`.

## What Was Updated

### 1. AuthService (`src/app/auth/auth.service.ts`)
- ✅ Added HTTP client integration
- ✅ Connected to real backend endpoints
- ✅ Added proper token management (access + refresh tokens)
- ✅ Updated User interface to match backend types
- ✅ Added role-based access control
- ✅ Added token refresh functionality

### 2. Key Changes Made
- **Mock authentication removed** - No more hardcoded users/passwords
- **Real API calls** - Login now calls `/auth/login` endpoint
- **Token storage** - JWT tokens stored in localStorage
- **Role mapping** - Updated to use `ADMIN`, `DOCTOR`, `PATIENT` (matching backend)
- **Error handling** - Proper HTTP error responses

## Test Credentials

Use these credentials from your seed data to test the login:

### Admin User
- **Email:** `admin@qhealth.com`
- **Password:** `admin123`
- **Role:** ADMIN (Full system access)

### Doctor Users
- **Email:** `dr.smith@qhealth.com`
- **Password:** `doctor123`
- **Role:** DOCTOR (Cardiologist)
- **Email:** `dr.johnson@qhealth.com`
- **Password:** `doctor123`
- **Role:** DOCTOR (Dermatologist)

### Patient User
- **Email:** `patient.anderson@email.com`
- **Password:** `patient123`
- **Role:** PATIENT

## Backend Endpoints

Your backend provides these authentication endpoints:

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/change-password` - Change password

## Testing the Integration

### 1. Start Your Backend
```bash
cd qhealth-backend_v2
npm run dev  # or your start command
```

### 2. Start Your Angular App
```bash
cd quanby-healthcare_v2
ng serve
```

### 3. Test Login
1. Navigate to `/login`
2. Use one of the test credentials above
3. Check browser console for any errors
4. Verify successful login and role-based redirect

### 4. Check Network Tab
- Open browser DevTools → Network tab
- Attempt login
- Verify HTTP request to `/auth/login` endpoint
- Check response for success/error

## Troubleshooting

### Common Issues

#### 1. CORS Errors
- Backend CORS is configured for `localhost:4200`
- Production CORS allows your Vercel domain

#### 2. Connection Refused
- Ensure backend is running on port 3000
- Check if backend URL is correct in environment

#### 3. Authentication Errors
- Verify user exists in database
- Check password requirements (8+ chars, uppercase, lowercase, number, special char)
- Ensure database is seeded with test data

#### 4. Role Mapping Issues
- Backend uses: `ADMIN`, `DOCTOR`, `PATIENT`
- Frontend now expects these exact values

### Debug Steps

1. **Check Backend Status**
   ```bash
   curl https://qhealth-backend-v2.onrender.com/health
   ```

2. **Test Login API Directly**
   ```bash
   curl -X POST https://qhealth-backend-v2.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@qhealth.com","password":"admin123"}'
   ```

3. **Check Browser Console**
   - Look for HTTP errors
   - Check authentication responses
   - Verify token storage

## Environment Configuration

Your `environment.ts` is configured for production:
```typescript
backendApi: 'https://qhealth-backend-v2.onrender.com/api'
```

For local development, uncomment:
```typescript
// backendApi: 'http://localhost:3000/api'
```

## Security Features

- **JWT Tokens** - Secure authentication
- **Refresh Tokens** - Automatic token renewal
- **Role-based Access** - Different permissions per user type
- **Password Requirements** - Strong password enforcement
- **CORS Protection** - Origin validation
- **Rate Limiting** - API abuse prevention

## Next Steps

1. ✅ **Authentication** - Complete
2. 🔄 **User Registration** - Update register component
3. 🔄 **Profile Management** - Connect profile endpoints
4. 🔄 **Password Management** - Connect change password
5. 🔄 **User Management** - Admin user management features

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify backend is running and accessible
3. Check network requests in DevTools
4. Ensure database is properly seeded
5. Verify environment configuration
