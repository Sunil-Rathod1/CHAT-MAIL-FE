import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { UserService } from '../../services/user.service';
import { AudioService } from '../../services/audio.service';
import { NotificationService } from '../../services/notification.service';
import { CallService } from '../../services/call.service';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { VideoCallComponent } from '../video-call/video-call.component';
import { User } from '../../models/user.model';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, EmojiPickerComponent, VideoCallComponent],
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
            
            <!-- Call Buttons -->
            <div class="call-buttons">
              <button class="btn-icon call-btn" (click)="startAudioCall()" title="Audio Call">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <button class="btn-icon call-btn" (click)="startVideoCall()" title="Video Call">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages Area -->
          <div class="messages-area" #messagesContainer>
            @for (message of chatMessages(); track message._id) {
              <div class="message" [class.sent]="message.sender.id === currentUser()?.id || message.sender._id === currentUser()?.id">
                <div class="message-bubble-wrapper">
                  @if (editingMessage()?._id === message._id) {
                    <!-- Edit Mode -->
                    <div class="message-edit-mode">
                      <input 
                        type="text" 
                        [(ngModel)]="editContent"
                        (keyup.enter)="saveEdit()"
                        (keyup.escape)="cancelEdit()"
                        class="edit-input"
                        autofocus
                      />
                      <div class="edit-actions">
                        <button class="btn-sm" (click)="saveEdit()">Save</button>
                        <button class="btn-sm btn-secondary" (click)="cancelEdit()">Cancel</button>
                      </div>
                    </div>
                  } @else {
                    <!-- Normal Message Display -->
                    <div class="message-content">
                      <!-- Reply Preview -->
                      @if (message.replyTo) {
                        <div class="reply-preview">
                          <div class="reply-bar"></div>
                          <div class="reply-content">
                            <div class="reply-sender">{{ message.replyTo.sender?.name || 'User' }}</div>
                            <div class="reply-text">{{ message.replyTo.content }}</div>
                          </div>
                        </div>
                      }
                      
                      <!-- Message Content -->
                      @if (message.deletedForEveryone) {
                        <p class="deleted-message"><em>🚫 This message was deleted</em></p>
                      } @else if (message.type === 'image') {
                        <div class="message-image">
                          <img [src]="message.content" alt="Image" />
                        </div>
                      } @else {
                        <p>{{ message.content }}</p>
                      }
                      
                      <div class="message-meta">
                        <span class="time">{{ formatTime(message.createdAt) }}</span>
                        @if (message.isEdited) {
                          <span class="edited-label">edited</span>
                        }
                        @if (message.sender.id === currentUser()?.id || message.sender._id === currentUser()?.id) {
                          <span class="status">
                            @if (message.status === 'sent') { ✓ }
                            @if (message.status === 'delivered') { ✓✓ }
                            @if (message.status === 'read') { <span class="read-tick">✓✓</span> }
                          </span>
                        }
                      </div>
                    </div>
                    
                    <!-- Reactions Display -->
                    @if (message.reactions && message.reactions.length > 0) {
                      <div class="message-reactions">
                        @for (reactionGroup of groupReactions(message.reactions); track reactionGroup.emoji) {
                          <button 
                            class="reaction-badge"
                            [class.my-reaction]="hasUserReacted(message.reactions, reactionGroup.emoji)"
                            (click)="reactToMessage(message._id!, reactionGroup.emoji)"
                            [title]="getReactionTooltip(reactionGroup)"
                          >
                            {{ reactionGroup.emoji }} {{ reactionGroup.count }}
                          </button>
                        }
                      </div>
                    }
                    
                    <!-- Message Actions - WhatsApp Style -->
                    @if (!message.deletedForEveryone) {
                      <div class="message-menu-container">
                        <button 
                          class="menu-trigger"
                          (click)="toggleMessageMenu(message._id!)"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                          </svg>
                        </button>
                        
                        @if (activeMessageMenu() === message._id) {
                          <div class="message-dropdown">
                            <button class="dropdown-item" (click)="startReply(message); closeMessageMenu()">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 17 4 12 9 7"/>
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                              </svg>
                              Reply
                            </button>
                            
                            <button class="dropdown-item" (click)="toggleEmojiPicker(message._id!); closeMessageMenu()">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                <line x1="9" y1="9" x2="9.01" y2="9"/>
                                <line x1="15" y1="9" x2="15.01" y2="9"/>
                              </svg>
                              React
                            </button>
                            
                            @if (canEditMessage(message)) {
                              <button class="dropdown-item" (click)="startEdit(message); closeMessageMenu()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button>
                            }
                            
                            @if (canDeleteMessage(message)) {
                              <button class="dropdown-item delete" (click)="confirmDelete(message); closeMessageMenu()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Delete
                              </button>
                            }
                          </div>
                        }
                      </div>
                      
                      <!-- Emoji Picker (positioned separately) -->
                      @if (showEmojiPicker() === message._id) {
                        <div class="emoji-picker-container">
                          <app-emoji-picker
                            [isOpen]="true"
                            (emojiSelected)="onEmojiSelect(message._id!, $event)"
                          />
                        </div>
                      }
                    }
                  }
                </div>
              </div>
            }
          </div>

          <!-- Input Area -->
          <div class="input-area">
            <!-- Reply Preview Bar -->
            @if (replyingTo()) {
              <div class="replying-to-bar">
                <div class="reply-info">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="9 17 4 12 9 7"/>
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                  </svg>
                  <div>
                    <div class="reply-label">Replying to {{ replyingTo()!.sender?.name || 'User' }}</div>
                    <div class="reply-preview-text">{{ replyingTo()!.content }}</div>
                  </div>
                </div>
                <button class="btn-close" (click)="cancelReply()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            }
            
            <!-- Image Preview -->
            @if (imagePreview()) {
              <div class="image-upload-preview">
                <img [src]="imagePreview()" alt="Preview" />
                <div class="preview-actions">
                  <button class="btn-sm" (click)="uploadImage()" [disabled]="uploadingImage()">
                    {{ uploadingImage() ? 'Uploading...' : 'Send Image' }}
                  </button>
                  <button class="btn-sm btn-secondary" (click)="cancelImageUpload()" [disabled]="uploadingImage()">
                    Cancel
                  </button>
                </div>
              </div>
            }
            
            <div class="input-controls">
              <input 
                type="file" 
                accept="image/*" 
                (change)="onFileSelected($event)"
                #fileInput
                style="display: none;"
              />
              <button class="btn-icon" (click)="fileInput.click()" title="Send image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              
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
          </div>
        } @else {
          <div class="empty-chat">
            <h2>Welcome to ChatMail</h2>
            <p>Select a conversation or search for users to start chatting</p>
          </div>
        }
      </div>
      
      <!-- Delete Confirmation Dialog -->
      @if (showDeleteDialog()) {
        <div class="modal-overlay" (click)="cancelDelete()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <h3>Delete Message</h3>
            <p>Choose how you want to delete this message:</p>
            <div class="modal-actions">
              <button class="btn-danger" (click)="deleteMessage('me')">Delete for Me</button>
              <button class="btn-danger" (click)="deleteMessage('everyone')">Delete for Everyone</button>
              <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
            </div>
          </div>
        </div>
      }
      
      <!-- Video Call Overlay -->
      @if (callService.callState().isInCall) {
        <app-video-call />
      }
      
      <!-- Call Error Toast -->
      @if (callService.callError()) {
        <div class="call-error-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{{ callService.callError() }}</span>
        </div>
      }
      
      <!-- Incoming Call Notification (shown when not in call) -->
      @if (callService.incomingCall() && !callService.callState().isInCall) {
        <div class="incoming-call-overlay">
          <div class="incoming-call-modal">
            <div class="caller-avatar">
              @if (callService.incomingCall()!.caller.avatar) {
                <img [src]="callService.incomingCall()!.caller.avatar" [alt]="callService.incomingCall()!.caller.name" />
              } @else {
                <div class="avatar-placeholder">{{ callService.incomingCall()!.caller.name.charAt(0) || '?' }}</div>
              }
            </div>
            <h3>{{ callService.incomingCall()!.caller.name }}</h3>
            <p>Incoming {{ callService.incomingCall()!.callType }} call...</p>
            <div class="call-actions">
              <button class="btn-accept" (click)="acceptIncomingCall()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Accept
              </button>
              <button class="btn-reject" (click)="rejectIncomingCall()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Decline
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  socketService = inject(SocketService);
  callService = inject(CallService);
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
  showEmojiPicker = signal<string | null>(null); // messageId or null
  activeMessageMenu = signal<string | null>(null); // messageId for dropdown menu

  // Phase 2 features
  replyingTo = signal<Message | null>(null);
  editingMessage = signal<Message | null>(null);
  editContent = '';
  showDeleteDialog = signal<Message | null>(null);
  uploadingImage = signal<boolean>(false);
  imagePreview = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  constructor() {
    // Listen to new real-time messages
    effect(() => {
      const newMsg = this.socketService.newMessage();
      const selected = this.selectedUser();

      if (newMsg && selected) {
        const selectedId = (selected as any)._id || selected.id;
        const senderId = (newMsg.sender as any)?._id || (newMsg.sender as any)?.id || newMsg.sender;
        const receiverId = (newMsg.receiver as any)?._id || (newMsg.receiver as any)?.id || newMsg.receiver;
        const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;

        // Check if message belongs to current conversation
        if (senderId === selectedId || receiverId === selectedId) {
          // Prevent adding duplicate messages
          this.chatMessages.update(msgs => {
            if (msgs.some(m => m._id === newMsg._id)) return msgs;
            return [...msgs, newMsg];
          });
          this.shouldScrollToBottom = true;

          // Play sound and show notification for received messages
          if (senderId === selectedId && receiverId === currentUserId) {
            this.audioService.playReceive();

            // Show notification if not focused on chat
            const senderName = (newMsg.sender as any)?.name || (newMsg.sender as any)?.email;
            const senderAvatar = (newMsg.sender as any)?.avatar;
            this.notificationService.showMessageNotification(senderName, newMsg.content, senderAvatar);
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

      // Update status and reactions of existing messages
      if (socketMessages.length > 0) {
        socketMessages.forEach(socketMsg => {
          this.chatMessages.update(msgs =>
            msgs.map(msg => {
              if (msg._id === socketMsg._id) {
                // Update both status and reactions
                return {
                  ...msg,
                  status: socketMsg.status,
                  reactions: socketMsg.reactions || msg.reactions
                };
              }
              return msg;
            })
          );
        });
      }
    });

    // Listen to reaction updates specifically (real-time sync)
    effect(() => {
      const reactionUpdate = this.socketService.reactionUpdates();

      if (reactionUpdate) {
        console.log('🔄 Syncing reaction to chatMessages:', reactionUpdate);
        this.chatMessages.update(msgs =>
          msgs.map(msg =>
            msg._id === reactionUpdate.messageId
              ? { ...msg, reactions: reactionUpdate.reactions }
              : msg
          )
        );
      }
    });

    // Phase 2: Listen to message edits
    effect(() => {
      const editUpdate = this.socketService.messageEdited();
      if (editUpdate) {
        console.log('✏️ Message edited:', editUpdate);
        this.chatMessages.update(msgs =>
          msgs.map(msg =>
            msg._id === editUpdate.messageId
              ? { ...msg, content: editUpdate.content, isEdited: true, editedAt: editUpdate.editedAt }
              : msg
          )
        );
      }
    });

    // Phase 2: Listen to message deletions
    effect(() => {
      const deleteUpdate = this.socketService.messageDeleted();
      if (deleteUpdate) {
        console.log('🗑️ Message deleted:', deleteUpdate);
        if (deleteUpdate.deleteType === 'everyone') {
          this.chatMessages.update(msgs =>
            msgs.map(msg =>
              msg._id === deleteUpdate.messageId
                ? { ...msg, deletedForEveryone: true, deletedAt: new Date(), content: 'This message was deleted' }
                : msg
            )
          );
        } else {
          // For 'me' deletions, filter out the message
          this.chatMessages.update(msgs =>
            msgs.filter(msg => msg._id !== deleteUpdate.messageId)
          );
        }
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
    // Ensure call service listeners are initialized
    setTimeout(() => {
      this.callService.ensureListenersInitialized();
    }, 500);
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

    // Build replyTo data if replying
    const replyTo = this.replyingTo() ? {
      messageId: this.replyingTo()!._id!,
      content: this.replyingTo()!.content,
      sender: this.replyingTo()!.sender
    } : undefined;

    this.socketService.sendMessage(receiverId, content, 'text', replyTo);
    this.audioService.playSend();
    this.messageInput = '';
    this.replyingTo.set(null);
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

  toggleMessageMenu(messageId: string): void {
    this.activeMessageMenu.set(this.activeMessageMenu() === messageId ? null : messageId);
    this.showEmojiPicker.set(null); // Close emoji picker when opening menu
  }

  closeMessageMenu(): void {
    this.activeMessageMenu.set(null);
  }

  toggleEmojiPicker(messageId: string): void {
    this.showEmojiPicker.set(this.showEmojiPicker() === messageId ? null : messageId);
  }

  onEmojiSelect(messageId: string, emoji: string): void {
    this.reactToMessage(messageId, emoji);
    this.showEmojiPicker.set(null);
  }

  reactToMessage(messageId: string, emoji: string): void {
    this.socketService.reactToMessage(messageId, emoji);
  }

  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.message-menu-container') && !target.closest('.emoji-picker-container')) {
      this.activeMessageMenu.set(null);
      this.showEmojiPicker.set(null);
    }
  }

  groupReactions(reactions: any[]): { emoji: string; count: number; users: any[] }[] {
    const grouped = new Map<string, { emoji: string; count: number; users: any[] }>();

    reactions.forEach(reaction => {
      const existing = grouped.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.userId);
      } else {
        grouped.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.userId]
        });
      }
    });

    return Array.from(grouped.values());
  }

  hasUserReacted(reactions: any[], emoji: string): boolean {
    const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
    return reactions.some(r => {
      const userId = r.userId?._id || r.userId?.id || r.userId;
      return userId === currentUserId && r.emoji === emoji;
    });
  }

  getReactionTooltip(reactionGroup: { emoji: string; count: number; users: any[] }): string {
    if (reactionGroup.count === 1) {
      const user = reactionGroup.users[0];
      const name = user?.name || user?.email || 'Someone';
      return name;
    }
    return `${reactionGroup.count} people`;
  }

  // ============= PHASE 2: REPLY FEATURE =============

  startReply(message: Message): void {
    this.replyingTo.set(message);
    this.editingMessage.set(null);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  // ============= PHASE 2: EDIT FEATURE =============

  startEdit(message: Message): void {
    // Can only edit own messages within 15 minutes
    const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
    const senderId = (message.sender as any)?._id || (message.sender as any)?.id || message.sender;

    if (senderId !== currentUserId) return;

    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    if (now - messageTime > fifteenMinutes) {
      alert('Messages can only be edited within 15 minutes');
      return;
    }

    this.editingMessage.set(message);
    this.editContent = message.content;
    this.replyingTo.set(null);
  }

  saveEdit(): void {
    const message = this.editingMessage();
    if (!message || !this.editContent.trim()) return;

    this.socketService.editMessage({
      messageId: message._id!,
      content: this.editContent.trim()
    });

    this.editingMessage.set(null);
    this.editContent = '';
  }

  cancelEdit(): void {
    this.editingMessage.set(null);
    this.editContent = '';
  }

  // ============= PHASE 2: DELETE FEATURE =============

  confirmDelete(message: Message): void {
    this.showDeleteDialog.set(message);
  }

  deleteMessage(deleteType: 'me' | 'everyone'): void {
    const message = this.showDeleteDialog();
    if (!message) return;

    // Check time limit for delete everyone (1 hour)
    if (deleteType === 'everyone') {
      const messageTime = new Date(message.createdAt).getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now - messageTime > oneHour) {
        alert('Messages can only be deleted for everyone within 1 hour');
        this.showDeleteDialog.set(null);
        return;
      }
    }

    this.socketService.deleteMessage({
      messageId: message._id!,
      deleteType
    });

    this.showDeleteDialog.set(null);
  }

  cancelDelete(): void {
    this.showDeleteDialog.set(null);
  }

  // ============= PHASE 2: IMAGE UPLOAD FEATURE =============

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    this.selectedFile.set(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  uploadImage(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploadingImage.set(true);

    this.chatService.uploadImage(file).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Send image message
          const selected = this.selectedUser();
          if (selected) {
            const receiverId = (selected as any)._id || selected.id;

            // Build replyTo data if replying
            const replyTo = this.replyingTo() ? {
              messageId: this.replyingTo()!._id!,
              content: this.replyingTo()!.content,
              sender: this.replyingTo()!.sender
            } : undefined;

            this.socketService.sendMessage(receiverId, response.data.url, 'image', replyTo);
            this.replyingTo.set(null);
          }

          this.cancelImageUpload();
        }
      },
      error: (error) => {
        console.error('Image upload failed:', error);
        alert('Failed to upload image');
        this.uploadingImage.set(false);
      },
      complete: () => {
        this.uploadingImage.set(false);
      }
    });
  }

  cancelImageUpload(): void {
    this.selectedFile.set(null);
    this.imagePreview.set(null);
    this.uploadingImage.set(false);
  }

  canEditMessage(message: Message): boolean {
    const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
    const senderId = (message.sender as any)?._id || (message.sender as any)?.id || message.sender;

    if (senderId !== currentUserId) return false;

    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    return (now - messageTime) <= fifteenMinutes;
  }

  canDeleteMessage(message: Message): boolean {
    const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
    const senderId = (message.sender as any)?._id || (message.sender as any)?.id || message.sender;

    return senderId === currentUserId;
  }

  // Video Call Methods
  startVideoCall(): void {
    const user = this.selectedUser();
    if (!user) return;
    
    const userId = (user as any)._id || user.id;
    const receiverInfo = {
      id: userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };
    
    this.callService.initiateCall(userId, receiverInfo, 'video');
  }

  startAudioCall(): void {
    const user = this.selectedUser();
    if (!user) return;
    
    const userId = (user as any)._id || user.id;
    const receiverInfo = {
      id: userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };
    
    this.callService.initiateCall(userId, receiverInfo, 'audio');
  }

  acceptIncomingCall(): void {
    const incoming = this.callService.incomingCall();
    if (incoming) {
      this.callService.acceptCall(incoming.callId, incoming.caller, incoming.callType);
    }
  }

  rejectIncomingCall(): void {
    const incoming = this.callService.incomingCall();
    if (incoming) {
      this.callService.rejectCall(incoming.callId);
    }
  }
}
