import { Injectable, inject, signal, effect } from '@angular/core';
import { SocketService } from './socket.service';
import { AuthService } from './auth.service';
import { CallState, CallUser, IncomingCall } from '../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class CallService {
  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // ICE servers configuration (STUN/TURN)
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ];

  // Signals
  callState = signal<CallState>({
    isInCall: false,
    callId: null,
    callType: null,
    remoteUser: null,
    isCaller: false,
    callStatus: 'idle',
    isAudioEnabled: true,
    isVideoEnabled: true,
    remoteAudioEnabled: true,
    remoteVideoEnabled: true
  });

  incomingCall = signal<IncomingCall | null>(null);
  localStreamSignal = signal<MediaStream | null>(null);
  remoteStreamSignal = signal<MediaStream | null>(null);
  callError = signal<string | null>(null);

  private listenersInitialized = false;

  constructor() {
    // Watch for socket connection and set up listeners when connected
    effect(() => {
      const isConnected = this.socketService.isConnected();
      if (isConnected && !this.listenersInitialized) {
        // Small delay to ensure socket is fully ready
        setTimeout(() => {
          this.setupSocketListeners();
          this.listenersInitialized = true;
          console.log('📞 Call service listeners initialized');
        }, 100);
      } else if (!isConnected) {
        // Reset when disconnected so we can re-initialize on reconnect
        this.listenersInitialized = false;
      }
    });
  }

  // Public method to ensure listeners are set up (can be called from components)
  ensureListenersInitialized(): void {
    if (!this.listenersInitialized && this.socketService.isConnected()) {
      this.setupSocketListeners();
      this.listenersInitialized = true;
      console.log('📞 Call service listeners initialized (manual)');
    }
  }

  private setupSocketListeners(): void {
    const socket = this.socketService.getSocket();
    if (!socket) return;

    // Incoming call
    socket.on('call:incoming', (data: IncomingCall) => {
      console.log('📞 Incoming call:', data);
      this.incomingCall.set(data);
    });

    // Call initiated (for caller)
    socket.on('call:initiated', (data: { callId: string; receiverId: string }) => {
      console.log('📞 Call initiated:', data);
      this.callState.update(state => ({
        ...state,
        callId: data.callId,
        callStatus: 'calling'
      }));
    });

    // Call accepted
    socket.on('call:accepted', async (data: { callId: string; receiver: CallUser }) => {
      console.log('✅ Call accepted:', data);
      this.callState.update(state => ({
        ...state,
        callStatus: 'connecting',
        remoteUser: data.receiver
      }));

      // Create and send offer
      await this.createOffer(data.callId, data.receiver.id);
    });

    // Call started (for receiver)
    socket.on('call:started', (data: { callId: string }) => {
      console.log('✅ Call started:', data);
      this.callState.update(state => ({
        ...state,
        callStatus: 'connecting'
      }));
    });

    // Call rejected
    socket.on('call:rejected', (data: { callId: string }) => {
      console.log('❌ Call rejected:', data);
      this.endCallCleanup();
    });

    // Call ended
    socket.on('call:ended', (data: { callId: string; endedBy: string; reason?: string }) => {
      console.log('📞 Call ended:', data);
      this.endCallCleanup();
    });

    // Call cancelled
    socket.on('call:cancelled', (data: { callId: string }) => {
      console.log('📞 Call cancelled:', data);
      this.incomingCall.set(null);
      this.endCallCleanup();
    });

    // Call missed
    socket.on('call:missed', (data: { callId: string }) => {
      console.log('📞 Call missed:', data);
      this.incomingCall.set(null);
      this.endCallCleanup();
    });

    // Call error
    socket.on('call:error', (data: { message: string }) => {
      console.error('❌ Call error:', data.message);
      this.callError.set(data.message);
      this.endCallCleanup();
      // Clear error after 5 seconds
      setTimeout(() => this.callError.set(null), 5000);
    });

    // WebRTC: Receive offer
    socket.on('webrtc:offer', async (data: { callId: string; offer: RTCSessionDescriptionInit; callerId: string }) => {
      console.log('📡 Received offer');
      await this.handleOffer(data.callId, data.offer, data.callerId);
    });

    // WebRTC: Receive answer
    socket.on('webrtc:answer', async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      console.log('📡 Received answer');
      await this.handleAnswer(data.answer);
    });

    // WebRTC: Receive ICE candidate
    socket.on('webrtc:ice-candidate', async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      console.log('📡 Received ICE candidate');
      await this.handleIceCandidate(data.candidate);
    });

    // Media toggled by remote user
    socket.on('call:media-toggled', (data: { callId: string; mediaType: 'audio' | 'video'; enabled: boolean }) => {
      console.log('🎛️ Remote media toggled:', data);
      if (data.mediaType === 'audio') {
        this.callState.update(state => ({ ...state, remoteAudioEnabled: data.enabled }));
      } else {
        this.callState.update(state => ({ ...state, remoteVideoEnabled: data.enabled }));
      }
    });
  }

  // Initialize call listeners (call this when socket connects)
  initializeListeners(): void {
    this.setupSocketListeners();
  }

  // Start a call
  async initiateCall(receiverId: string, receiverInfo: CallUser, callType: 'audio' | 'video'): Promise<void> {
    try {
      // Ensure listeners are set up before making a call
      this.ensureListenersInitialized();

      // Get user media
      await this.getUserMedia(callType);

      // Update call state
      this.callState.set({
        isInCall: true,
        callId: null,
        callType,
        remoteUser: receiverInfo,
        isCaller: true,
        callStatus: 'calling',
        isAudioEnabled: true,
        isVideoEnabled: callType === 'video',
        remoteAudioEnabled: true,
        remoteVideoEnabled: callType === 'video'
      });

      // Emit call initiation
      const socket = this.socketService.getSocket();
      if (socket) {
        console.log('📞 Emitting call:initiate to', receiverId);
        socket.emit('call:initiate', { receiverId, callType });
      } else {
        console.error('❌ Socket not available for call');
        throw new Error('Socket not connected');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      this.endCallCleanup();
      throw error;
    }
  }

  // Accept incoming call
  async acceptCall(callId: string, caller: CallUser, callType: 'audio' | 'video'): Promise<void> {
    try {
      // Get user media
      await this.getUserMedia(callType);

      // Update call state
      this.callState.set({
        isInCall: true,
        callId,
        callType,
        remoteUser: caller,
        isCaller: false,
        callStatus: 'connecting',
        isAudioEnabled: true,
        isVideoEnabled: callType === 'video',
        remoteAudioEnabled: true,
        remoteVideoEnabled: callType === 'video'
      });

      // Clear incoming call
      this.incomingCall.set(null);

      // Emit call acceptance
      const socket = this.socketService.getSocket();
      if (socket) {
        socket.emit('call:accept', { callId });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      this.endCallCleanup();
      throw error;
    }
  }

  // Reject incoming call
  rejectCall(callId: string): void {
    const socket = this.socketService.getSocket();
    if (socket) {
      socket.emit('call:reject', { callId });
    }
    this.incomingCall.set(null);
  }

  // End call
  endCall(): void {
    const state = this.callState();
    const socket = this.socketService.getSocket();

    if (socket && state.callId) {
      if (state.callStatus === 'calling') {
        // Cancel outgoing call
        socket.emit('call:cancel', { callId: state.callId });
      } else {
        // End ongoing call
        socket.emit('call:end', { callId: state.callId });
      }
    }

    this.endCallCleanup();
  }

  // Toggle audio
  toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.callState.update(state => ({ ...state, isAudioEnabled: audioTrack.enabled }));

        // Notify remote user
        const socket = this.socketService.getSocket();
        const callState = this.callState();
        if (socket && callState.callId && callState.remoteUser) {
          socket.emit('call:media-toggle', {
            callId: callState.callId,
            mediaType: 'audio',
            enabled: audioTrack.enabled
          });
        }
      }
    }
  }

  // Toggle video
  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.callState.update(state => ({ ...state, isVideoEnabled: videoTrack.enabled }));

        // Notify remote user
        const socket = this.socketService.getSocket();
        const callState = this.callState();
        if (socket && callState.callId && callState.remoteUser) {
          socket.emit('call:media-toggle', {
            callId: callState.callId,
            mediaType: 'video',
            enabled: videoTrack.enabled
          });
        }
      }
    }
  }

  // Get user media (camera/microphone)
  private async getUserMedia(callType: 'audio' | 'video'): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false
    };

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStreamSignal.set(this.localStream);
  }

  // Create peer connection
  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('📹 Remote track received');
      this.remoteStream = event.streams[0];
      this.remoteStreamSignal.set(this.remoteStream);
      this.callState.update(state => ({ ...state, callStatus: 'connected' }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = this.socketService.getSocket();
        const state = this.callState();
        if (socket && state.remoteUser) {
          socket.emit('webrtc:ice-candidate', {
            callId: state.callId,
            candidate: event.candidate,
            targetId: state.remoteUser.id
          });
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('📡 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.callState.update(state => ({ ...state, callStatus: 'connected' }));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall();
      }
    };

    return pc;
  }

  // Create and send offer (caller)
  private async createOffer(callId: string, receiverId: string): Promise<void> {
    this.peerConnection = this.createPeerConnection();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    const socket = this.socketService.getSocket();
    if (socket) {
      socket.emit('webrtc:offer', {
        callId,
        offer,
        receiverId
      });
    }
  }

  // Handle incoming offer (receiver)
  private async handleOffer(callId: string, offer: RTCSessionDescriptionInit, callerId: string): Promise<void> {
    this.peerConnection = this.createPeerConnection();

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    const socket = this.socketService.getSocket();
    if (socket) {
      socket.emit('webrtc:answer', {
        callId,
        answer,
        callerId
      });
    }
  }

  // Handle incoming answer (caller)
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  // Cleanup after call ends
  private endCallCleanup(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      this.localStreamSignal.set(null);
    }

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
      this.remoteStreamSignal.set(null);
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset call state
    this.callState.set({
      isInCall: false,
      callId: null,
      callType: null,
      remoteUser: null,
      isCaller: false,
      callStatus: 'idle',
      isAudioEnabled: true,
      isVideoEnabled: true,
      remoteAudioEnabled: true,
      remoteVideoEnabled: true
    });
  }
}
