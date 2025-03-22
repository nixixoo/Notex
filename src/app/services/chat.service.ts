import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  userId: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: ChatMessage[] = [];

  constructor(private apiService: ApiService) { }

  // Get all messages
  getMessages(): ChatMessage[] {
    return this.messages;
  }

  // Add a user message and get AI response
  sendMessage(content: string): Observable<ChatResponse> {
    // Add user message to the list
    this.addMessage(content, true);
    
    // Send to API and get response
    return this.apiService.post<ChatResponse>('chat/message', { message: content });
  }

  // Add a message to the chat history
  addMessage(content: string, isUser: boolean, timestamp: Date = new Date()): void {
    this.messages.push({
      content,
      isUser,
      timestamp
    });
  }

  // Clear chat history
  clearChat(): void {
    this.messages = [];
  }
}
