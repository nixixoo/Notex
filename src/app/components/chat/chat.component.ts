import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  message: string = '';
  messages: ChatMessage[] = [];
  isLoading: boolean = false;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = this.chatService.getMessages();
  }

  sendMessage(): void {
    if (!this.message.trim()) return;
    
    this.isLoading = true;
    
    // Send message to service
    this.chatService.sendMessage(this.message)
      .subscribe({
        next: (response) => {
          // Add AI response to chat
          this.chatService.addMessage(response.message, false, new Date(response.timestamp));
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.chatService.addMessage('Sorry, I encountered an error. Please try again later.', false);
          this.isLoading = false;
        }
      });
    
    // Clear input
    this.message = '';
  }

  clearChat(): void {
    this.chatService.clearChat();
    this.messages = this.chatService.getMessages();
  }
}
