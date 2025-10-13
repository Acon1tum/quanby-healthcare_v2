import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification, NotificationType, NotificationPriority } from '../../services/notification.service';
import { AuthService } from '../../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  isLoading = false;
  unreadCount = 0;
  currentFilter: 'all' | 'unread' | 'read' = 'all';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  hasMore = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    
    // Subscribe to real-time notification updates
    const notificationsSub = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
        this.applyFilter();
      }
    );
    this.subscriptions.push(notificationsSub);

    // Subscribe to unread count
    const unreadCountSub = this.notificationService.unreadCount$.subscribe(
      count => {
        this.unreadCount = count;
      }
    );
    this.subscriptions.push(unreadCountSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load notifications from backend
   */
  loadNotifications(): void {
    this.isLoading = true;
    const offset = (this.currentPage - 1) * this.itemsPerPage;
    
    this.notificationService.getNotifications({
      limit: this.itemsPerPage,
      offset: offset,
      isArchived: false
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications = response.data.notifications;
          this.totalItems = response.data.pagination.total;
          this.hasMore = response.data.pagination.hasMore;
          this.unreadCount = response.data.unreadCount;
          this.applyFilter();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Apply filter to notifications
   */
  applyFilter(): void {
    switch (this.currentFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.isRead);
        break;
      case 'read':
        this.filteredNotifications = this.notifications.filter(n => n.isRead);
        break;
      default:
        this.filteredNotifications = [...this.notifications];
    }
  }

  /**
   * Set filter
   */
  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.currentFilter = filter;
    this.currentPage = 1;
    this.applyFilter();
  }

  /**
   * Mark notification as read and navigate to action URL
   */
  markAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          if (notification.actionUrl) {
            this.router.navigateByUrl(notification.actionUrl);
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
    } else {
      if (notification.actionUrl) {
        this.router.navigateByUrl(notification.actionUrl);
      }
    }
  }

  /**
   * Mark notification as unread
   */
  markAsUnread(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsUnread(notification.id).subscribe({
      error: (error) => {
        console.error('Error marking notification as unread:', error);
      }
    });
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        console.log('All notifications marked as read');
      },
      error: (error) => {
        console.error('Error marking all as read:', error);
      }
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.deleteNotification(notificationId).subscribe({
        next: () => {
          console.log('Notification deleted');
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
        }
      });
    }
  }

  /**
   * Archive notification
   */
  archiveNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.archiveNotification(notificationId).subscribe({
      next: () => {
        console.log('Notification archived');
        this.loadNotifications();
      },
      error: (error) => {
        console.error('Error archiving notification:', error);
      }
    });
  }

  /**
   * Get notification type icon
   */
  getTypeIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      GENERAL: '📋',
      APPOINTMENT: '📅',
      CONSULTATION: '🩺',
      PRESCRIPTION: '💊',
      LAB_RESULT: '🧪',
      MESSAGE: '💬',
      SYSTEM: '⚙️'
    };
    return icons[type] || '📋';
  }

  /**
   * Get priority badge class
   */
  getPriorityClass(priority: NotificationPriority): string {
    const classes: Record<NotificationPriority, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      NORMAL: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700'
    };
    return classes[priority] || classes.NORMAL;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(date: string): string {
    return this.notificationService.getTimeAgo(date);
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    if (this.hasMore) {
      this.currentPage++;
      this.loadNotifications();
    }
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNotifications();
    }
  }

  /**
   * Get total pages
   */
  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }
}
