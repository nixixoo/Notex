import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
import { Subscription } from 'rxjs';

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
export class ChatSidebarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() noteContent: string = '';
  @Input() noteId: string = '';
  
  message: string = '';
  messages: ChatMessage[] = [];
  isLoading: boolean = false;
  isOpen: boolean = false;
  messagesLoading: boolean = false;
  
  // Temporary message display for better UX
  pendingUserMessage: ChatMessage | null = null;
  
  private loadingSubscription: Subscription | null = null;
  private checkMessagesInterval: any = null;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    // Subscribe to the message loading state
    this.loadingSubscription = this.chatService.messagesLoading$.subscribe(loading => {
      this.messagesLoading = loading;
      if (!loading) {
        this.loadMessages();
      }
    });
    
    // Load messages immediately if they're already loaded
    if (this.chatService.areMessagesLoaded()) {
      this.loadMessages();
    }
    
    // Set up an interval to check for messages until they're loaded
    this.checkMessagesInterval = setInterval(() => {
      if (this.chatService.areMessagesLoaded()) {
        this.loadMessages();
        clearInterval(this.checkMessagesInterval);
        this.checkMessagesInterval = null;
      }
    }, 500);
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
    
    // Clear any intervals
    if (this.checkMessagesInterval) {
      clearInterval(this.checkMessagesInterval);
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // If noteId changes, reload messages
    if (changes['noteId'] && this.chatService.areMessagesLoaded()) {
      this.loadMessages();
    }
  }
  
  private loadMessages(): void {
    // Load messages specific to this note
    this.messages = this.chatService.getMessages(this.noteId);
    
    // Clear pending message if it's now in the loaded messages
    if (this.pendingUserMessage) {
      const messageExists = this.messages.some(msg => 
        msg.isUser && 
        msg.content === this.pendingUserMessage?.content
      );
      
      if (messageExists) {
        this.pendingUserMessage = null;
      }
    }
  }

  // Get all messages including any pending message
  get allMessages(): ChatMessage[] {
    if (this.pendingUserMessage) {
      return [...this.messages, this.pendingUserMessage];
    }
    return this.messages;
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
    
    // Store the message before sending
    const userMessage = this.message;
    
    // Create a temporary message to display immediately
    this.pendingUserMessage = {
      content: userMessage,
      isUser: true,
      timestamp: new Date(),
      noteId: this.noteId
    };
    
    // If there's note content, add context to the message
    let contextMessage = this.message;
    if (this.noteContent) {
      contextMessage = `Note content: "${this.noteContent.substring(0, 500)}${this.noteContent.length > 500 ? '...' : ''}"
      
My question: ${this.message}`;
    }
    
    // Clear input
    this.message = '';
    
    // Send message to service with noteId
    this.chatService.sendMessage(contextMessage, this.noteId)
      .subscribe({
        next: () => {
          // Messages will be loaded from the API automatically
          this.loadMessages();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.isLoading = false;
          
          // Show error message to user
          alert('Error sending message. Please try again later.');
        }
      });
  }

  clearChat(): void {
    // Clear pending message
    this.pendingUserMessage = null;
    
    // Clear chat for this specific note
    this.chatService.clearChat(this.noteId);
    
    // Reload messages after clearing
    this.loadMessages();
  }
}
