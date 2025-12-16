import { Injectable, signal } from '@angular/core';

export interface NotificationSettings {
  enabled: boolean;
  messages: boolean;
  calls: boolean;
  groups: boolean;
  sound: boolean;
  desktop: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private permission: NotificationPermission = 'default';
  
  // Settings signal
  settings = signal<NotificationSettings>({
    enabled: true,
    messages: true,
    calls: true,
    groups: true,
    sound: true,
    desktop: true
  });

  // UI state
  showSettingsPanel = signal<boolean>(false);

  constructor() {
    this.checkPermission();
    this.loadSettings();
  }

  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('chatmail_notification_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings.set({ ...this.settings(), ...parsed });
      } catch (e) {
        console.error('Failed to load notification settings:', e);
      }
    }
  }

  saveSettings(newSettings: Partial<NotificationSettings>): void {
    const current = this.settings();
    const updated = { ...current, ...newSettings };
    this.settings.set(updated);
    localStorage.setItem('chatmail_notification_settings', JSON.stringify(updated));
  }

  toggleSetting(key: keyof NotificationSettings): void {
    const current = this.settings();
    this.saveSettings({ [key]: !current[key] });
  }

  toggleSettingsPanel(): void {
    this.showSettingsPanel.update(v => !v);
  }

  async requestPermission(): Promise<boolean> {
    if ('Notification' in window && this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }
    return this.permission === 'granted';
  }

  showNotification(title: string, options?: NotificationOptions): void {
    const currentSettings = this.settings();
    
    if (!currentSettings.enabled || !currentSettings.desktop || this.permission !== 'granted') {
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
      silent: !currentSettings.sound,
      ...options
    };

    const notification = new Notification(title, defaultOptions);

    // Play sound if enabled
    if (currentSettings.sound) {
      this.playNotificationSound();
    }

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  showMessageNotification(senderName: string, message: string, avatar?: string): void {
    const currentSettings = this.settings();
    if (!currentSettings.messages) return;

    this.showNotification(`${senderName}`, {
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: avatar || '/favicon.svg',
      tag: `message-${Date.now()}`
    });
  }

  showCallNotification(callerName: string, callType: 'audio' | 'video', avatar?: string): void {
    const currentSettings = this.settings();
    if (!currentSettings.calls) return;

    const typeText = callType === 'video' ? 'Video' : 'Audio';
    this.showNotification(`Incoming ${typeText} Call`, {
      body: `${callerName} is calling...`,
      icon: avatar || '/favicon.svg',
      tag: 'incoming-call',
      requireInteraction: true
    });
  }

  showGroupNotification(groupName: string, senderName: string, message: string): void {
    const currentSettings = this.settings();
    if (!currentSettings.groups) return;

    this.showNotification(groupName, {
      body: `${senderName}: ${message.length > 80 ? message.substring(0, 80) + '...' : message}`,
      icon: '/favicon.svg',
      tag: `group-${Date.now()}`
    });
  }

  private playNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio context not available
    }
  }

  isEnabled(): boolean {
    return this.settings().enabled && this.permission === 'granted';
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }
}
