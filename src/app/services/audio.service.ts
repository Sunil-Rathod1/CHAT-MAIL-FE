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
    // Create audio elements with base64 encoded sounds
    this.sendSound = new Audio();
    this.receiveSound = new Audio();
    this.notificationSound = new Audio();
    
    // Simple beep sounds using data URIs
    // Send sound - higher pitch, shorter
    this.sendSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFgZqVqJednqKloKGkoqSlpKKjoqOko6KhoZ+dnJqYlpSTkZCPjo2Mjouoh5SIkYqUjJaOmI+akZySnJScnJ2cnJydnJ2cnZycnJycnJ2cnZudnJ2bnJuam5qampmamZmYmZiYmJeYl5eWl5aWlZaVlZSVlJWUlJSTlJOUk5STk5SbmpucnZ6fn6CgoqGio6SjpKOko6OkpKOko6OjoqOiop+gnpqWlI+Lh4N/e3d0c21qaGVjYmBdXVpcWVtYWFdYVldWVldWVVZVVVRVVFVUVFNUU1NTUlNSUlJRUlFRUVBRUFBQT1BPUFBPT1BPT05PTk5OTU1OTU1MTExMS0xLSkpLSkpKSUpKSUpJSUlIR0hHR0dGR0ZGRkVFRkVERUVERERDREREQ0NFREVFRUVGR0ZHR0hISUpKS0pLS0xMTExNTU5OT09PT1BQUFBRUVBRUlFSUlJTU1RUU1RVVVZVVlZXV1hYWVlaWltcXFxdXl1eX2BhYGFiY2RkZWZnaGhpamprbGxtbm9vcHFxcnN0dHV2d3d4eXt6e3x9foB/gIGCg4SFhoeHiImKiouMjY2Oj5CRkZKTk5SVlZaXl5iZmpqbnJ2dnp+fn6ChoaKio6SjpKWlpqamp6eoqKmpqqqrq6usrKytra6urq+vr6+wsbCxsbGysrGysrKxsrKysrGysrGxsrKysrGxsbCxsLCvr6+ur66urq2trKysq6qqqamop6emoqChpKOioqGhn5+enZuamZiYl5aVlJOSkI+OjYuKiYiHhYSCgYB+fXt6eXh3dXRzcnFvb21sa2ppZ2dmZWNiYWBfXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDo7Ojk4Nzc2NTU0MzMxMjExLzAvLy4uLS0sKywrKiopKCkoJygnJycmJSYlJCQjJCMjIiMiISEhICEgIB8fHx8eHh4dHR0cHBwcGxwbGxoaGhkZGRkYGRgYGBcXFxcWFhYVFRUVFBQUExQTEhMSEhEREhERERAPDw8QEBEQEA8PDg4ODg4NDQ0MDA0MDAwLCwsLCgsKCgkKCQkJCQgICAgIBwcHBwcGBgYGBQUFBQQFBAQEAwMDAwIDAgICAQIBAQEBAAABAAAAAAAAAAAA';
    
    // Receive sound - lower pitch, slightly longer
    this.receiveSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm14IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBgoOFhoeIioyNjpCRk5SVl5manJ2foKKkpqeqq62vsLK0tbW3uLq7vL2+v8DBwsPDxMXFxsbHx8jIycnJycrKysnKycnJyMjIxsbGxcTEw8LBwb++vbu6uLe2tLOyr6+trKqop6Wko6Gfnp2bmpeWlJKRj42MiomIhoWEg4GAfXt5eHZ1c3FwbmxqaWhmaWNhYV5cW1lYVlVUUlFPT05NTEtJSEdGRkVEQ0JBQEBAQEBBQUJDREVGRkdJSktMTU1OT1BQUVJSU1RUVVZXWFhaWltcXF1eX2BiY2RlZWdnaGpqbG1ubm9wcXN0dHV3d3h5e3t8fX5/gIGCg4SGhoeIiYqMjI2Oj5CSk5OVlpaYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLS1trO7vby+v8DBwsPEw8TFxcbGx8fIyMjJycnKycrKysrJycnIyMfHxsbFxMTDwsLBv7++vLu6uLe1tLKxr62sqaelnJuYlpSTkY6Ni4mHhYOBfnx5dnNwa2hkYl1aVlNPTEhFQT48OjczMi4rJygmJCMhHx4dGxsaGRgXFxYVFRQUExISEhEREBAPDw8ODg4NDQ0MDAwMCwsLCwoLCgoKCQkJCQgJCAcIBwcHBgYGBgYFBQUFBAUEBAQEAwMDAwMCAwICAgIBAQEBAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAEBAAEBAQIBAgIDAgIDAwMEAwQFBQUGBgYHBwcICQgJCgoLCwwMDA0NDg4ODw8PEBARERISEhMUFBQVFRYXFxgYGRobGhscHR0eHyAgISIjJCQmJycoKSorKy0uLi8wMTI0NTU2Nzk5Ozs9PT5AQUJDRUZHSElKS0xNTk9QUlJTVFVWV1haWltcXV9gYWJjZGVnaGhpamttbW5wcXFzdHV2d3h5enx8fX+AgYKDhYWHh4mJi4yNjo+QkpKUlZaXmJqam5ydnp+goaKkpKWmp6iprquvsbGzs7W1t7e5ury8vb7Av8HBwsPDxMXFxsfHyMjJycrKysrLy8vLysrKycnJyMfHxsXEw8LAv727urm3trSyrquopqOhnpyYlZKOi4h8eXZzb2tlYV5aVlNPTEhEQT47NzYzLy0qKCUjIB8dGxkYFhUTEhEPDgwLCwkIBwYFBAMDAgEBAQAAAAAAAAABAAAAAQAAAAEBAQECAgIDAwQEBAUFBgYHBwgICQkKCgsLDAwNDQ4ODxAQERESEhMTFBUWFhcXGBkaGhsdHR4fHyAhIiIjJCUmJycoKSorLC0tLy8xMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6Slpqeoqaqrrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1NXW19fY2dra29vb3Nzd3d3e3t/e397e3t3d3Nzc29va2tnZ2NjX1tbV1NTT0tHQz87NzMvKycjHxsXEw8LBwL+';
    
    // Notification sound - attention grabbing
    this.notificationSound.src = this.receiveSound.src;
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
