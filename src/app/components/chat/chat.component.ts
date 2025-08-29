import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, interval } from 'rxjs';

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
export class ChatComponent implements OnInit, OnDestroy {
  message: string = '';
  messages: ChatMessage[] = [];
  isLoading: boolean = false;
  isGuestMode: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.isGuestMode = this.authService.isGuestMode();
    this.loadMessages();
    
    // Set up message refresh for guest users (since they don't get real-time updates)
    if (this.isGuestMode) {
      const refreshSub = interval(1000).subscribe(() => {
        this.loadMessages();
      });
      this.subscriptions.push(refreshSub);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadMessages(): void {
    this.messages = this.chatService.getMessages();
  }

  sendMessage(): void {
    if (!this.message.trim()) return;
    
    this.isLoading = true;
    const messageToSend = this.message;
    
    // Clear input immediately
    this.message = '';
    
    // Send message to service
    this.chatService.sendMessage(messageToSend)
      .subscribe({
        next: (response) => {
          // For guest users, the message is already added by the service
          // For authenticated users, messages are reloaded from API
          this.loadMessages();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.chatService.addMessage('Sorry, I encountered an error. Please try again later.', false);
          this.loadMessages();
          this.isLoading = false;
        }
      });
  }

  clearChat(): void {
    this.chatService.clearChat();
    this.loadMessages();
  }
}
