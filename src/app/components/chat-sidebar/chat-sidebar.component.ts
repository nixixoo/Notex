import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { animate, style, transition, trigger, query, stagger, state } from '@angular/animations';
import { TextFieldModule } from '@angular/cdk/text-field';
import { Subscription } from 'rxjs';

// Confirmation Dialog Component
@Component({
  selector: 'app-delete-confirmation-dialog',
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Delete Chat History</h2>
      <mat-dialog-content>
        Are you sure you want to delete all chat messages? This action cannot be undone.
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close class="cancel-button">Cancel</button>
        <button mat-button [mat-dialog-close]="true" color="warn" class="delete-button">Delete</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .dialog-container {
      color: var(--text-color);
    }
    
    h2 {
      margin-top: 0;
      color: var(--text-color);
    }
    
    mat-dialog-content {
      color: var(--text-color);
    }
    
    .cancel-button, .delete-button {
      transition: transform 0.2s ease;
      
      &:hover {
        transform: scale(1.05);
      }
    }
    
    .cancel-button {
      color: var(--text-color);
    }
    
    .delete-button {
      color: var(--error-color, #f44336);
    }
    
    :host-context(.dark-theme) {
      h2, mat-dialog-content, .cancel-button {
        color: white !important;
      }
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class DeleteConfirmationDialogComponent {
  constructor(public dialogRef: MatDialogRef<DeleteConfirmationDialogComponent>) {
    // Apply theme class to dialog container
    dialogRef.addPanelClass('app-themed-dialog');
    
    // Check if dark theme is active and add appropriate class
    const isDarkTheme = document.body.classList.contains('dark-theme');
    if (isDarkTheme) {
      dialogRef.addPanelClass('dark-theme-dialog');
    }
  }
}

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
    MatDialogModule,
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
    ]),
    trigger('simpleFade', [
      state('in', style({ opacity: 1 })),
      state('out', style({ opacity: 0 })),
      transition('in => out', animate('400ms ease-out')),
      transition('out => in', animate('300ms ease-in')),
      transition('void => in', [
        style({ opacity: 0 }),
        animate('300ms ease-in')
      ])
    ]),
    trigger('newMessageFade', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      state('none', style({ opacity: 1, transform: 'translateY(0)' })), // No animation state
      transition('void => in', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-in')
      ]),
      transition('void => none', [
        style({ opacity: 1 }) // Immediately visible, no animation
      ])
    ])
  ]
})
export class ChatSidebarComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input() noteContent: string = '';
  @Input() noteId: string = '';
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  message: string = '';
  messages: ChatMessage[] = [];
  isLoading: boolean = false;
  isOpen: boolean = false;
  messagesLoading: boolean = false;
  isDeleting: boolean = false;
  fadeState: string = 'in';
  lastMessageId: string = ''; // Track the last message ID for animation
  shouldScrollToBottom: boolean = false;
  
  
  // Temporary message display for better UX
  pendingUserMessage: ChatMessage | null = null;
  
  private loadingSubscription: Subscription | null = null;
  private checkMessagesInterval: any = null;

  constructor(
    private chatService: ChatService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Subscribe to the message loading state
    this.loadingSubscription = this.chatService.messagesLoading$.subscribe(loading => {
      console.log('Messages loading state changed:', loading);
      this.messagesLoading = loading;
      if (!loading) {
        // Load messages when loading completes
        setTimeout(() => {
          this.loadMessages();
          this.shouldScrollToBottom = true;
        }, 50);
      }
    });
    
    // Load messages immediately if they're already loaded
    if (this.chatService.areMessagesLoaded()) {
      this.loadMessages();
      this.shouldScrollToBottom = true;
    }
    
    // Set up an interval to check for messages until they're loaded
    this.checkMessagesInterval = setInterval(() => {
      if (this.chatService.areMessagesLoaded()) {
        this.loadMessages();
        this.shouldScrollToBottom = true;
        clearInterval(this.checkMessagesInterval);
        this.checkMessagesInterval = null;
      }
    }, 500);
  }
  
  ngAfterViewChecked() {
    // Scroll to bottom if needed
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
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
      this.shouldScrollToBottom = true;
    }
  }
  
  private loadMessages(): void {
    // Load messages specific to this note
    const newMessages = this.chatService.getMessages(this.noteId);
    console.log(`Loading messages for noteId ${this.noteId}:`, newMessages.length, 'messages');
    
    this.messages = newMessages;
    
    // Clear pending message if it's now in the loaded messages
    if (this.pendingUserMessage) {
      const messageExists = this.messages.some(msg => 
        msg.isUser && 
        msg.content === this.pendingUserMessage?.content
      );
      
      if (messageExists) {
        console.log('Clearing pending message as it now exists in loaded messages');
        this.pendingUserMessage = null;
      }
    }
    
    
    // Set the last message ID if there are messages
    if (this.messages.length > 0) {
      // Generate a unique ID based on content and timestamp if not already present
      const lastMsg = this.messages[this.messages.length - 1];
      this.lastMessageId = this.getMessageId(lastMsg);
    }
  }

  // Generate a unique ID for a message
  getMessageId(msg: ChatMessage): string {
    return `${msg.isUser ? 'user' : 'ai'}-${msg.content.substring(0, 10)}-${msg.timestamp.getTime()}`;
  }

  // Check if a message is the last one added
  isNewMessage(msg: ChatMessage): boolean {
    const msgId = this.getMessageId(msg);
    return msgId === this.lastMessageId && !this.isDeleting;
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
    if (this.isOpen) {
      // When opening the sidebar, scroll to the bottom after a short delay
      setTimeout(() => {
        this.shouldScrollToBottom = true;
      }, 100);
    }
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
    
    // Set this as the last message ID for animation
    this.lastMessageId = this.getMessageId(this.pendingUserMessage);
    
    // Reset fade state to ensure animation works for new messages
    this.fadeState = 'in';
    
    // Set flag to scroll to bottom after view is updated
    this.shouldScrollToBottom = true;
    
    
    // If there's note content, add context to the message for the AI
    // but we'll send a special flag to the backend to indicate this is a contextualized message
    let contextMessage = userMessage;
    let hasNoteContext = false;
    
    if (this.noteContent) {
      contextMessage = `Note content: "${this.noteContent.substring(0, 500)}${this.noteContent.length > 500 ? '...' : ''}"
      
My question: ${userMessage}`;
      hasNoteContext = true;
    }
    
    // Clear input
    this.message = '';
    
    // Send message to service with noteId and context flag
    this.chatService.sendMessage(
      contextMessage, 
      this.noteId, 
      userMessage, 
      hasNoteContext
    ).subscribe({
      next: () => {
        // Clear the pending message as it should now be in the real messages
        this.pendingUserMessage = null;
        
        // Messages will be loaded from the API automatically via the service
        // But let's also trigger a manual load after a short delay to ensure we get the latest
        setTimeout(() => {
          this.loadMessages();
          this.shouldScrollToBottom = true;
        }, 200);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.isLoading = false;
        
        // Clear the pending message on error
        this.pendingUserMessage = null;
        
        // Show error message to user
        alert('Error sending message. Please try again later.');
      }
    });
  }

  clearChat(): void {
    // Open confirmation dialog
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '300px',
      panelClass: 'app-themed-dialog',
      backdropClass: 'app-dialog-backdrop'
    });
    
    // Handle dialog close
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Set deleting flag and fade state to trigger animation
        this.isDeleting = true;
        this.fadeState = 'out';
        
        // Wait for animation to complete before actually clearing
        setTimeout(() => {
          // User confirmed deletion
          // Clear pending message
          this.pendingUserMessage = null;
          
          // Clear chat for this specific note
          this.chatService.clearChat(this.noteId);
          
          // Reload messages after clearing
          this.loadMessages();
          
          // Reset states
          this.isDeleting = false;
          this.fadeState = 'in';
        }, 400); // Match animation duration
      }
    });
  }
}
