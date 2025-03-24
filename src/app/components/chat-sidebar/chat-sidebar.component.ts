import { Component, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, style, transition, trigger } from '@angular/animations';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    TextFieldModule
  ],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-50%) translateX(100%)' }),
        animate('300ms ease-in-out', style({ transform: 'translateY(-50%) translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ transform: 'translateY(-50%) translateX(100%)' }))
      ])
    ])
  ]
})
export class ChatSidebarComponent implements OnInit {
  @Input() noteContent: string = '';
  
  message: string = '';
  messages: ChatMessage[] = [];
  isLoading: boolean = false;
  isOpen: boolean = false;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = this.chatService.getMessages();
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  handleEnterKey(event: any): void {
    // Allow shift+enter for new lines
    if (event.shiftKey) {
      return;
    }
    
    // Otherwise send the message and prevent default (new line)
    event.preventDefault();
    this.sendMessage();
  }

  autoGrow(element: any): void {
    if (!element) return;
    
    // Reset height to auto to get the correct scrollHeight
    element.style.height = 'auto';
    
    // Set the height to match the content (scrollHeight)
    // with a minimum height of 48px
    const newHeight = Math.max(48, element.scrollHeight);
    element.style.height = `${newHeight}px`;
  }

  sendMessage(): void {
    if (!this.message.trim()) return;
    
    this.isLoading = true;
    
    // If there's note content, add context to the message
    let contextMessage = this.message;
    if (this.noteContent) {
      contextMessage = `Note content: "${this.noteContent.substring(0, 500)}${this.noteContent.length > 500 ? '...' : ''}"
      
My question: ${this.message}`;
    }
    
    // Send message to service
    this.chatService.sendMessage(contextMessage)
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
