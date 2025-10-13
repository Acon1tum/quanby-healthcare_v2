import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { WebSocketService } from './websocket.service';

export enum NotificationType {
  GENERAL = 'GENERAL',
  APPOINTMENT = 'APPOINTMENT',
  CONSULTATION = 'CONSULTATION',
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_RESULT = 'LAB_RESULT',
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  metadata?: any;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    unreadCount: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Fallback polling interval (60 seconds - less frequent since we have WebSocket)
  private pollingInterval = 60000;
  private pollingSubscription?: Subscription;
  private wsSubscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private websocketService: WebSocketService
  ) {
    // Setup WebSocket listeners and fallback polling when user is logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.setupWebSocketListeners();
        this.startFallbackPolling();
      } else {
        this.cleanup();
      }
    });
  }

  /**
   * Get all notifications for the authenticated user
   */
  getNotifications(params?: {
    isRead?: boolean;
    isArchived?: boolean;
    type?: NotificationType;
    priority?: NotificationPriority;
    limit?: number;
    offset?: number;
  }): Observable<NotificationsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${environment.backendApi}/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.http.get<NotificationsResponse>(url, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response.success) {
          this.notificationsSubject.next(response.data.notifications);
          this.unreadCountSubject.next(response.data.unreadCount);
        }
      })
    );
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(
      `${environment.backendApi}/notifications/unread-count`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(response => {
        if (response.success) {
          this.unreadCountSubject.next(response.data.count);
        }
      })
    );
  }

  /**
   * Get a single notification by ID
   */
  getNotificationById(id: string): Observable<{ success: boolean; data: Notification }> {
    return this.http.get<{ success: boolean; data: Notification }>(
      `${environment.backendApi}/notifications/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): Observable<{ success: boolean; message: string; data: Notification }> {
    return this.http.patch<{ success: boolean; message: string; data: Notification }>(
      `${environment.backendApi}/notifications/${id}/read`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.refreshNotifications())
    );
  }

  /**
   * Mark notification as unread
   */
  markAsUnread(id: string): Observable<{ success: boolean; message: string; data: Notification }> {
    return this.http.patch<{ success: boolean; message: string; data: Notification }>(
      `${environment.backendApi}/notifications/${id}/unread`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.refreshNotifications())
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ success: boolean; message: string; data: { count: number } }> {
    return this.http.patch<{ success: boolean; message: string; data: { count: number } }>(
      `${environment.backendApi}/notifications/mark-all-read`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.refreshNotifications())
    );
  }

  /**
   * Archive notification
   */
  archiveNotification(id: string): Observable<{ success: boolean; message: string; data: Notification }> {
    return this.http.patch<{ success: boolean; message: string; data: Notification }>(
      `${environment.backendApi}/notifications/${id}/archive`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.refreshNotifications())
    );
  }

  /**
   * Delete notification
   */
  deleteNotification(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${environment.backendApi}/notifications/${id}`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.refreshNotifications())
    );
  }

  /**
   * Create test notification (for development)
   */
  createTestNotification(data: {
    title?: string;
    message?: string;
    type?: NotificationType;
    priority?: NotificationPriority;
  }): Observable<{ success: boolean; message: string; data: Notification }> {
    return this.http.post<{ success: boolean; message: string; data: Notification }>(
      `${environment.backendApi}/notifications/test`,
      data,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.refreshNotifications())
    );
  }

  /**
   * Refresh notifications
   */
  refreshNotifications(): void {
    this.getNotifications({ limit: 10, isArchived: false }).subscribe();
  }

  /**
   * Setup WebSocket event listeners for real-time notifications
   */
  private setupWebSocketListeners(): void {
    console.log('📡 Setting up WebSocket notification listeners...');

    // Wait for WebSocket connection before setting up listeners
    this.websocketService.isConnected$.subscribe(isConnected => {
      if (isConnected) {
        console.log('✅ WebSocket connected, setting up notification listeners...');
        this.setupNotificationListeners();
      } else {
        console.log('❌ WebSocket disconnected, cleaning up listeners...');
        this.cleanupWebSocketListeners();
      }
    });

    // Initial fetch when WebSocket connects
    this.refreshNotifications();
  }

  /**
   * Setup individual notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for new notifications
    const newNotificationSub = this.websocketService.on<Notification>('notification:new')
      .subscribe({
        next: (notification) => {
          console.log('📬 New notification received via WebSocket:', notification);
          
          // Add to notifications array
          const currentNotifications = this.notificationsSubject.value;
          this.notificationsSubject.next([notification, ...currentNotifications].slice(0, 10));
          
          // Play notification sound/show browser notification if needed
          this.showBrowserNotification(notification);
        },
        error: (error) => {
          console.error('❌ Error in new notification listener:', error);
        }
      });
    this.wsSubscriptions.push(newNotificationSub);

    // Listen for unread count updates
    const unreadCountSub = this.websocketService.on<{ count: number }>('notification:unread-count')
      .subscribe({
        next: (data) => {
          console.log('📊 Unread count updated via WebSocket:', data.count);
          this.unreadCountSubject.next(data.count);
        },
        error: (error) => {
          console.error('❌ Error in unread count listener:', error);
        }
      });
    this.wsSubscriptions.push(unreadCountSub);

    // Listen for notification refresh signal
    const refreshSub = this.websocketService.on('notification:refresh')
      .subscribe({
        next: () => {
          console.log('🔄 Refresh signal received via WebSocket');
          this.refreshNotifications();
        },
        error: (error) => {
          console.error('❌ Error in refresh listener:', error);
        }
      });
    this.wsSubscriptions.push(refreshSub);

    // Listen for notification updates (mark as read)
    const updateSub = this.websocketService.on<Notification>('notification:updated')
      .subscribe({
        next: (updatedNotification) => {
          console.log('📝 Notification updated via WebSocket:', updatedNotification);
          
          const currentNotifications = this.notificationsSubject.value;
          const index = currentNotifications.findIndex(n => n.id === updatedNotification.id);
          if (index !== -1) {
            currentNotifications[index] = updatedNotification;
            this.notificationsSubject.next([...currentNotifications]);
          }
        },
        error: (error) => {
          console.error('❌ Error in notification update listener:', error);
        }
      });
    this.wsSubscriptions.push(updateSub);

    // Listen for notification deletions
    const deleteSub = this.websocketService.on<{ id: string }>('notification:deleted')
      .subscribe({
        next: (data) => {
          console.log('🗑️ Notification deleted via WebSocket:', data.id);
          
          const currentNotifications = this.notificationsSubject.value;
          this.notificationsSubject.next(currentNotifications.filter(n => n.id !== data.id));
        },
        error: (error) => {
          console.error('❌ Error in notification delete listener:', error);
        }
      });
    this.wsSubscriptions.push(deleteSub);
  }

  /**
   * Cleanup WebSocket listeners
   */
  private cleanupWebSocketListeners(): void {
    this.wsSubscriptions.forEach(sub => sub.unsubscribe());
    this.wsSubscriptions = [];
  }

  /**
   * Start fallback polling (less frequent since we have WebSocket)
   */
  private startFallbackPolling(): void {
    // Poll every 60 seconds as fallback
    this.pollingSubscription = interval(this.pollingInterval).pipe(
      switchMap(() => this.getNotifications({ limit: 10, isArchived: false }))
    ).subscribe();
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/notification.png',
        badge: '/qb-logo-2.png',
        tag: notification.id,
      });
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Cleanup subscriptions
   */
  private cleanup(): void {
    // Unsubscribe from WebSocket events
    this.cleanupWebSocketListeners();

    // Stop polling
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }

    // Clear state
    this.unreadCountSubject.next(0);
    this.notificationsSubject.next([]);
  }

  /**
   * Get formatted time ago
   */
  getTimeAgo(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'bg-red-500';
      case NotificationPriority.HIGH:
        return 'bg-orange-500';
      case NotificationPriority.NORMAL:
        return 'bg-sky-500';
      case NotificationPriority.LOW:
        return 'bg-gray-500';
      default:
        return 'bg-sky-500';
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.APPOINTMENT:
        return 'event';
      case NotificationType.CONSULTATION:
        return 'video_call';
      case NotificationType.PRESCRIPTION:
        return 'medication';
      case NotificationType.LAB_RESULT:
        return 'science';
      case NotificationType.MESSAGE:
        return 'message';
      case NotificationType.SYSTEM:
        return 'settings';
      case NotificationType.GENERAL:
      default:
        return 'notifications';
    }
  }
}

