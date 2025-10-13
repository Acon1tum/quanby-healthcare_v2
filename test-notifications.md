# Testing Notification System Integration

## Quick Test Guide

### Prerequisites

1. Backend server running on `http://localhost:3000`
2. Frontend running on `http://localhost:4200`
3. User account (patient, doctor, or admin)

### Step-by-Step Testing

#### 1. Login to the Application

1. Navigate to `http://localhost:4200/login`
2. Login with any user account
3. You should see the notification bell icon in the header

#### 2. Create Test Notifications via API

Open a REST client (Postman, Thunder Client, or use curl) and send requests:

**Request:**
```http
POST http://localhost:3000/api/notifications/test
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN_HERE

{
  "title": "Test Appointment Reminder",
  "message": "Your appointment with Dr. Smith is scheduled for tomorrow at 10:00 AM",
  "type": "APPOINTMENT",
  "priority": "HIGH"
}
```

**To get your JWT token:**
- After logging in, open browser console (F12)
- Type: `localStorage.getItem('access_token')`
- Copy the token value

#### 3. Create Multiple Test Notifications

**Normal Priority:**
```json
{
  "title": "Lab Results Available",
  "message": "Your recent lab test results are now available to view",
  "type": "LAB_RESULT",
  "priority": "NORMAL"
}
```

**Urgent Priority:**
```json
{
  "title": "Urgent: Prescription Expiring",
  "message": "Your prescription will expire in 3 days. Please renew it soon.",
  "type": "PRESCRIPTION",
  "priority": "URGENT"
}
```

**Low Priority:**
```json
{
  "title": "System Maintenance",
  "message": "System maintenance is scheduled for next Sunday at 2:00 AM",
  "type": "SYSTEM",
  "priority": "LOW"
}
```

#### 4. Verify Notifications in UI

1. Look at the notification bell icon - it should show a red badge with the count
2. Click the notification bell
3. You should see your test notifications in the dropdown
4. Notice the different colored indicators based on priority:
   - Red = URGENT
   - Orange = HIGH
   - Blue = NORMAL
   - Gray = LOW

#### 5. Test Notification Actions

**Mark as Read:**
1. Click on any notification
2. The blue background should disappear
3. The badge count should decrease
4. The indicator dot should turn gray

**Delete Notification:**
1. Hover over a notification
2. Click the "X" icon on the right
3. Notification should be removed
4. Badge count should update

**Mark All as Read:**
1. Click the "Mark All as Read" button at the bottom
2. All notifications should be marked as read
3. Badge count should go to 0

#### 6. Test Auto-Refresh

1. Keep the notification dropdown closed
2. Create a new notification via API (as shown in step 2)
3. Wait 30 seconds (or refresh the page)
4. The badge count should update automatically

#### 7. Test User Isolation

1. Login with User A
2. Create a notification for User A
3. Logout and login with User B
4. User B should NOT see User A's notification
5. Each user should only see their own notifications

### Testing Different User Roles

#### Patient Testing
```json
{
  "title": "Appointment Confirmed",
  "message": "Your appointment with Dr. Johnson has been confirmed",
  "type": "APPOINTMENT",
  "priority": "HIGH"
}
```

#### Doctor Testing
```json
{
  "title": "New Patient Consultation Request",
  "message": "A new patient has requested a consultation with you",
  "type": "CONSULTATION",
  "priority": "HIGH"
}
```

#### Admin Testing
```json
{
  "title": "System Update Available",
  "message": "A new system update is available for installation",
  "type": "SYSTEM",
  "priority": "NORMAL"
}
```

### Testing with cURL

**Create Notification:**
```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification",
    "type": "GENERAL",
    "priority": "NORMAL"
  }'
```

**Get Notifications:**
```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get Unread Count:**
```bash
curl -X GET http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Mark as Read:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Behavior Checklist

- [ ] Notification bell icon is visible when logged in
- [ ] Badge shows correct unread count
- [ ] Badge is hidden when count is 0
- [ ] Clicking bell opens dropdown
- [ ] Dropdown shows loading state initially
- [ ] Notifications display with correct title and message
- [ ] Time ago is formatted correctly (e.g., "2 hours ago")
- [ ] Unread notifications have blue background
- [ ] Priority colors are correct
- [ ] Clicking notification marks it as read
- [ ] Delete button removes notification
- [ ] "Mark All as Read" works correctly
- [ ] Empty state shows when no notifications
- [ ] Auto-refresh works every 30 seconds
- [ ] Only user's own notifications are shown
- [ ] Logout clears notification state

### Common Issues & Solutions

**Issue: "No notifications showing"**
- Check if notifications exist in database
- Verify JWT token is valid
- Check browser console for errors
- Ensure backend is running

**Issue: "401 Unauthorized"**
- JWT token might be expired - re-login
- Check if token is being sent in headers
- Verify backend authentication middleware

**Issue: "CORS error"**
- Check backend CORS configuration in `src/index.ts`
- Ensure `http://localhost:4200` is allowed
- Verify Authorization header is allowed in CORS

**Issue: "Badge count not updating"**
- Check if polling is working (30-second interval)
- Verify backend `/unread-count` endpoint
- Check browser console for API errors

**Issue: "Notification dropdown position is off"**
- Check CSS styles in `header.component.scss`
- Verify viewport width on mobile devices
- Clear browser cache and reload

### Performance Testing

1. Create 50+ notifications
2. Verify dropdown scrolls properly
3. Check if loading is fast
4. Ensure no memory leaks (check browser memory usage)
5. Verify polling doesn't cause performance issues

### Success Criteria

✅ Notifications are created successfully via API  
✅ Notifications appear in the header dropdown  
✅ Only logged-in user's notifications are shown  
✅ Badge count updates correctly  
✅ Marking as read works  
✅ Deleting notifications works  
✅ Auto-refresh works every 30 seconds  
✅ UI is responsive on mobile and desktop  
✅ No console errors  
✅ Performance is good (no lag)  

## Need Help?

Check the following documentation:
- `NOTIFICATION_INTEGRATION.md` - Complete integration guide
- Backend docs: `qhealth-backend_v2/src/modules/notifications/README.md`
- API docs: `qhealth-backend_v2/API_DOCUMENTATION.md`



