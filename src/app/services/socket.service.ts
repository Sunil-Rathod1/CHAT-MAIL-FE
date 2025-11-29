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
  typingUsers = signal<Map<string, boolean>>(new Map());
  reactionUpdates = signal<{ messageId: string; reactions: any[] } | null>(null);

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

    // Receive full list of online users on connect
    this.socket.on('users:online', (data: { userIds: string[] }) => {
      console.log('📋 Online users:', data.userIds);
      this.onlineUsers.set(data.userIds);
    });

    this.socket.on('user:online', (data: { userId: string }) => {
      console.log('🟢 User online:', data.userId);
      this.onlineUsers.update(users => {
        if (!users.includes(data.userId)) {
          return [...users, data.userId];
        }
        return users;
      });
    });

    this.socket.on('user:offline', (data: { userId: string }) => {
      console.log('⚫ User offline:', data.userId);
      this.onlineUsers.update(users => users.filter(id => id !== data.userId));
    });

    this.socket.on('typing:user', (data: { userId: string; isTyping: boolean }) => {
      this.typingUsers.update(map => {
        const newMap = new Map(map);
        if (data.isTyping) {
          newMap.set(data.userId, true);
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    });

    this.socket.on('message:status', (data: { messageId: string; status: string }) => {
      console.log('📬 Message status update:', data);
      this.messages.update(msgs => 
        msgs.map(msg => 
          msg._id === data.messageId ? { ...msg, status: data.status as any } : msg
        )
      );
    });

    // Handle bulk messages read
    this.socket.on('messages:read', (data: { receiverId: string; count: number }) => {
      console.log('📬 Messages read:', data);
      // Messages will be updated via the message:status events or on reload
    });

    // Handle message reactions
    this.socket.on('message:reaction', (data: { messageId: string; reactions: any[]; updatedBy: string }) => {
      console.log('😊 Reaction update:', data);
      // Update message reactions in local state
      this.messages.update(msgs =>
        msgs.map(msg =>
          msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        )
      );
      // Trigger reaction update signal for chat component to sync
      this.reactionUpdates.set({ messageId: data.messageId, reactions: data.reactions });
    });

    this.socket.on('reaction:error', (data: { message: string }) => {
      console.error('❌ Reaction error:', data.message);
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

  markAllAsRead(senderId: string): void {
    if (this.socket) {
      this.socket.emit('messages:read', { senderId });
    }
  }

  reactToMessage(messageId: string, emoji: string): void {
    if (this.socket) {
      this.socket.emit('message:react', { messageId, emoji });
    }
  }
}
