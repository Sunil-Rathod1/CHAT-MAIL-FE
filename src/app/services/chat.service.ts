import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatHistory, Conversation, Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private apiUrl = 'https://chat-mail-be.onrender.com/api/chat';
  
  activeChat = signal<string | null>(null);
  chatMessages = signal<Message[]>([]);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getChatHistory(userId: string, page: number = 1): Observable<{ success: boolean; data: ChatHistory }> {
    return this.http.get<{ success: boolean; data: ChatHistory }>(
      `${this.apiUrl}/history/${userId}?page=${page}`,
      { headers: this.getHeaders() }
    );
  }

  getConversations(): Observable<{ success: boolean; data: Conversation[] }> {
    return this.http.get<{ success: boolean; data: Conversation[] }>(
      `${this.apiUrl}/conversations`,
      { headers: this.getHeaders() }
    );
  }

  sendMessage(receiverId: string, content: string, type: string = 'text'): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/send`,
      { receiverId, content, type },
      { headers: this.getHeaders() }
    );
  }

  markAsRead(senderId: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/read`,
      { senderId },
      { headers: this.getHeaders() }
    );
  }

  setActiveChat(userId: string): void {
    this.activeChat.set(userId);
  }

  clearActiveChat(): void {
    this.activeChat.set(null);
    this.chatMessages.set([]);
  }

  addMessage(message: Message): void {
    this.chatMessages.update(msgs => [...msgs, message]);
  }
}
