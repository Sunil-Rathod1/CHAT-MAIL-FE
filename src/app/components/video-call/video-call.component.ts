import { Component, inject, effect, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../services/call.service';

@Component({
  selector: 'app-video-call',
  imports: [CommonModule],
  template: `
    <div class="video-call-container" *ngIf="callService.callState().isInCall">
      <!-- Call Status Overlay -->
      <div class="call-status-overlay" *ngIf="callService.callState().callStatus !== 'connected'">
        <div class="status-content">
          <div class="avatar">
            @if (callService.callState().remoteUser?.avatar) {
              <img [src]="callService.callState().remoteUser?.avatar" alt="User avatar" />
            } @else {
              <div class="avatar-placeholder">
                {{ callService.callState().remoteUser?.name?.charAt(0) || '?' }}
              </div>
            }
          </div>
          <h2>{{ callService.callState().remoteUser?.name }}</h2>
          <p class="status-text">
            @switch (callService.callState().callStatus) {
              @case ('calling') { Calling... }
              @case ('ringing') { Ringing... }
              @case ('connecting') { Connecting... }
              @default { {{ callService.callState().callStatus }} }
            }
          </p>
          <div class="pulse-ring"></div>
        </div>
      </div>

      <!-- Video Container -->
      <div class="videos-container">
        <!-- Remote Video (Full Screen) -->
        <video 
          #remoteVideo 
          class="remote-video"
          autoplay 
          playsinline
          [muted]="false"
          [volume]="1.0"
          [class.hidden]="!callService.callState().remoteVideoEnabled"
        ></video>

        <!-- Remote Video Disabled Placeholder -->
        <div class="remote-video-disabled" *ngIf="!callService.callState().remoteVideoEnabled && callService.callState().callStatus === 'connected'">
          <div class="avatar-large">
            @if (callService.callState().remoteUser?.avatar) {
              <img [src]="callService.callState().remoteUser?.avatar" alt="User avatar" />
            } @else {
              <div class="avatar-placeholder-large">
                {{ callService.callState().remoteUser?.name?.charAt(0) || '?' }}
              </div>
            }
          </div>
          <p>Camera is off</p>
        </div>

        <!-- Local Video (Picture in Picture) -->
        <div class="local-video-container" [class.video-off]="!callService.callState().isVideoEnabled">
          <video 
            #localVideo 
            class="local-video"
            autoplay 
            playsinline 
            muted
          ></video>
          <div class="local-video-off" *ngIf="!callService.callState().isVideoEnabled">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16.5 9.4l-2-2-3.9-3.9"/>
              <path d="M21 21l-9-9"/>
              <path d="M11 11H6a2 2 0 0 0-2 2v1"/>
              <path d="M5 19h12a2 2 0 0 0 2-2v-4"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Call Info Bar -->
      <div class="call-info-bar">
        <span class="call-type">
          @if (callService.callState().callType === 'video') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Video Call
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
            Audio Call
          }
        </span>
        <span class="call-duration" *ngIf="callService.callState().callStatus === 'connected'">
          {{ callDuration }}
        </span>
        
        <!-- Encryption Status Indicator -->
        @if (callService.callState().callStatus === 'connected') {
          <button 
            class="encryption-indicator" 
            [class.encrypted]="callService.encryptionStatus().isEncrypted"
            (click)="callService.toggleEncryptionInfo()"
            [title]="callService.encryptionStatus().isEncrypted ? 'End-to-end encrypted' : 'Checking encryption...'"
          >
            @if (callService.encryptionStatus().isEncrypted) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <span>Encrypted</span>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
              </svg>
              <span>Checking...</span>
            }
          </button>
        }
      </div>

      <!-- Encryption Info Modal -->
      @if (callService.showEncryptionInfo()) {
        <div class="encryption-modal-overlay" (click)="callService.toggleEncryptionInfo()">
          <div class="encryption-modal" (click)="$event.stopPropagation()">
            <div class="encryption-modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                End-to-End Encryption
              </h3>
              <button class="close-btn" (click)="callService.toggleEncryptionInfo()">×</button>
            </div>
            <div class="encryption-modal-body">
              @if (callService.encryptionStatus().isEncrypted) {
                <div class="encryption-status success">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>This call is end-to-end encrypted</span>
                </div>
                <div class="encryption-details">
                  <div class="detail-row">
                    <span class="label">Protocol:</span>
                    <span class="value">{{ callService.encryptionStatus().protocol }}</span>
                  </div>
                  @if (callService.encryptionStatus().fingerprint) {
                    <div class="detail-row fingerprint">
                      <span class="label">Fingerprint:</span>
                      <span class="value">{{ callService.getFormattedFingerprint() }}</span>
                    </div>
                  }
                </div>
                <p class="encryption-info">
                  Your call is secured with DTLS-SRTP encryption. Audio and video streams 
                  are encrypted before leaving your device and can only be decrypted by 
                  the other participant.
                </p>
              } @else {
                <div class="encryption-status pending">
                  <div class="spinner"></div>
                  <span>Verifying encryption...</span>
                </div>
                <p class="encryption-info">
                  Please wait while we verify the encryption status of your call.
                </p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Call Controls -->
      <div class="call-controls">
        <!-- Mute Button -->
        <button 
          class="control-btn" 
          [class.active]="!callService.callState().isAudioEnabled"
          (click)="callService.toggleAudio()"
          [title]="callService.callState().isAudioEnabled ? 'Mute' : 'Unmute'"
        >
          @if (callService.callState().isAudioEnabled) {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
          } @else {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            </svg>
          }
        </button>

        <!-- Video Toggle Button (only for video calls) -->
        @if (callService.callState().callType === 'video') {
          <button 
            class="control-btn" 
            [class.active]="!callService.callState().isVideoEnabled"
            (click)="callService.toggleVideo()"
            [title]="callService.callState().isVideoEnabled ? 'Turn off camera' : 'Turn on camera'"
          >
            @if (callService.callState().isVideoEnabled) {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            } @else {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
              </svg>
            }
          </button>
        }

        <!-- Device Picker Button -->
        <button 
          class="control-btn settings-btn"
          (click)="callService.toggleDevicePicker()"
          title="Switch device"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        </button>

        <!-- End Call Button -->
        <button 
          class="control-btn end-call"
          (click)="callService.endCall()"
          title="End call"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
        </button>
      </div>

      <!-- Device Picker Modal -->
      @if (callService.showDevicePicker()) {
        <div class="device-picker-overlay" (click)="callService.toggleDevicePicker()">
          <div class="device-picker-modal" (click)="$event.stopPropagation()">
            <div class="device-picker-header">
              <h3>Device Settings</h3>
              <button class="close-picker" (click)="callService.toggleDevicePicker()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <div class="device-picker-content">
              <!-- Microphone Selection -->
              <div class="device-section">
                <label>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                  Microphone
                </label>
                <select 
                  [value]="callService.selectedAudioInput()"
                  (change)="onAudioInputChange($event)"
                >
                  @for (device of callService.audioInputDevices(); track device.deviceId) {
                    <option [value]="device.deviceId">{{ device.label }}</option>
                  }
                </select>
              </div>

              <!-- Camera Selection (only for video calls) -->
              @if (callService.callState().callType === 'video') {
                <div class="device-section">
                  <label>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    Camera
                  </label>
                  <select 
                    [value]="callService.selectedVideoInput()"
                    (change)="onVideoInputChange($event)"
                  >
                    @for (device of callService.videoInputDevices(); track device.deviceId) {
                      <option [value]="device.deviceId">{{ device.label }}</option>
                    }
                  </select>
                </div>
              }

              <!-- Speaker Selection -->
              @if (callService.audioOutputDevices().length > 0) {
                <div class="device-section">
                  <label>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    Speaker
                  </label>
                  <select 
                    [value]="callService.selectedAudioOutput()"
                    (change)="onAudioOutputChange($event)"
                  >
                    @for (device of callService.audioOutputDevices(); track device.deviceId) {
                      <option [value]="device.deviceId">{{ device.label }}</option>
                    }
                  </select>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .video-call-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1a1a1a;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .call-status-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .status-content {
      text-align: center;
      color: white;
    }

    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      margin: 0 auto 20px;
      overflow: hidden;
      border: 4px solid rgba(255,255,255,0.2);
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #06cf9c 0%, #25d366 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 600;
      color: white;
    }

    .status-content h2 {
      font-size: 24px;
      margin: 0 0 8px;
    }

    .status-text {
      font-size: 16px;
      color: rgba(255,255,255,0.7);
      margin: 0;
    }

    .pulse-ring {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      border: 3px solid rgba(6, 207, 156, 0.5);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 2s ease-out infinite;
    }

    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0;
      }
    }

    .videos-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remote-video.hidden {
      display: none;
    }

    .remote-video-disabled {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #2a2a2a;
      color: rgba(255,255,255,0.7);
    }

    .avatar-large {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder-large {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #06cf9c 0%, #25d366 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
      font-weight: 600;
      color: white;
    }

    .local-video-container {
      position: absolute;
      bottom: 100px;
      right: 20px;
      width: 150px;
      height: 200px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.2);
    }

    .local-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }

    .local-video-container.video-off {
      background: #333;
    }

    .local-video-off {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #333;
      color: rgba(255,255,255,0.5);
    }

    .call-info-bar {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(0,0,0,0.5);
      padding: 8px 20px;
      border-radius: 20px;
      color: white;
      font-size: 14px;
      z-index: 20;
    }

    .call-type {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .call-duration {
      font-weight: 500;
    }

    .encryption-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 12px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .encryption-indicator:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .encryption-indicator.encrypted {
      background: rgba(6, 207, 156, 0.2);
      color: #06cf9c;
    }

    .encryption-indicator.encrypted:hover {
      background: rgba(6, 207, 156, 0.3);
    }

    /* Encryption Modal */
    .encryption-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .encryption-modal {
      background: #1a1a1a;
      border-radius: 16px;
      width: 90%;
      max-width: 400px;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    .encryption-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #2a2a2a;
      border-bottom: 1px solid #333;
    }

    .encryption-modal-header h3 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 16px;
      color: white;
    }

    .encryption-modal-header h3 svg {
      color: #06cf9c;
    }

    .encryption-modal-header .close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .encryption-modal-header .close-btn:hover {
      color: white;
    }

    .encryption-modal-body {
      padding: 20px;
    }

    .encryption-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .encryption-status.success {
      background: rgba(6, 207, 156, 0.15);
      color: #06cf9c;
    }

    .encryption-status.pending {
      background: rgba(255, 193, 7, 0.15);
      color: #ffc107;
    }

    .encryption-status .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 193, 7, 0.3);
      border-top-color: #ffc107;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .encryption-details {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .detail-row:not(:last-child) {
      border-bottom: 1px solid #333;
    }

    .detail-row .label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
    }

    .detail-row .value {
      color: white;
      font-size: 13px;
      font-weight: 500;
    }

    .detail-row.fingerprint {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .detail-row.fingerprint .value {
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
      background: #1a1a1a;
      padding: 8px;
      border-radius: 4px;
      width: 100%;
    }

    .encryption-info {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .call-controls {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      z-index: 20;
    }

    .control-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.2);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.05);
    }

    .control-btn.active {
      background: white;
      color: #333;
    }

    .control-btn.end-call {
      background: #ea0038;
      width: 64px;
      height: 64px;
    }

    .control-btn.end-call:hover {
      background: #ff1a4d;
    }

    /* Incoming Call Modal */
    .incoming-call-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    }

    .incoming-call-content {
      text-align: center;
      color: white;
    }

    .caller-info {
      margin-bottom: 40px;
    }

    .avatar-ring {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      margin: 0 auto 20px;
      overflow: hidden;
      border: 4px solid #06cf9c;
      animation: ring-pulse 1.5s ease-out infinite;
    }

    @keyframes ring-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(6, 207, 156, 0.4);
      }
      50% {
        box-shadow: 0 0 0 20px rgba(6, 207, 156, 0);
      }
    }

    .avatar-ring img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .caller-info h2 {
      font-size: 28px;
      margin: 0 0 8px;
    }

    .caller-info p {
      font-size: 16px;
      color: rgba(255,255,255,0.7);
      margin: 0;
    }

    .call-actions {
      display: flex;
      justify-content: center;
      gap: 60px;
    }

    .reject-btn, .accept-btn {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .reject-btn {
      background: #ea0038;
      color: white;
    }

    .reject-btn:hover {
      background: #ff1a4d;
      transform: scale(1.1);
    }

    .accept-btn {
      background: #06cf9c;
      color: white;
    }

    .accept-btn:hover {
      background: #25d366;
      transform: scale(1.1);
    }

    /* Tablet */
    @media (max-width: 991px) and (min-width: 768px) {
      .local-video-container {
        width: 140px;
        height: 180px;
        bottom: 100px;
        right: 20px;
      }

      .call-controls {
        padding: 16px 0;
        gap: 16px;
      }

      .control-btn {
        width: 52px;
        height: 52px;
      }

      .control-btn.end-call {
        width: 60px;
        height: 60px;
      }

      .avatar {
        width: 100px;
        height: 100px;
      }

      .status-content h2 {
        font-size: 22px;
      }
    }

    /* Mobile */
    @media (max-width: 767px) {
      .local-video-container {
        width: 100px;
        height: 140px;
        bottom: 110px;
        right: 12px;
        border-radius: 12px;
      }

      .call-controls {
        padding: 12px 0 20px;
        gap: 12px;
      }

      .control-btn {
        width: 48px;
        height: 48px;
      }

      .control-btn svg {
        width: 20px;
        height: 20px;
      }

      .control-btn.end-call {
        width: 54px;
        height: 54px;
      }

      .call-info-bar {
        top: 12px;
        left: 12px;
        right: 12px;
        padding: 10px 16px;
        font-size: 13px;
      }

      .avatar {
        width: 90px;
        height: 90px;
      }

      .avatar-placeholder {
        font-size: 36px;
      }

      .status-content h2 {
        font-size: 20px;
        margin-bottom: 6px;
      }

      .status-text {
        font-size: 14px;
      }

      .avatar-large {
        width: 100px;
        height: 100px;
      }

      .avatar-placeholder-large {
        font-size: 40px;
      }

      .remote-video-disabled p {
        font-size: 14px;
      }

      .local-video-off svg {
        width: 20px;
        height: 20px;
      }
    }

    /* Small Mobile */
    @media (max-width: 375px) {
      .local-video-container {
        width: 80px;
        height: 110px;
        bottom: 100px;
        right: 10px;
        border-radius: 10px;
      }

      .call-controls {
        gap: 10px;
      }

      .control-btn {
        width: 44px;
        height: 44px;
      }

      .control-btn.end-call {
        width: 50px;
        height: 50px;
      }

      .call-info-bar {
        padding: 8px 12px;
        font-size: 12px;
      }

      .avatar {
        width: 80px;
        height: 80px;
      }

      .status-content h2 {
        font-size: 18px;
      }
    }

    /* Landscape orientation */
    @media (max-width: 767px) and (orientation: landscape) {
      .local-video-container {
        width: 120px;
        height: 90px;
        bottom: 80px;
        right: 12px;
      }

      .call-controls {
        padding: 8px 0;
      }

      .control-btn {
        width: 44px;
        height: 44px;
      }

      .control-btn.end-call {
        width: 50px;
        height: 50px;
      }

      .call-status-overlay .status-content {
        transform: scale(0.85);
      }
    }

    /* Device Picker Styles */
    .settings-btn {
      background: rgba(255,255,255,0.15);
    }

    .device-picker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1002;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .device-picker-modal {
      background: #202c33;
      border-radius: 16px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .device-picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #374248;
    }

    .device-picker-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #e9edef;
    }

    .close-picker {
      background: none;
      border: none;
      color: #8696a0;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-picker:hover {
      background: rgba(134, 150, 160, 0.1);
      color: #e9edef;
    }

    .device-picker-content {
      padding: 16px 20px;
    }

    .device-section {
      margin-bottom: 20px;
    }

    .device-section:last-child {
      margin-bottom: 0;
    }

    .device-section label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #8696a0;
      margin-bottom: 8px;
    }

    .device-section select {
      width: 100%;
      padding: 12px 16px;
      background: #111b21;
      border: 1px solid #374248;
      border-radius: 8px;
      color: #e9edef;
      font-size: 14px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%238696a0'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .device-section select:focus {
      outline: none;
      border-color: #00a884;
    }

    .device-section select option {
      background: #111b21;
      color: #e9edef;
      padding: 8px;
    }
  `]
})
export class VideoCallComponent implements AfterViewInit, OnDestroy {
  callService = inject(CallService);

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  callDuration = '00:00';
  private durationInterval: any;
  private callStartTime: Date | null = null;

