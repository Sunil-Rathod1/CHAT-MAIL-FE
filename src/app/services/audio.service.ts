import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private sendSound: HTMLAudioElement;
  private receiveSound: HTMLAudioElement;
  private notificationSound: HTMLAudioElement;
  private enabled = true;

  constructor() {
    // Create audio elements
    this.sendSound = new Audio();
    this.receiveSound = new Audio();
    this.notificationSound = new Audio();
    
    // WhatsApp/Phone-like notification sounds
    // Send sound - short pop
    this.sendSound.src = this.createTone(800, 0.05, 0.3);
    
    // Receive sound - pleasant notification (tri-tone)
    this.receiveSound.src = this.createTriTone();
    
    // Notification sound
    this.notificationSound.src = this.receiveSound.src;
  }

  private createTone(frequency: number, duration: number, volume: number = 0.3): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Generate tone with fade out
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const fadeOut = 1 - (i / numSamples);
      const sample = Math.sin(2 * Math.PI * frequency * t) * volume * fadeOut * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }
    
    return 'data:audio/wav;base64,' + this.arrayBufferToBase64(buffer);
  }

  private createTriTone(): string {
    const sampleRate = 44100;
    const noteDuration = 0.1;
    const numSamples = Math.floor(sampleRate * noteDuration * 3);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Three tones: G4 (392Hz), E5 (659Hz), C5 (523Hz)
    const frequencies = [659, 523, 392];
    const samplesPerNote = Math.floor(sampleRate * noteDuration);
    
    for (let noteIdx = 0; noteIdx < 3; noteIdx++) {
      const freq = frequencies[noteIdx];
      for (let i = 0; i < samplesPerNote; i++) {
        const t = i / sampleRate;
        const fadeOut = 1 - (i / samplesPerNote);
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * fadeOut * 32767;
        view.setInt16(44 + (noteIdx * samplesPerNote + i) * 2, sample, true);
      }
    }
    
    return 'data:audio/wav;base64,' + this.arrayBufferToBase64(buffer);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  playSend(): void {
    if (this.enabled) {
      this.sendSound.currentTime = 0;
      this.sendSound.play().catch(() => {});
    }
  }

  playReceive(): void {
    if (this.enabled) {
      this.receiveSound.currentTime = 0;
      this.receiveSound.play().catch(() => {});
    }
  }

  playNotification(): void {
    if (this.enabled) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(() => {});
    }
  }

  toggleSound(enabled: boolean): void {
    this.enabled = enabled;
  }

  isSoundEnabled(): boolean {
    return this.enabled;
  }
}
