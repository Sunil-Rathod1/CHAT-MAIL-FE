import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  waveform: number[];
}

export interface VoiceUploadResponse {
  success: boolean;
  data: {
    url: string;
    duration: number;
    waveform: number[];
    size: number;
    type: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VoiceRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private startTime: number = 0;
  private animationFrameId: number = 0;
  private waveformData: number[] = [];

  // Signals for reactive state
  recordingState = signal<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    waveform: []
  });

  audioBlob = signal<Blob | null>(null);
  audioUrl = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async startRecording(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Set up audio context for waveform visualization
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this.getSupportedMimeType()
      });

      this.audioChunks = [];
      this.waveformData = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioBlob.set(audioBlob);
        
        // Create URL for playback
        const url = URL.createObjectURL(audioBlob);
        this.audioUrl.set(url);

        // Clean up
        this.cleanup();
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      
      // Update state
      this.recordingState.set({
        isRecording: true,
        isPaused: false,
        duration: 0,
        waveform: []
      });

      // Start waveform animation
      this.updateWaveform();

      console.log('🎤 Voice recording started');
    } catch (error) {
      console.error('❌ Error starting voice recording:', error);
      throw error;
    }
  }

  private getSupportedMimeType(): string {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm';
  }

  private updateWaveform(): void {
    if (!this.analyser || !this.recordingState().isRecording) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average amplitude
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedValue = Math.min(100, Math.round((average / 255) * 100));
    
    // Add to waveform data (keep last 50 values)
    this.waveformData.push(normalizedValue);
    if (this.waveformData.length > 50) {
      this.waveformData.shift();
    }

    // Update duration
    const duration = (Date.now() - this.startTime) / 1000;

    this.recordingState.update(state => ({
      ...state,
      duration,
      waveform: [...this.waveformData]
    }));

    // Continue animation
    this.animationFrameId = requestAnimationFrame(() => this.updateWaveform());
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      
      this.recordingState.update(state => ({
        ...state,
        isRecording: false,
        isPaused: false
      }));

      console.log('🎤 Voice recording stopped');
    }
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
    this.audioChunks = [];
    this.audioBlob.set(null);
    this.audioUrl.set(null);
    
    this.recordingState.set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      waveform: []
    });

    console.log('🎤 Voice recording cancelled');
  }

  private cleanup(): void {
    // Stop animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
  }

  uploadVoiceMessage(token: string): Observable<VoiceUploadResponse> {
    const blob = this.audioBlob();
    if (!blob) {
      throw new Error('No voice recording to upload');
    }

    const state = this.recordingState();
    const formData = new FormData();
    formData.append('voice', blob, 'voice_message.webm');
    formData.append('duration', state.duration.toString());
    formData.append('waveform', JSON.stringify(this.waveformData));

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<VoiceUploadResponse>(
      `${environment.apiUrl}/chat/upload/voice`,
      formData,
      { headers }
    );
  }

  // Format duration as MM:SS
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Clear the recorded audio
  clearRecording(): void {
    if (this.audioUrl()) {
      URL.revokeObjectURL(this.audioUrl()!);
    }
    this.audioBlob.set(null);
    this.audioUrl.set(null);
    this.waveformData = [];
    this.recordingState.set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      waveform: []
    });
  }
}
