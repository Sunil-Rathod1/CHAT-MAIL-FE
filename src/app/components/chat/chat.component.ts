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
import { VoiceRecorderService } from '../../services/voice-recorder.service';
import { StickerService, Sticker } from '../../services/sticker.service';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { VideoCallComponent } from '../video-call/video-call.component';
import { StickerPickerComponent } from '../sticker-picker/sticker-picker.component';
import { User } from '../../models/user.model';
import { Message } from '../../models/message.model';

// Media viewer component with image lightbox, video player, and document viewer

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, EmojiPickerComponent, VideoCallComponent, StickerPickerComponent],
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
          <div class="header-actions">
            <button class="btn-icon" (click)="notificationService.toggleSettingsPanel()" title="Notification Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button class="btn-icon" (click)="logout()" title="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
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
                        <div class="message-image" (click)="openImageLightbox(message.content)">
                          <img [src]="message.content" alt="Image" loading="lazy" />
                        </div>
                      } @else if (message.type === 'video') {
                        <div class="message-video">
                          <video controls [src]="message.content" (click)="openVideoPlayer(message.content)"></video>
                          <button class="video-fullscreen-btn" (click)="openVideoPlayer(message.content)" title="Open in full screen">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                            </svg>
                          </button>
                        </div>
                      } @else if (message.type === 'document') {
                        <div class="message-document">
                          <div class="document-info">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                              <polyline points="13 2 13 9 20 9"/>
                            </svg>
                            <div class="document-details">
                              <span class="document-name">{{ getFileName(message.content) }}</span>
                              <span class="document-size">{{ message.fileSize || 'Document' }}</span>
                            </div>
                          </div>
                          <div class="document-actions">
                            <button class="btn-download" (click)="downloadFile(message.content, getFileName(message.content))" title="Download">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                            </button>
                            <button class="btn-view" (click)="openDocumentViewer(message.content, getFileName(message.content))" title="View">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      } @else if (message.type === 'voice') {
                        <div class="voice-message">
                          <button class="voice-play-btn" (click)="toggleVoicePlayback(message)">
                            @if (playingVoiceId() === message._id) {
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1"/>
                                <rect x="14" y="4" width="4" height="16" rx="1"/>
                              </svg>
                            } @else {
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                            }
                          </button>
                          <div class="voice-waveform">
                            @for (bar of getVoiceWaveform(message); track $index) {
                              <div class="waveform-bar" [style.height.%]="bar"></div>
                            }
                          </div>
                          <span class="voice-duration">{{ formatVoiceDuration(message.voiceDuration || 0) }}</span>
                        </div>
                      } @else if (message.type === 'sticker') {
                        <div class="sticker-message">
                          <img [src]="message.content" alt="Sticker" class="sticker-img" />
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
            
            <!-- Image Preview (Old - kept for backwards compat) -->
            @if (imagePreview() && !showMediaPreview()) {
              <div class="image-upload-preview">
                <img [src]="imagePreview()" alt="Preview" />
                <div class="preview-actions">
                  <button class="btn-sm" (click)="sendMediaFile()" [disabled]="uploadingImage()">
                    {{ uploadingImage() ? 'Uploading...' : 'Send Image' }}
                  </button>
                  <button class="btn-sm btn-secondary" (click)="cancelImageUpload()" [disabled]="uploadingImage()">
                    Cancel
                  </button>
                </div>
              </div>
            }
            
            <!-- Voice Recording UI -->
            @if (voiceRecorder.recordingState().isRecording || voiceRecorder.audioUrl()) {
              <div class="voice-recording-ui">
                @if (voiceRecorder.recordingState().isRecording) {
                  <div class="recording-active">
                    <span class="recording-indicator"></span>
                    <div class="recording-waveform">
                      @for (bar of voiceRecorder.recordingState().waveform; track $index) {
                        <div class="waveform-bar recording" [style.height.%]="bar"></div>
                      }
                    </div>
                    <span class="recording-time">{{ voiceRecorder.formatDuration(voiceRecorder.recordingState().duration) }}</span>
                    <button class="btn-icon cancel-btn" (click)="cancelVoiceRecording()" title="Cancel">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <button class="btn-icon stop-btn" (click)="stopVoiceRecording()" title="Stop">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                      </svg>
                    </button>
                  </div>
                } @else if (voiceRecorder.audioUrl()) {
                  <div class="recording-preview">
                    <button class="btn-icon play-btn" (click)="playRecordedVoice()" title="Play">
                      @if (isPlayingRecording()) {
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1"/>
                          <rect x="14" y="4" width="4" height="16" rx="1"/>
                        </svg>
                      } @else {
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      }
                    </button>
                    <div class="preview-waveform">
                      @for (bar of voiceRecorder.recordingState().waveform; track $index) {
                        <div class="waveform-bar" [style.height.%]="bar"></div>
                      }
                    </div>
                    <span class="preview-time">{{ voiceRecorder.formatDuration(voiceRecorder.recordingState().duration) }}</span>
                    <button class="btn-icon delete-btn" (click)="deleteVoiceRecording()" title="Delete">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                    <button class="btn-send voice-send" (click)="sendVoiceMessage()" [disabled]="uploadingVoice()" title="Send">
                      @if (uploadingVoice()) {
                        <span class="sending-spinner"></span>
                      } @else {
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                      }
                    </button>
                  </div>
                }
              </div>
            } @else {
              <div class="input-controls">
                <!-- File Upload Inputs -->
                <input 
                  type="file" 
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" 
                  (change)="onFileSelected($event)"
                  #fileInput
                  style="display: none;"
                />
                
                <!-- Attachment Menu Button -->
                <button class="btn-icon" (click)="fileInput.click()" title="Attach file">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>

                <!-- Sticker Button -->
                <div class="sticker-btn-wrapper">
                  <button class="btn-icon" (click)="toggleStickerPicker()" title="Send sticker">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </button>
                  <app-sticker-picker 
                    [isOpen]="showStickerPicker()"
                    (stickerSelected)="onStickerSelected($event)"
                  />
                </div>
                
                <input 
                  type="text" 
                  [(ngModel)]="messageInput"
                  (input)="onTyping()"
                  (keyup.enter)="sendMessage()"
                  placeholder="Type a message..."
                  class="message-input"
                />
                
                <!-- Voice Record Button (when no text) -->
                @if (!messageInput.trim()) {
                  <button class="btn-icon voice-btn" (click)="startVoiceRecording()" title="Record voice message">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </button>
                } @else {
                  <button class="btn-send" (click)="sendMessage()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <!-- Empty State -->
          <div class="empty-chat">
            <h2>ChatMail</h2>
            <p>Select a conversation to start messaging</p>
          </div>
        }
      </div>

    <!-- WhatsApp-Style Media Preview Modal -->
    @if (showMediaPreview()) {
      <div class="media-preview-overlay" (click)="cancelMediaPreview()">
        <div class="media-preview-modal" (click)="$event.stopPropagation()">
          <div class="media-preview-header">
            <button class="btn-close-modal" (click)="cancelMediaPreview()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h3>{{ fileType() === 'image' ? 'Send Image' : fileType() === 'video' ? 'Send Video' : 'Send Document' }}</h3>
          </div>
          
          <div class="media-preview-content">
            @if (fileType() === 'image' && imagePreview()) {
              <img [src]="imagePreview()" alt="Preview" class="preview-media" />
            } @else if (fileType() === 'video' && imagePreview()) {
              <video [src]="imagePreview()" controls class="preview-media"></video>
            } @else {
              <div class="document-preview">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p>{{ selectedFile()?.name }}</p>
                <small>{{ (selectedFile()?.size || 0) / 1024 | number:'1.0-0' }} KB</small>
              </div>
            }
          </div>
          
          <div class="media-preview-footer">
            <input 
              type="text" 
              [(ngModel)]="mediaCaption"
              placeholder="Add a caption..."
              class="caption-input"
              [disabled]="uploadingImage()"
            />
            <button 
              class="btn-send-media" 
              (click)="sendMediaFile()" 
              [disabled]="uploadingImage()"
            >
              @if (uploadingImage()) {
                <span>{{ uploadProgress() }}%</span>
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              }
            </button>
          </div>
        </div>
      </div>
    }
      
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

      <!-- Image Lightbox -->
      @if (showImageLightbox()) {
        <div class="lightbox-overlay" (click)="closeImageLightbox()">
          <div class="lightbox-content" (click)="$event.stopPropagation()">
            <button class="lightbox-close" (click)="closeImageLightbox()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <img [src]="lightboxImageUrl()" alt="Full size image" />
            <button class="lightbox-download" (click)="downloadFile(lightboxImageUrl()!, 'image.jpg')" title="Download">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        </div>
      }

      <!-- Video Player Modal -->
      @if (showVideoPlayer()) {
        <div class="video-modal-overlay" (click)="closeVideoPlayer()">
          <div class="video-modal-content" (click)="$event.stopPropagation()">
            <button class="video-modal-close" (click)="closeVideoPlayer()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <video controls autoplay [src]="videoPlayerUrl()"></video>
            <button class="video-download" (click)="downloadFile(videoPlayerUrl()!, 'video.mp4')" title="Download">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        </div>
      }

      <!-- Document Viewer Modal -->
      @if (showDocumentViewer()) {
        <div class="document-modal-overlay" (click)="closeDocumentViewer()">
          <div class="document-modal-content" (click)="$event.stopPropagation()">
            <div class="document-modal-header">
              <h3>{{ documentFileName() }}</h3>
              <button class="document-modal-close" (click)="closeDocumentViewer()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <iframe [src]="documentViewerUrl()" frameborder="0"></iframe>
            <button class="document-download" (click)="downloadFile(documentViewerUrl()!, documentFileName()!)" title="Download">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        </div>
      }

      <!-- Notification Settings Panel -->
      @if (notificationService.showSettingsPanel()) {
        <div class="notification-settings-overlay" (click)="notificationService.toggleSettingsPanel()">
          <div class="notification-settings-panel" (click)="$event.stopPropagation()">
            <div class="settings-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Notification Settings
              </h3>
              <button class="close-settings" (click)="notificationService.toggleSettingsPanel()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div class="settings-content">
              @if (notificationService.getPermission() !== 'granted') {
                <div class="permission-banner">
                  <p>Enable desktop notifications to stay updated</p>
                  <button class="enable-btn" (click)="enableNotifications()">
                    Enable Notifications
                  </button>
                </div>
              }
              
              <div class="settings-group">
                <label class="setting-item">
                  <span class="setting-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                    All Notifications
                  </span>
                  <button 
                    class="toggle-btn" 
                    [class.active]="notificationService.settings().enabled"
                    (click)="notificationService.toggleSetting('enabled')"
                  >
                    <span class="toggle-slider"></span>
                  </button>
                </label>

                <label class="setting-item" [class.disabled]="!notificationService.settings().enabled">
                  <span class="setting-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                    Message Notifications
                  </span>
                  <button 
                    class="toggle-btn" 
                    [class.active]="notificationService.settings().messages"
                    [disabled]="!notificationService.settings().enabled"
                    (click)="notificationService.toggleSetting('messages')"
                  >
                    <span class="toggle-slider"></span>
                  </button>
                </label>

                <label class="setting-item" [class.disabled]="!notificationService.settings().enabled">
                  <span class="setting-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                    </svg>
                    Call Notifications
                  </span>
                  <button 
                    class="toggle-btn" 
                    [class.active]="notificationService.settings().calls"
                    [disabled]="!notificationService.settings().enabled"
                    (click)="notificationService.toggleSetting('calls')"
                  >
                    <span class="toggle-slider"></span>
                  </button>
                </label>

                <label class="setting-item" [class.disabled]="!notificationService.settings().enabled">
                  <span class="setting-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Group Notifications
                  </span>
                  <button 
                    class="toggle-btn" 
                    [class.active]="notificationService.settings().groups"
                    [disabled]="!notificationService.settings().enabled"
                    (click)="notificationService.toggleSetting('groups')"
                  >
                    <span class="toggle-slider"></span>
                  </button>
                </label>

                <label class="setting-item" [class.disabled]="!notificationService.settings().enabled">
                  <span class="setting-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    Notification Sound
                  </span>
                  <button 
                    class="toggle-btn" 
                    [class.active]="notificationService.settings().sound"
                    [disabled]="!notificationService.settings().enabled"
                    (click)="notificationService.toggleSetting('sound')"
                  >
                    <span class="toggle-slider"></span>
                  </button>
                </label>

                <label class="setting-item" [class.disabled]="!notificationService.settings().enabled">
                  <span class="setting-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V5h16v14z"/>
                    </svg>
                    Desktop Notifications
                  </span>
                  <button 
                    class="toggle-btn" 
                    [class.active]="notificationService.settings().desktop"
                    [disabled]="!notificationService.settings().enabled"
                    (click)="notificationService.toggleSetting('desktop')"
                  >
                    <span class="toggle-slider"></span>
                  </button>
                </label>
              </div>
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
  voiceRecorder = inject(VoiceRecorderService);
  notificationService = inject(NotificationService);
  stickerService = inject(StickerService);
  private userService = inject(UserService);
  private audioService = inject(AudioService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  private shouldScrollToBottom = true;
  private typingTimeout: any;
  private voiceAudioElement: HTMLAudioElement | null = null;
  private recordedAudioElement: HTMLAudioElement | null = null;

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
  fileType = signal<'image' | 'video' | 'document' | null>(null);
  uploadProgress = signal<number>(0);
  showMediaPreview = signal<boolean>(false);
  mediaCaption = '';

  // Media viewer signals
  showImageLightbox = signal<boolean>(false);
  lightboxImageUrl = signal<string | null>(null);
  showVideoPlayer = signal<boolean>(false);
  videoPlayerUrl = signal<string | null>(null);
  showDocumentViewer = signal<boolean>(false);
  documentViewerUrl = signal<string | null>(null);
  documentFileName = signal<string | null>(null);

  // Voice message signals
  uploadingVoice = signal<boolean>(false);
  playingVoiceId = signal<string | null>(null);
  isPlayingRecording = signal<boolean>(false);

  // Sticker picker signal
  showStickerPicker = signal<boolean>(false);

  constructor() {
    // Listen to new real-time messages
    effect(() => {
      const newMsgData = this.socketService.newMessage();
      const newMsg = newMsgData.message;
      const selected = this.selectedUser();

      if (newMsg && selected) {
        const selectedId = (selected as any)._id || selected.id;
        const senderId = (newMsg.sender as any)?._id || (newMsg.sender as any)?.id || newMsg.sender;
        const receiverId = (newMsg.receiver as any)?._id || (newMsg.receiver as any)?.id || newMsg.receiver;
        const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;

        console.log('🔔 New message effect triggered:', {
          messageId: newMsg._id,
          content: newMsg.content,
          timestamp: newMsgData.timestamp,
          senderId,
          receiverId,
          selectedId,
          currentUserId
        });

        // Check if message belongs to current conversation
        if (senderId === selectedId || receiverId === selectedId) {
          console.log('🎯 Message is for current chat - senderId:', senderId, 'receiverId:', receiverId, 'selectedId:', selectedId);
          // Prevent adding duplicate messages
          this.chatMessages.update(msgs => {
            if (msgs.some(m => m._id === newMsg._id)) {
              console.log('⚠️ Duplicate message detected, skipping');
              return msgs;
            }
            console.log('✅ Adding new message to chat');
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
        } else {
          console.log('🚫 Message NOT for current chat - senderId:', senderId, 'receiverId:', receiverId, 'selectedId:', selectedId);
        }

        // Update conversations list with new message
        if (newMsg) {
          this.updateConversationWithMessage(newMsg);
        }
      } else {
        // Even if not in current chat, update conversations
        console.log('💬 Message not for current chat, updating conversations only');
        if (newMsg) {
          this.updateConversationWithMessage(newMsg);
        }
      }
    });

    // Listen to online/offline status
    effect(() => {
      const onlineUsers = this.socketService.onlineUsers();
      console.log('👥 Online users updated:', onlineUsers.length, 'users', onlineUsers);
      // Force new Set to trigger all dependent updates
      this.onlineUserIds.set(new Set([...onlineUsers]));
      
      // Log detailed online status
      const selected = this.selectedUser();
      if (selected) {
        const userId = (selected as any)._id || selected.id;
        const isOnline = onlineUsers.includes(userId);
        console.log('🔍 Selected user:', userId, 'Online status:', isOnline ? '🟮 ONLINE' : '⚫ OFFLINE');
      }
    });

    // Listen to typing indicators
    effect(() => {
      const typingMap = this.socketService.typingUsers();
      const typingSet = new Set<string>();
      typingMap.forEach((isTyping, userId) => {
        if (isTyping) {
          console.log('⌨️ User typing:', userId);
          typingSet.add(userId);
        }
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

    // Listen to message status updates (ticks: sent → delivered → read)
    effect(() => {
      const statusUpdate = this.socketService.messageStatusUpdate();

      if (statusUpdate && statusUpdate.messageId) {
        console.log('✓ Updating message status:', statusUpdate.messageId, '→', statusUpdate.status);
        this.chatMessages.update(msgs =>
          msgs.map(msg =>
            msg._id === statusUpdate.messageId
              ? { ...msg, status: statusUpdate.status as any }
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
        
        // Update conversation preview if this is the last message
        this.conversations.update(convs =>
          convs.map(conv => {
            if (conv.lastMessage._id === editUpdate.messageId) {
              return {
                ...conv,
                lastMessage: {
                  ...conv.lastMessage,
                  content: editUpdate.content,
                  isEdited: true
                }
              };
            }
            return conv;
          })
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
          
          // Update conversation preview if this is the last message
          this.conversations.update(convs =>
            convs.map(conv => {
              if (conv.lastMessage._id === deleteUpdate.messageId) {
                return {
                  ...conv,
                  lastMessage: {
                    ...conv.lastMessage,
                    content: 'This message was deleted',
                    deletedForEveryone: true
                  }
                };
              }
              return conv;
            })
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
    
    // Refresh conversations every 30 seconds to stay in sync
    setInterval(() => {
      console.log('🔄 Auto-refreshing conversations...');
      this.loadConversations();
    }, 30000);
    
    // Refresh online users every 10 seconds
    setInterval(() => {
      console.log('🔄 Requesting fresh online users list...');
      this.socketService.requestOnlineUsers();
    }, 10000);
    
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
          // Ensure conversation IDs are set correctly
          const formattedConvs = response.data.map(conv => {
            if (!conv._id) {
              const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
              const senderId = (conv.lastMessage.sender as any)?._id || (conv.lastMessage.sender as any)?.id;
              const receiverId = (conv.lastMessage.receiver as any)?._id || (conv.lastMessage.receiver as any)?.id;
              conv._id = senderId === currentUserId ? receiverId : senderId;
            }
            return conv;
          });
          this.conversations.set(formattedConvs);
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

    console.log('📤 Sending message:', {
      content,
      receiverId,
      receiverName: selected.name
    });

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

    // Determine file type
    let type: 'image' | 'video' | 'document' = 'document';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    }

    // Check file size (50MB for videos, 10MB for images, 20MB for documents)
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 
                    type === 'image' ? 10 * 1024 * 1024 : 
                    20 * 1024 * 1024;
    
    if (file.size > maxSize) {
      const sizeLimit = type === 'video' ? '50MB' : type === 'image' ? '10MB' : '20MB';
      alert(`File size must be less than ${sizeLimit}`);
      return;
    }

    this.selectedFile.set(file);
    this.fileType.set(type);
    this.showMediaPreview.set(true);
    this.mediaCaption = '';

    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview.set(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    event.target.value = '';
  }

  sendMediaFile(): void {
    const file = this.selectedFile();
    const type = this.fileType();
    if (!file || !type) return;

    this.uploadingImage.set(true);
    this.uploadProgress.set(0);

    this.chatService.uploadImage(file).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const selected = this.selectedUser();
          if (selected) {
            const receiverId = (selected as any)._id || selected.id;

            // Build replyTo data if replying
            const replyTo = this.replyingTo() ? {
              messageId: this.replyingTo()!._id!,
              content: this.replyingTo()!.content,
              sender: this.replyingTo()!.sender
            } : undefined;

            // Send with caption if provided
            const content = this.mediaCaption ? 
              `${response.data.url}\n${this.mediaCaption}` : 
              response.data.url;

            this.socketService.sendMessage(receiverId, content, type, replyTo);
            this.replyingTo.set(null);
            this.audioService.playSend();
          }
        }
        this.cancelMediaPreview();
      },
      error: (error) => {
        console.error('Upload error:', error);
        let errorMessage = 'Failed to upload file. ';
        
        if (error.status === 500) {
          errorMessage += 'Server error - please contact support or try again later.';
        } else if (error.status === 413) {
          errorMessage += 'File is too large. Maximum size: 10MB for images.';
        } else if (error.status === 400) {
          errorMessage += error.error?.message || 'Invalid file format.';
        } else if (error.status === 0) {
          errorMessage += 'Network error - please check your connection.';
        } else {
          errorMessage += error.error?.message || 'Please try again.';
        }
        
        alert(errorMessage);
        this.uploadingImage.set(false);
        this.uploadProgress.set(0);
      }
    });
  }

  cancelMediaPreview(): void {
    this.showMediaPreview.set(false);
    this.selectedFile.set(null);
    this.imagePreview.set(null);
    this.fileType.set(null);
    this.uploadingImage.set(false);
    this.uploadProgress.set(0);
    this.mediaCaption = '';
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
    this.cancelMediaPreview();
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

  private updateConversationWithMessage(message: Message): void {
    const currentUserId = (this.currentUser() as any)?._id || this.currentUser()?.id;
    const senderId = (message.sender as any)?._id || (message.sender as any)?.id || message.sender;
    const receiverId = (message.receiver as any)?._id || (message.receiver as any)?.id || message.receiver;
    
    // Determine the other user in the conversation
    const otherUserId = senderId === currentUserId ? receiverId : senderId;
    
    console.log('🔄 Updating conversation with message:', {
      messageId: message._id,
      content: message.content?.substring(0, 50),
      type: message.type,
      senderId,
      receiverId,
      otherUserId
    });
    
    this.conversations.update(convs => {
      // Check if conversation exists with this user
      const existingIndex = convs.findIndex(conv => {
        // Handle both _id and id formats for conversation ID
        const convId = conv._id;
        // Also check by comparing user IDs in last message
        const convSenderId = (conv.lastMessage.sender as any)?._id || (conv.lastMessage.sender as any)?.id;
        const convReceiverId = (conv.lastMessage.receiver as any)?._id || (conv.lastMessage.receiver as any)?.id;
        
        // Match if either sender or receiver matches the other user
        const sendMatch = convSenderId === otherUserId || convReceiverId === otherUserId;
        const recvMatch = convSenderId === currentUserId || convReceiverId === currentUserId;
        
        return sendMatch && recvMatch;
      });

      if (existingIndex !== -1) {
        console.log('✅ Updating conversation at index:', existingIndex);
        // Update existing conversation and move to top
        const updated = [...convs];
        const conversation = updated[existingIndex];
        updated[existingIndex] = {
          ...conversation,
          lastMessage: message
        };
        // Move to top
        const [movedConv] = updated.splice(existingIndex, 1);
        return [movedConv, ...updated];
      } else {
        console.log('➕ Creating new conversation');
        // Add new conversation at the top
        return [{
          _id: otherUserId,
          lastMessage: message
        }, ...convs];
      }
    });
  }

  // Media viewer methods
  openImageLightbox(imageUrl: string): void {
    this.lightboxImageUrl.set(imageUrl);
    this.showImageLightbox.set(true);
  }

  closeImageLightbox(): void {
    this.showImageLightbox.set(false);
    this.lightboxImageUrl.set(null);
  }

  openVideoPlayer(videoUrl: string): void {
    this.videoPlayerUrl.set(videoUrl);
    this.showVideoPlayer.set(true);
  }

  closeVideoPlayer(): void {
    this.showVideoPlayer.set(false);
    this.videoPlayerUrl.set(null);
  }

  openDocumentViewer(documentUrl: string, fileName: string): void {
    this.documentViewerUrl.set(documentUrl);
    this.documentFileName.set(fileName);
    this.showDocumentViewer.set(true);
  }

  closeDocumentViewer(): void {
    this.showDocumentViewer.set(false);
    this.documentViewerUrl.set(null);
    this.documentFileName.set(null);
  }

  getFileName(url: string): string {
    if (!url) return 'Document';
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return decodeURIComponent(fileName);
  }

  downloadFile(fileUrl: string, fileName: string): void {
    fetch(fileUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download failed:', error);
        alert('Failed to download file');
      });
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.showImageLightbox()) {
      this.closeImageLightbox();
    } else if (this.showVideoPlayer()) {
      this.closeVideoPlayer();
    } else if (this.showDocumentViewer()) {
      this.closeDocumentViewer();
    }
  }

  // ============= VOICE MESSAGE METHODS =============

  async startVoiceRecording(): Promise<void> {
    try {
      await this.voiceRecorder.startRecording();
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }

  stopVoiceRecording(): void {
    this.voiceRecorder.stopRecording();
  }

  cancelVoiceRecording(): void {
    this.voiceRecorder.cancelRecording();
  }

  deleteVoiceRecording(): void {
    this.voiceRecorder.clearRecording();
  }

  playRecordedVoice(): void {
    const audioUrl = this.voiceRecorder.audioUrl();
    if (!audioUrl) return;

    if (this.recordedAudioElement) {
      if (this.isPlayingRecording()) {
        this.recordedAudioElement.pause();
        this.isPlayingRecording.set(false);
        return;
      }
    }

    this.recordedAudioElement = new Audio(audioUrl);
    this.recordedAudioElement.play();
    this.isPlayingRecording.set(true);

    this.recordedAudioElement.onended = () => {
      this.isPlayingRecording.set(false);
    };
  }

  async sendVoiceMessage(): Promise<void> {
    const selected = this.selectedUser();
    if (!selected) return;

    this.uploadingVoice.set(true);
    const token = this.authService.getToken();

    try {
      const response = await this.voiceRecorder.uploadVoiceMessage(token!).toPromise();
      
      if (response?.success) {
        const receiverId = (selected as any)._id || selected.id;
        const duration = this.voiceRecorder.recordingState().duration;
        const waveform = this.voiceRecorder.recordingState().waveform;

        // Send voice message via socket
        this.socketService.sendMessage(receiverId, response.data.url, 'voice', undefined, {
          voiceDuration: duration,
          voiceWaveform: waveform
        });

        this.audioService.playSend();
        this.voiceRecorder.clearRecording();
        this.shouldScrollToBottom = true;
      }
    } catch (error) {
      console.error('Failed to upload voice message:', error);
      alert('Failed to send voice message');
    } finally {
      this.uploadingVoice.set(false);
    }
  }

  toggleVoicePlayback(message: Message): void {
    const messageId = message._id;
    const audioUrl = message.content;

    if (this.playingVoiceId() === messageId) {
      // Stop current playback
      if (this.voiceAudioElement) {
        this.voiceAudioElement.pause();
        this.voiceAudioElement = null;
      }
      this.playingVoiceId.set(null);
      return;
    }

    // Stop any existing playback
    if (this.voiceAudioElement) {
      this.voiceAudioElement.pause();
    }

    // Start new playback
    this.voiceAudioElement = new Audio(audioUrl);
    this.voiceAudioElement.play();
    this.playingVoiceId.set(messageId!);

    this.voiceAudioElement.onended = () => {
      this.playingVoiceId.set(null);
      this.voiceAudioElement = null;
    };
  }

  getVoiceWaveform(message: Message): number[] {
    if (message.voiceWaveform && message.voiceWaveform.length > 0) {
      return message.voiceWaveform;
    }
    // Generate default waveform if none exists
    return Array.from({ length: 30 }, () => Math.floor(Math.random() * 60) + 20);
  }

  formatVoiceDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ============= STICKER METHODS =============

  toggleStickerPicker(): void {
    this.showStickerPicker.update(v => !v);
  }

  onStickerSelected(sticker: Sticker): void {
    const selected = this.selectedUser();
    if (!selected) return;

    const receiverId = (selected as any)._id || selected.id;

    // Send sticker as a special message type
    // We'll send it as an image message with the sticker URL
    this.socketService.sendMessage(receiverId, sticker.url, 'sticker');
    this.audioService.playSend();
    this.showStickerPicker.set(false);
    this.shouldScrollToBottom = true;
  }

  // Enable push notifications
  async enableNotifications(): Promise<void> {
    const granted = await this.notificationService.requestPermission();
    if (granted) {
      this.notificationService.showNotification('Notifications Enabled!', {
        body: 'You will now receive notifications for new messages and calls.',
        tag: 'welcome-notification'
      });
    }
  }
}