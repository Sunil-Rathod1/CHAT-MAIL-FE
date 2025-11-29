import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { Message } from '../models/message.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private authService = inject(AuthService);
  private socket: Socket | null = null;
  
  isConnected = signal<boolean>(false);
  messages = signal<Message[]>([]);
  onlineUsers = signal<string[]>([]);

  connect(): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(environment.socketUrl, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      this.isConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      this.isConnected.set(false);
    });

    this.socket.on('message:receive', (message: Message) => {
      this.messages.update(msgs => [...msgs, message]);
    });

    this.socket.on('message:sent', (message: Message) => {
      this.messages.update(msgs => [...msgs, message]);
    });

    this.socket.on('user:online', (data: { userId: string }) => {
      this.onlineUsers.update(users => [...users, data.userId]);
    });

    this.socket.on('user:offline', (data: { userId: string }) => {
      this.onlineUsers.update(users => users.filter(id => id !== data.userId));
    });

    this.socket.on('typing:user', (data: { userId: string; isTyping: boolean }) => {
      // Handle typing indicator
      console.log('Typing:', data);
    });

    this.socket.on('message:status', (data: { messageId: string; status: string }) => {
      this.messages.update(msgs => 
        msgs.map(msg => 
          msg._id === data.messageId ? { ...msg, status: data.status as any } : msg
        )
      );
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.set(false);
    }
  }

  sendMessage(receiverId: string, content: string, type: string = 'text'): void {
    if (this.socket) {
      this.socket.emit('message:send', { receiverId, content, type });
    }
  }

  startTyping(receiverId: string): void {
    if (this.socket) {
      this.socket.emit('typing:start', { receiverId });
    }
  }

  stopTyping(receiverId: string): void {
    if (this.socket) {
      this.socket.emit('typing:stop', { receiverId });
    }
  }

  markAsRead(messageId: string, senderId: string): void {
    if (this.socket) {
      this.socket.emit('message:read', { messageId, senderId });
    }
  }
}
