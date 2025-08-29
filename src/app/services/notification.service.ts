import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  showSuccess(message: string, title?: string, duration: number = 4000): void {
    this.addNotification(message, 'success', title, duration);
  }

  showError(message: string, title?: string, duration: number = 7000): void {
    this.addNotification(message, 'error', title, duration);
  }

  showWarning(message: string, title?: string, duration: number = 5000): void {
    this.addNotification(message, 'warning', title, duration);
  }

  showInfo(message: string, title?: string, duration: number = 4000): void {
    this.addNotification(message, 'info', title, duration);
  }

  private addNotification(message: string, type: Notification['type'], title?: string, duration: number = 5000): void {
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      title,
      duration
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    // Auto-remove notification after duration
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(updatedNotifications);
  }

  dismiss(): void {
    this.notificationsSubject.next([]);
  }
}