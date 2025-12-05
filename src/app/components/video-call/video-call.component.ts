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
      </div>

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
        this.remoteVideoRef.nativeElement.srcObject = stream;
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
      this.remoteVideoRef.nativeElement.srcObject = remoteStream;
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
