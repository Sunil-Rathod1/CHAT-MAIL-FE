import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private permission: NotificationPermission = 'default';
  private enabled = true;

  constructor() {
    this.requestPermission();
  }

  async requestPermission(): Promise<void> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
    }
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.enabled || this.permission !== 'granted') {
      return;
    }

    // Don't show notification if page is focused
    if (document.hasFocus()) {
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'chatmail-message',
      ...options
    };

    const notification = new Notification(title, defaultOptions);

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  showMessageNotification(senderName: string, message: string, avatar?: string): void {
    this.showNotification(`${senderName}`, {
      body: message,
      icon: avatar || '/favicon.svg'
    });
  }

  toggleNotifications(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled && this.permission === 'granted';
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}
