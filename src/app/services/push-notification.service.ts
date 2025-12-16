import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface NotificationPreferences {
  messages: boolean;
  calls: boolean;
  groupMessages: boolean;
  sound: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Signals
  isSupported = signal<boolean>(false);
  isPermissionGranted = signal<boolean>(false);
  isSubscribed = signal<boolean>(false);
  preferences = signal<NotificationPreferences>({
    messages: true,
    calls: true,
    groupMessages: true,
    sound: true
  });

  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.checkSupport();
    this.loadPreferences();
  }

  // Check if push notifications are supported
  private checkSupport(): void {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    this.isSupported.set(supported);
    
    if (supported) {
      this.isPermissionGranted.set(Notification.permission === 'granted');
    }
  }

  // Load preferences from localStorage
  private loadPreferences(): void {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        this.preferences.set(prefs);
      } catch (e) {
        console.error('Failed to load notification preferences:', e);
      }
    }
  }

  // Save preferences to localStorage
  savePreferences(prefs: NotificationPreferences): void {
    this.preferences.set(prefs);
    localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.isPermissionGranted.set(granted);
      
      if (granted) {
        await this.setupServiceWorker();
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  // Set up service worker for push notifications
  private async setupServiceWorker(): Promise<void> {
    try {
      // Check if service worker is already registered
      this.swRegistration = await navigator.serviceWorker.ready;
      console.log('📬 Service worker ready for push notifications');
    } catch (error) {
      console.error('Failed to setup service worker:', error);
    }
  }

  // Show a local notification (for when app is in foreground)
  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.isPermissionGranted()) {
      console.warn('Notification permission not granted');
      return;
    }

    // Check preferences
    const prefs = this.preferences();
    
    // Play sound if enabled
    if (prefs.sound) {
      this.playNotificationSound();
    }

    // Use service worker notification if available (supports more options)
    if (this.swRegistration) {
      const swOptions: any = {
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'chatmail-notification',
        requireInteraction: false,
        ...options
      };
      this.swRegistration.showNotification(title, swOptions);
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/assets/icons/icon-192x192.png',
        ...options
      });
    }
  }

  // Show message notification
  showMessageNotification(senderName: string, message: string, senderId: string, avatar?: string): void {
    const prefs = this.preferences();
    if (!prefs.messages) return;

    const notificationOptions: any = {
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: avatar || '/assets/icons/icon-192x192.png',
      tag: `message-${senderId}`,
      data: { type: 'message', senderId }
    };

    // Add actions for service worker notifications
    if (this.swRegistration) {
      notificationOptions.actions = [
        { action: 'reply', title: 'Reply' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    }

    this.showNotification(`New message from ${senderName}`, notificationOptions);
  }

  // Show call notification
  showCallNotification(callerName: string, callType: 'audio' | 'video', callId: string, avatar?: string): void {
    const prefs = this.preferences();
    if (!prefs.calls) return;

    const callTypeText = callType === 'video' ? 'Video' : 'Audio';
    
    const notificationOptions: any = {
      body: `${callerName} is calling you...`,
      icon: avatar || '/assets/icons/icon-192x192.png',
      tag: `call-${callId}`,
      requireInteraction: true,
      data: { type: 'call', callId, callerName }
    };

    // Add actions for service worker notifications
    if (this.swRegistration) {
      notificationOptions.actions = [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' }
      ];
    }

    this.showNotification(`Incoming ${callTypeText} Call`, notificationOptions);
  }

  // Show group message notification
  showGroupMessageNotification(groupName: string, senderName: string, message: string, groupId: string): void {
    const prefs = this.preferences();
    if (!prefs.groupMessages) return;

    this.showNotification(`${groupName}`, {
      body: `${senderName}: ${message.length > 80 ? message.substring(0, 80) + '...' : message}`,
      icon: '/assets/icons/icon-192x192.png',
      tag: `group-${groupId}`,
      data: { type: 'group', groupId }
    });
  }

  // Play notification sound
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Audio play failed, likely due to autoplay restrictions
      });
    } catch (e) {
      console.error('Failed to play notification sound:', e);
    }
  }

  // Check if the app should show a notification (i.e., it's in background)
  shouldShowNotification(): boolean {
    return document.hidden || !document.hasFocus();
  }

  // Request permission and set up (called on user interaction)
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    if (this.isPermissionGranted()) {
      await this.setupServiceWorker();
      return true;
    }

    return await this.requestPermission();
  }

  // Toggle specific preference
  togglePreference(key: keyof NotificationPreferences): void {
    const current = this.preferences();
    const updated = { ...current, [key]: !current[key] };
    this.savePreferences(updated);
  }
}
