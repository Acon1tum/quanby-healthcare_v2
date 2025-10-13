# Notification System Integration

## Overview

The notification system has been successfully integrated between the frontend (Angular) and backend (Node.js/Express). The header component now displays real-time notifications for logged-in users.

## Features Implemented

### Frontend (Angular)

1. **Notification Service** (`src/app/services/notification.service.ts`)
   - Fetches notifications from backend API
   - Manages notification state with RxJS observables
   - Auto-refreshes every 30 seconds when user is logged in
   - Provides utility functions for time formatting and priority colors

2. **Header Component Integration** (`src/app/shared/header/`)
   - Displays unread notification count badge
   - Shows notification dropdown with real notifications
   - Marks notifications as read when clicked
   - Delete individual notifications
   - Mark all notifications as read
   - Loading state while fetching notifications
   - Empty state when no notifications exist

### Backend (Node.js/Express)

The backend notification API is already set up at `/api/notifications` with the following endpoints:

- `GET /api/notifications` - Get all notifications for authenticated user
- `GET /api/notifications/unread-count` - Get unread notification count
- `GET /api/notifications/:id` - Get single notification
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/:id/unread` - Mark notification as unread
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `PATCH /api/notifications/:id/archive` - Archive notification
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/test` - Create test notification (dev only)

## How It Works

### User Authentication Flow

1. User logs in via the authentication system
2. JWT token is stored in localStorage
3. Header component automatically loads notifications for the logged-in user
4. Notification service polls for new notifications every 30 seconds
5. Unread count badge updates automatically

### Notification Display

1. Click the notification bell icon in the header
2. Dropdown shows the latest 10 notifications
3. Unread notifications are highlighted with a blue background
4. Click a notification to mark it as read
5. Click the "Mark All as Read" button to clear all unread notifications
6. Click the "X" icon to delete individual notifications

### User-Specific Notifications

The backend ensures that each user only sees their own notifications:

```typescript
// Backend Controller (notifications.controller.ts)
const userId = (req as any).user.id; // Get from JWT token
const notifications = await prisma.notification.findMany({
  where: { userId }, // Only fetch for this user
  // ...
});
```

The frontend automatically uses the logged-in user's JWT token:

```typescript
// Frontend Service (notification.service.ts)
this.http.get<NotificationsResponse>(url, {
  headers: this.authService.getAuthHeaders() // JWT token
})
```

## Notification Types & Priorities

### Types

- `GENERAL` - General notifications
- `APPOINTMENT` - Appointment-related
- `CONSULTATION` - Consultation-related
- `PRESCRIPTION` - Prescription updates
- `LAB_RESULT` - Lab result available
- `MESSAGE` - Direct messages
- `SYSTEM` - System notifications

### Priorities

- `LOW` - Gray indicator
- `NORMAL` - Blue indicator (default)
- `HIGH` - Orange indicator
- `URGENT` - Red indicator

## Testing the Notification System

### 1. Create Test Notifications

Use the test endpoint to create notifications for the logged-in user:

```bash
POST http://localhost:3000/api/notifications/test
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "title": "Test Notification",
  "message": "This is a test notification",
  "type": "GENERAL",
  "priority": "NORMAL"
}
```

### 2. View Notifications

1. Log in to the application
2. Click the notification bell icon in the header
3. You should see your test notification

### 3. Test Notification Actions

- Click a notification to mark it as read
- Click the "X" icon to delete a notification
- Click "Mark All as Read" to mark all notifications as read

## Frontend Code Examples

### Using Notification Service in Components

```typescript
import { NotificationService } from '../../services/notification.service';

export class MyComponent {
  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    // Subscribe to unread count
    this.notificationService.unreadCount$.subscribe(count => {
      console.log('Unread notifications:', count);
    });

    // Subscribe to notifications
    this.notificationService.notifications$.subscribe(notifications => {
      console.log('Notifications:', notifications);
    });
  }

  loadNotifications() {
    this.notificationService.getNotifications({ limit: 10 }).subscribe({
      next: (response) => {
        console.log('Notifications loaded:', response);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId).subscribe();
  }
}
```

## Backend Code Examples

### Creating Notifications Programmatically

```typescript
import { NotificationService } from './modules/notifications/notification.service';
import { NotificationType, NotificationPriority } from '@prisma/client';

// Create a notification when an appointment is scheduled
await NotificationService.createNotification({
  userId: patientId,
  type: NotificationType.APPOINTMENT,
  title: 'Appointment Scheduled',
  message: `Your appointment with Dr. ${doctorName} is scheduled for ${appointmentDate}`,
  priority: NotificationPriority.HIGH,
  actionUrl: `/patient/schedule/${appointmentId}`,
  metadata: {
    appointmentId,
    doctorId,
    appointmentDate
  }
});
```

### Sending Notifications to Multiple Users

```typescript
// Notify all users in a consultation
const userIds = [doctorId, patientId];

for (const userId of userIds) {
  await NotificationService.createNotification({
    userId,
    type: NotificationType.CONSULTATION,
    title: 'Consultation Starting',
    message: 'Your consultation is about to begin',
    priority: NotificationPriority.URGENT,
    actionUrl: `/meet/${consultationCode}`
  });
}
```

## Security Considerations

1. **Authentication Required**: All notification endpoints require a valid JWT token
2. **User Isolation**: Users can only access their own notifications
3. **Data Validation**: Input is sanitized and validated on the backend
4. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
5. **XSS Protection**: HTML is escaped in notification messages

## Polling & Performance

- Notifications are polled every 30 seconds when user is logged in
- Only the latest 10 notifications are fetched by default
- Polling automatically stops when user logs out
- Requests are debounced to prevent excessive API calls

## Future Enhancements

1. **WebSocket/Socket.IO Integration**: Real-time notifications without polling
2. **Push Notifications**: Browser push notifications for urgent alerts
3. **Notification Preferences**: User settings for notification types
4. **Email Notifications**: Send email for important notifications
5. **Notification History**: View all past notifications in a dedicated page
6. **Rich Notifications**: Support for images, actions, and interactive elements

## Troubleshooting

### Notifications Not Showing

1. Check if user is logged in (JWT token in localStorage)
2. Verify backend is running on `http://localhost:3000`
3. Check browser console for API errors
4. Verify notifications exist for the user in the database

### Unread Count Not Updating

1. Check if polling is working (console logs in notification service)
2. Verify the backend `/api/notifications/unread-count` endpoint
3. Clear browser cache and reload

### CORS Errors

1. Verify CORS configuration in `src/index.ts`
2. Ensure `http://localhost:4200` is in the allowed origins
3. Check if Authorization header is allowed in CORS config

## API Response Examples

### Get Notifications Response

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-123",
        "userId": "user-456",
        "type": "APPOINTMENT",
        "title": "Appointment Scheduled",
        "message": "Your appointment with Dr. Smith is scheduled for tomorrow at 10:00 AM",
        "priority": "HIGH",
        "isRead": false,
        "isArchived": false,
        "createdAt": "2025-10-10T10:00:00Z",
        "readAt": null,
        "actionUrl": "/patient/schedule/789",
        "metadata": {
          "appointmentId": "789",
          "doctorId": "doc-111"
        }
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "unreadCount": 3
  }
}
```

### Unread Count Response

```json
{
  "success": true,
  "data": {
    "count": 3
  }
}
```

## Support

For questions or issues, please check:
1. Backend documentation: `qhealth-backend_v2/src/modules/notifications/README.md`
2. API documentation: `qhealth-backend_v2/API_DOCUMENTATION.md`
3. Console logs in browser developer tools