  constructor() {
    // Watch for local stream changes
    effect(() => {
      const stream = this.callService.localStreamSignal();
      if (stream && this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = stream;
      }
    });

    // Watch for remote stream changes
    effect(() => {
      const stream = this.callService.remoteStreamSignal();
      if (stream && this.remoteVideoRef?.nativeElement) {
        const videoElement = this.remoteVideoRef.nativeElement;
        videoElement.srcObject = stream;
        // Ensure audio is enabled and volume is set
        videoElement.muted = false;
        videoElement.volume = 1.0;
        console.log('🔊 Remote stream attached, audio enabled');
      }
    });

    // Watch for call status changes
    effect(() => {
      const state = this.callService.callState();
      if (state.callStatus === 'connected' && !this.durationInterval) {
        this.startDurationTimer();
      } else if (state.callStatus === 'idle' && this.durationInterval) {
        this.stopDurationTimer();
      }
    });
  }

  ngAfterViewInit(): void {
    // Set video elements when available
    const localStream = this.callService.localStreamSignal();
    const remoteStream = this.callService.remoteStreamSignal();

    if (localStream && this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.srcObject = localStream;
    }
    if (remoteStream && this.remoteVideoRef?.nativeElement) {
      const remoteVideo = this.remoteVideoRef.nativeElement;
      remoteVideo.srcObject = remoteStream;
      // Explicitly enable audio
      remoteVideo.muted = false;
      remoteVideo.volume = 1.0;
      console.log('🔊 Remote video initialized with audio enabled');
    }
  }

  ngOnDestroy(): void {
    this.stopDurationTimer();
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

  // Device switching handlers
  onAudioInputChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.callService.switchAudioInput(select.value);
  }

  onVideoInputChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.callService.switchVideoInput(select.value);
  }

  onAudioOutputChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (this.remoteVideoRef?.nativeElement) {
      this.callService.setAudioOutput(select.value, this.remoteVideoRef.nativeElement);
    }
  }

  private startDurationTimer(): void {
    this.callStartTime = new Date();
    this.durationInterval = setInterval(() => {
      if (this.callStartTime) {
        const elapsed = Math.floor((Date.now() - this.callStartTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.callDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    this.callStartTime = null;
    this.callDuration = '00:00';
  }
}
