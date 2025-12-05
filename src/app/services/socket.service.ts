import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { Message, EditMessageData, DeleteMessageData } from '../models/message.model';
import { Group } from '../models/group.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private authService = inject(AuthService);
  private socket: Socket | null = null;

  isConnected = signal<boolean>(false);
  messages = signal<Message[]>([]);
  newMessage = signal<Message | null>(null);  // Signal for real-time new messages
  onlineUsers = signal<string[]>([]);
  typingUsers = signal<Map<string, boolean>>(new Map());
  reactionUpdates = signal<{ messageId: string; reactions: any[] } | null>(null);

  // Phase 2 signals
  messageEdited = signal<{ messageId: string; content: string; isEdited: boolean; editedAt: Date } | null>(null);
  messageDeleted = signal<{ messageId: string; deleteType: 'me' | 'everyone' } | null>(null);
  groupMessages = signal<Message[]>([]);
  groupTypingUsers = signal<Map<string, Set<string>>>(new Map()); // groupId -> Set of userIds
  groupMemberUpdates = signal<{ groupId: string; action: string; data: any } | null>(null);

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
      console.log('📨 Message received:', message._id);
      this.newMessage.set(null); // Reset first
      setTimeout(() => this.newMessage.set(message), 0); // Trigger effect
    });

    this.socket.on('message:sent', (message: Message) => {
      console.log('✅ Message sent:', message._id);
      this.newMessage.set(null); // Reset first
      setTimeout(() => this.newMessage.set(message), 0); // Trigger effect
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
      this.reactionUpdates.set(null);
      setTimeout(() => this.reactionUpdates.set({ messageId: data.messageId, reactions: data.reactions }), 0);
    });

    this.socket.on('reaction:error', (data: { message: string }) => {
      console.error('❌ Reaction error:', data.message);
    });

    // ============= PHASE 2: EDIT/DELETE HANDLERS =============

    this.socket.on('message:edited', (data: { messageId: string; content: string; isEdited: boolean; editedAt: Date }) => {
      console.log('✏️ Message edited:', data);
      this.messages.update(msgs =>
        msgs.map(msg =>
          msg._id === data.messageId
            ? { ...msg, content: data.content, isEdited: true, editedAt: data.editedAt }
            : msg
        )
      );
      this.messageEdited.set(null);
      setTimeout(() => this.messageEdited.set(data), 0);
    });

    this.socket.on('message:deleted', (data: { messageId: string; deleteType: 'me' | 'everyone' }) => {
      console.log('🗑️ Message deleted:', data);
      if (data.deleteType === 'everyone') {
        this.messages.update(msgs =>
          msgs.map(msg =>
            msg._id === data.messageId
              ? { ...msg, deletedForEveryone: true, deletedAt: new Date() }
              : msg
          )
        );
      }
      this.messageDeleted.set(null);
      setTimeout(() => this.messageDeleted.set(data), 0);
    });

    // ============= PHASE 2: GROUP CHAT HANDLERS =============

    this.socket.on('group:message:receive', (message: Message) => {
      console.log('📨 Group message received:', message);
      this.groupMessages.update(msgs => [...msgs, message]);
    });

    this.socket.on('group:message:sent', (message: Message) => {
      console.log('✅ Group message sent:', message);
      this.groupMessages.update(msgs => [...msgs, message]);
    });

    this.socket.on('group:member-joined', (data: { groupId: string; userId: string; timestamp: number }) => {
      console.log('👋 Member joined group:', data);
      this.groupMemberUpdates.set({ groupId: data.groupId, action: 'joined', data });
    });

    this.socket.on('group:member-left', (data: { groupId: string; userId: string; timestamp: number }) => {
      console.log('👋 Member left group:', data);
      this.groupMemberUpdates.set({ groupId: data.groupId, action: 'left', data });
    });

    this.socket.on('group:members-added', (data: { groupId: string; memberIds: string[]; addedBy: string; timestamp: number }) => {
      console.log('➕ Members added to group:', data);
      this.groupMemberUpdates.set({ groupId: data.groupId, action: 'members-added', data });
    });

    this.socket.on('group:added-to-group', (data: { group: Group }) => {
      console.log('🎉 Added to new group:', data);
      this.groupMemberUpdates.set({ groupId: data.group._id, action: 'added-to-group', data });
    });

    this.socket.on('group:member-removed', (data: { groupId: string; memberId: string; removedBy: string; timestamp: number }) => {
      console.log('➖ Member removed from group:', data);
      this.groupMemberUpdates.set({ groupId: data.groupId, action: 'member-removed', data });
    });

    this.socket.on('group:removed-from-group', (data: { groupId: string; removedBy: string }) => {
      console.log('🚫 Removed from group:', data);
      this.groupMemberUpdates.set({ groupId: data.groupId, action: 'removed-from-group', data });
    });

    this.socket.on('group:updated', (data: { groupId: string; updates: any; updatedBy: string; timestamp: number }) => {
      console.log('🔄 Group updated:', data);
      this.groupMemberUpdates.set({ groupId: data.groupId, action: 'updated', data });
    });

    this.socket.on('group:message:read-receipt', (data: { messageId: string; userId: string; readAt: number }) => {
      console.log('👁️ Group message read:', data);
      this.groupMessages.update(msgs =>
        msgs.map(msg => {
          if (msg._id === data.messageId) {
            const readBy = msg.readBy || [];
            if (!readBy.some(r => r.user === data.userId)) {
              return { ...msg, readBy: [...readBy, { user: data.userId, readAt: new Date(data.readAt) }] };
            }
          }
          return msg;
        })
      );
    });

    this.socket.on('group:typing:user', (data: { groupId: string; userId: string; isTyping: boolean }) => {
      this.groupTypingUsers.update(map => {
        const newMap = new Map(map);
        const typingSet = newMap.get(data.groupId) || new Set();

        if (data.isTyping) {
          typingSet.add(data.userId);
        } else {
          typingSet.delete(data.userId);
        }

        if (typingSet.size > 0) {
          newMap.set(data.groupId, typingSet);
        } else {
          newMap.delete(data.groupId);
        }

        return newMap;
      });
    });

    this.socket.on('message:error', (data: { message: string }) => {
      console.error('❌ Socket error:', data.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.set(false);
    }
  }

  getSocket(): any {
    return this.socket;
  }

  sendMessage(receiverId: string, content: string, type: string = 'text', replyTo?: any): void {
    if (this.socket) {
      this.socket.emit('message:send', { receiverId, content, type, replyTo });
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

  // ============= PHASE 2: EDIT/DELETE METHODS =============

  editMessage(data: EditMessageData): void {
    if (this.socket) {
      this.socket.emit('message:edit', data);
    }
  }

  deleteMessage(data: DeleteMessageData): void {
    if (this.socket) {
      this.socket.emit('message:delete', data);
    }
  }

  // ============= PHASE 2: GROUP CHAT METHODS =============

  sendGroupMessage(groupId: string, content: string, type: string = 'text', replyTo?: any): void {
    if (this.socket) {
      this.socket.emit('group:message:send', { groupId, content, type, replyTo });
    }
  }

  joinGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:join', { groupId });
    }
  }

  leaveGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:leave', { groupId });
    }
  }

  addGroupMembers(groupId: string, memberIds: string[]): void {
    if (this.socket) {
      this.socket.emit('group:member-add', { groupId, memberIds });
    }
  }

  removeGroupMember(groupId: string, memberId: string): void {
    if (this.socket) {
      this.socket.emit('group:member-remove', { groupId, memberId });
    }
  }

  updateGroup(groupId: string, updates: any): void {
    if (this.socket) {
      this.socket.emit('group:update', { groupId, updates });
    }
  }

  markGroupMessageAsRead(messageId: string, groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:message:read', { messageId, groupId });
    }
  }

  startGroupTyping(groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:typing:start', { groupId });
    }
  }

  stopGroupTyping(groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:typing:stop', { groupId });
    }
  }
}
