import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div 
        *ngFor="let notification of notifications$ | async" 
        class="notification"
        [class.success]="notification.type === 'success'"
        [class.error]="notification.type === 'error'"
        [class.warning]="notification.type === 'warning'"
        [class.info]="notification.type === 'info'">
        
        <div class="notification-content">
          <h4 *ngIf="notification.title" class="notification-title">
            {{ notification.title }}
          </h4>
          <p class="notification-message">{{ notification.message }}</p>
        </div>
        
        <button 
          class="notification-close" 
          (click)="removeNotification(notification.id)"
          aria-label="Close notification">
          ×
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      max-width: 400px;
    }
    
    .notification {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      background: white;
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
    }
    
    .notification.success {
      border-left-color: #4caf50;
      background-color: #f1f8e9;
    }
    
    .notification.error {
      border-left-color: #f44336;
      background-color: #ffebee;
    }
    
    .notification.warning {
      border-left-color: #ff9800;
      background-color: #fff3e0;
    }
    
    .notification.info {
      border-left-color: #2196f3;
      background-color: #e3f2fd;
    }
    
    .notification-content {
      flex: 1;
    }
    
    .notification-title {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    
    .notification-message {
      margin: 0;
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }
    
    .notification-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #999;
      cursor: pointer;
      padding: 0;
      margin-left: 12px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .notification-close:hover {
      color: #666;
    }
    
    @keyframes slideIn {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class NotificationsComponent {
  notifications$: Observable<Notification[]>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }
}