import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { UserService } from '../../services/user.service';
import { AudioService } from '../../services/audio.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <!-- Sidebar -->
      <div class="sidebar" [class.mobile-hidden]="mobileShowChat()">
        <!-- Header -->
        <div class="sidebar-header">
          <div class="user-info">
            <img [src]="currentUser()?.avatar" [alt]="currentUser()?.name" class="avatar">
            <div>
              <h3>{{ currentUser()?.name }}</h3>
              <span class="status-badge" [class.online]="socketService.isConnected()">
                {{ socketService.isConnected() ? 'Online' : 'Offline' }}
              </span>
            </div>
          </div>
          <button class="btn-icon" (click)="logout()" title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="search-box">
          <input 
            type="text" 
            placeholder="Search users by email..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            class="search-input"
          />
        </div>

        <!-- Contacts List -->
        <div class="contacts-list">
          @if (searchResults().length > 0 && searchQuery) {
            <div class="section-title">Search Results</div>
            @for (user of searchResults(); track user.id) {
              <div class="contact-item" (click)="selectChat(user)">
                <img [src]="user.avatar" [alt]="user.name" class="avatar">
                <div class="contact-info">
                  <h4>{{ user.name }}</h4>
                  <p>{{ user.email }}</p>
                </div>
              </div>
            }
          } @else if (conversations().length > 0) {
            <div class="section-title">Conversations</div>
            @for (conv of conversations(); track conv._id) {
              <div 
                class="contact-item" 
                [class.active]="isActiveConversation(conv)"
                (click)="selectConversation(conv)"
              >
                <img [src]="getContactAvatar(conv)" [alt]="getContactName(conv)" class="avatar">
                <div class="contact-info">
                  <h4>{{ getContactName(conv) }}</h4>
                  <p class="last-message">{{ conv.lastMessage.content }}</p>
                </div>
                <div class="contact-meta">
                  <span class="time">{{ formatTime(conv.lastMessage.createdAt) }}</span>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>No conversations yet</p>
              <small>Search for users to start chatting</small>
            </div>
          }
        </div>
      </div>

      <!-- Chat Area -->
      <div class="chat-area" [class.mobile-hidden]="!mobileShowChat()">
        @if (selectedUser()) {
          <!-- Chat Header -->
          <div class="chat-header">
            <button class="btn-icon mobile-only" (click)="backToContacts()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="chat-user-info">
              <div class="avatar-wrapper">
                <img [src]="selectedUser()!.avatar" [alt]="selectedUser()!.name" class="avatar">
                @if (isUserOnline(selectedUser())) {
                  <span class="online-indicator"></span>
                }
              </div>
              <div>
                <h3>{{ selectedUser()!.name }}</h3>
                @if (isUserTyping(selectedUser())) {
                  <span class="user-status typing">typing...</span>
                } @else {
                  <span class="user-status" [class.online]="isUserOnline(selectedUser())">
                    {{ isUserOnline(selectedUser()) ? 'online' : 'offline' }}
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- Messages Area -->
          <div class="messages-area" #messagesContainer>
            @for (message of chatMessages(); track message._id) {
              <div class="message" [class.sent]="message.sender.id === currentUser()?.id || message.sender._id === currentUser()?.id">
                <div class="message-content">
                  <p>{{ message.content }}</p>
                  <div class="message-meta">
                    <span class="time">{{ formatTime(message.createdAt) }}</span>
                    @if (message.sender.id === currentUser()?.id || message.sender._id === currentUser()?.id) {
                      <span class="status">
                        @if (message.status === 'sent') { ✓ }
                        @if (message.status === 'delivered') { ✓✓ }
                        @if (message.status === 'read') { <span class="read-tick">✓✓</span> }
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Input Area -->
          <div class="input-area">
            <input 
              type="text" 
              [(ngModel)]="messageInput"
              (input)="onTyping()"
              (keyup.enter)="sendMessage()"
              placeholder="Type a message..."
              class="message-input"
            />
            <button class="btn-send" (click)="sendMessage()" [disabled]="!messageInput.trim()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        } @else {
          <div class="empty-chat">
            <h2>Welcome to ChatMail</h2>
            <p>Select a conversation or search for users to start chatting</p>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  socketService = inject(SocketService);
  private userService = inject(UserService);
  private audioService = inject(AudioService);
  private notificationService = inject(NotificationService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  private shouldScrollToBottom = true;
  private typingTimeout: any;

  currentUser = this.authService.currentUser;
  searchQuery = '';
  messageInput = '';
  
  selectedUser = signal<User | null>(null);
  searchResults = signal<User[]>([]);
  conversations = signal<any[]>([]);
  chatMessages = signal<Message[]>([]);
  mobileShowChat = signal(false);
  typingUsers = signal<Set<string>>(new Set());
  onlineUserIds = signal<Set<string>>(new Set());

  constructor() {
    // Listen to socket messages
    effect(() => {
      const messages = this.socketService.messages();
      const selected = this.selectedUser();
      
      if (selected && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const selectedId = (selected as any)._id || selected.id;
        const senderId = (lastMsg.sender as any)?._id || (lastMsg.sender as any)?.id || lastMsg.sender;
        const receiverId = (lastMsg.receiver as any)?._id || (lastMsg.receiver as any)?.id || lastMsg.receiver;
        const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
        
        if (senderId === selectedId || receiverId === selectedId) {
          this.chatMessages.update(msgs => [...msgs, lastMsg]);
          this.shouldScrollToBottom = true;
          
          // Play sound and show notification for received messages
          if (senderId === selectedId && receiverId === currentUserId) {
            this.audioService.playReceive();
            
            // Show notification if not focused on chat
            const senderName = (lastMsg.sender as any)?.name || (lastMsg.sender as any)?.email;
            const senderAvatar = (lastMsg.sender as any)?.avatar;
            this.notificationService.showMessageNotification(senderName, lastMsg.content, senderAvatar);
          }
        }
      }
    });

    // Listen to online/offline status
    effect(() => {
      const onlineUsers = this.socketService.onlineUsers();
      this.onlineUserIds.set(new Set(onlineUsers));
    });

    // Listen to typing indicators
    effect(() => {
      const typingMap = this.socketService.typingUsers();
      const typingSet = new Set<string>();
      typingMap.forEach((isTyping, userId) => {
        if (isTyping) typingSet.add(userId);
      });
      this.typingUsers.set(typingSet);
    });

    // Listen to message status updates from socket
    effect(() => {
      const socketMessages = this.socketService.messages();
      
      // Update status of existing messages
      if (socketMessages.length > 0) {
        socketMessages.forEach(socketMsg => {
          this.chatMessages.update(msgs =>
            msgs.map(msg =>
              msg._id === socketMsg._id ? { ...msg, status: socketMsg.status } : msg
            )
          );
        });
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
        this.shouldScrollToBottom = false;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  ngOnInit(): void {
    this.socketService.connect();
    this.loadConversations();
    // Request notification permission
    this.notificationService.requestPermission();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (response) => {
        console.log('Conversations response:', response);
        if (response.success) {
          console.log('Conversations data:', response.data);
          this.conversations.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
      }
    });
  }

  onSearch(): void {
    if (this.searchQuery.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.userService.searchUsers(this.searchQuery).subscribe({
      next: (response) => {
        if (response.success) {
          this.searchResults.set(response.data);
        }
      },
      error: (error) => console.error('Search error:', error)
    });
  }

  selectChat(user: User): void {
    this.selectedUser.set(user);
    this.mobileShowChat.set(true);
    this.searchQuery = '';
    this.searchResults.set([]);
    const userId = (user as any)._id || user.id;
    if (userId) {
      this.loadChatHistory(userId);
      this.shouldScrollToBottom = true;
      
      // Mark messages as read
      this.markMessagesAsRead(userId);
    }
  }

  selectChatById(userId: string): void {
    this.userService.getUserById(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectChat(response.data);
        }
      },
      error: (error) => console.error('Error loading user:', error)
    });
  }

  selectConversation(conv: any): void {
    const currentUser = this.currentUser();
    const currentUserId = (currentUser as any)?._id || currentUser?.id;
    const sender = conv.lastMessage.sender;
    const receiver = conv.lastMessage.receiver;
    const senderId = sender?._id || sender?.id;
    
    // Select the other user (not the current user)
    const otherUser = senderId === currentUserId ? receiver : sender;
    
    if (otherUser) {
      this.selectChat(otherUser);
    }
  }

  isActiveConversation(conv: any): boolean {
    const selected = this.selectedUser();
    if (!selected) return false;
    
    const selectedId = (selected as any)._id || selected.id;
    const currentUser = this.currentUser();
    const currentUserId = (currentUser as any)?._id || currentUser?.id;
    const sender = conv.lastMessage.sender;
    const receiver = conv.lastMessage.receiver;
    const senderId = sender?._id || sender?.id;
    
    const otherUserId = senderId === currentUserId 
      ? (receiver?._id || receiver?.id)
      : (sender?._id || sender?.id);
    
    return selectedId === otherUserId;
  }

  loadChatHistory(userId: string): void {
    if (!userId) {
      console.error('Cannot load chat history: userId is undefined');
      return;
    }
    
    this.chatService.getChatHistory(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.chatMessages.set(response.data.messages);
          this.shouldScrollToBottom = true;
        }
      },
      error: (error) => console.error('Error loading chat history:', error)
    });
  }

  markMessagesAsRead(senderId: string): void {
    // Mark via socket for real-time update
    this.socketService.markAllAsRead(senderId);
    
    // Also mark via HTTP API
    this.chatService.markAsRead(senderId).subscribe({
      next: () => {
        console.log('✓ Messages marked as read');
        // Update local messages to read status
        this.chatMessages.update(msgs =>
          msgs.map(msg => {
            const msgSenderId = (msg.sender as any)?._id || (msg.sender as any)?.id;
            if (msgSenderId === senderId && msg.status !== 'read') {
              return { ...msg, status: 'read' };
            }
            return msg;
          })
        );
      },
      error: (error) => console.error('Error marking messages as read:', error)
    });
  }

  sendMessage(): void {
    if (!this.messageInput.trim() || !this.selectedUser()) return;

    const content = this.messageInput.trim();
    const selected = this.selectedUser()!;
    const receiverId = (selected as any)._id || selected.id;
    
    if (!receiverId) {
      console.error('Cannot send message: receiver ID is undefined');
      return;
    }

    this.socketService.sendMessage(receiverId, content);
    this.audioService.playSend();
    this.messageInput = '';
    this.shouldScrollToBottom = true;
    
    // Stop typing indicator
    this.socketService.stopTyping(receiverId);
  }

  onTyping(): void {
    const selected = this.selectedUser();
    if (!selected) return;

    const receiverId = (selected as any)._id || selected.id;
    if (!receiverId) return;

    // Start typing
    this.socketService.startTyping(receiverId);

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.socketService.stopTyping(receiverId);
    }, 2000);
  }

  isUserOnline(user: User | null): boolean {
    if (!user) return false;
    const userId = (user as any)._id || user.id;
    return this.onlineUserIds().has(userId);
  }

  isUserTyping(user: User | null): boolean {
    if (!user) return false;
    const userId = (user as any)._id || user.id;
    return this.typingUsers().has(userId);
  }

  backToContacts(): void {
    this.mobileShowChat.set(false);
    this.selectedUser.set(null);
  }

  logout(): void {
    this.authService.logout();
  }

  getContactName(conv: any): string {
    const currentUser = this.currentUser();
    const currentUserId = (currentUser as any)?._id || currentUser?.id;
    const sender = conv.lastMessage.sender;
    const receiver = conv.lastMessage.receiver;
    const senderId = sender?._id || sender?.id;
    
    return senderId === currentUserId
      ? receiver?.name || receiver?.email
      : sender?.name || sender?.email;
  }

  getContactAvatar(conv: any): string {
    const currentUser = this.currentUser();
    const currentUserId = (currentUser as any)?._id || currentUser?.id;
    const sender = conv.lastMessage.sender;
    const receiver = conv.lastMessage.receiver;
    const senderId = sender?._id || sender?.id;
    
    return senderId === currentUserId
      ? receiver?.avatar
      : sender?.avatar;
  }

  formatTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
