import { Injectable } from '@angular/core';
import { Observable, tap, catchError, of, throwError, Subject, BehaviorSubject, map } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  noteId?: string;
  id?: string;
}

export interface ChatResponse {
  message: string;
  userId: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  data: {
    messages: {
      id: string;
      content: string;
      isUser: boolean;
      timestamp: string;
      noteId: string;
      userId: string;
    }[];
  };
}

const CHAT_STORAGE_KEY = 'notex_chat_messages';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Store messages by noteId
  private messagesByNoteId: { [noteId: string]: ChatMessage[] } = {};
  
  
  // Default messages for when no noteId is provided
  private defaultMessages: ChatMessage[] = [];
  
  // Message loading status
  private messagesLoaded = false;
  private messagesLoadingSubject = new BehaviorSubject<boolean>(false);
  public messagesLoading$ = this.messagesLoadingSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    // Load messages from storage or API on service initialization
    this.loadMessages();
  }

  // Load messages from localStorage or API
  private loadMessages(): void {
    this.messagesLoadingSubject.next(true);
    
    if (this.authService.isAuthenticated()) {
      // For authenticated users, load from API
      this.loadMessagesFromApi();
    } else {
      // For guest users, load from localStorage
      this.loadMessagesFromStorage();
      this.messagesLoaded = true;
      this.messagesLoadingSubject.next(false);
    }
  }


  // Load messages from API for authenticated users
  private loadMessagesFromApi(): void {
    this.apiService.get<ChatHistoryResponse>('chat/history')
      .pipe(
        catchError(error => {
          console.error('Error loading chat messages from API:', error);
          // Fall back to localStorage if API fails
          this.loadMessagesFromStorage();
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.data && response.data.messages) {
          // Clear existing messages
          this.messagesByNoteId = {};
          
          // Group messages by noteId
          response.data.messages.forEach(msg => {
            const noteId = msg.noteId || 'default';
            
            if (!this.messagesByNoteId[noteId]) {
              this.messagesByNoteId[noteId] = [];
            }
            
            this.messagesByNoteId[noteId].push({
              id: msg.id,
              content: msg.content,
              isUser: msg.isUser,
              timestamp: new Date(msg.timestamp),
              noteId: msg.noteId
            });
          });
          console.log('Loaded messages from API:', Object.keys(this.messagesByNoteId).length, 'notes with messages');
        } else {
          console.warn('API response missing data.messages array:', response);
        }
        
        this.messagesLoaded = true;
        this.messagesLoadingSubject.next(false);
      });
  }

  // Load messages from localStorage for guest users
  private loadMessagesFromStorage(): void {
    const storedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
    if (storedMessages) {
      try {
        const parsedData = JSON.parse(storedMessages);
        
        // Convert string dates back to Date objects
        if (parsedData.messagesByNoteId) {
          Object.keys(parsedData.messagesByNoteId).forEach(noteId => {
            this.messagesByNoteId[noteId] = parsedData.messagesByNoteId[noteId].map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          });
        }
        
        if (parsedData.defaultMessages) {
          this.defaultMessages = parsedData.defaultMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
      } catch (error) {
        console.error('Error loading chat messages from storage:', error);
      }
    }
  }

  // Save messages to localStorage (for guest users)
  private saveMessagesToStorage(): void {
    if (!this.authService.isAuthenticated()) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
          messagesByNoteId: this.messagesByNoteId,
          defaultMessages: this.defaultMessages
        }));
      } catch (error) {
        console.error('Error saving chat messages to storage:', error);
      }
    }
  }

  // Get messages for a specific note
  getMessages(noteId?: string): ChatMessage[] {
    if (!this.messagesLoaded) {
      // If messages aren't loaded yet, return an empty array
      // The component will update when messages are loaded
      return [];
    }
    
    if (!noteId) {
      return this.defaultMessages;
    }
    
    // Initialize messages array for this note if it doesn't exist
    if (!this.messagesByNoteId[noteId]) {
      this.messagesByNoteId[noteId] = [];
    }
    
    return this.messagesByNoteId[noteId];
  }

  // Check if messages are loaded
  areMessagesLoaded(): boolean {
    return this.messagesLoaded;
  }

  /**
   * Sends a user message to the chat API and retrieves the AI response.
   * 
   * @param content The user message content.
   * @param noteId The ID of the note associated with the message (optional).
   * @param originalMessage The original user message without note context (optional).
   * @param hasNoteContext Flag indicating if the message includes note context (optional).
   * 
   * @returns An observable of the chat response from the API.
   */
  sendMessage(
    content: string, 
    noteId?: string, 
    originalMessage?: string, 
    hasNoteContext?: boolean
  ): Observable<ChatResponse> {
    // Determine what message to display to the user
    // If we have context, show the original message, otherwise show the content
    const displayMessage = (hasNoteContext && originalMessage) ? originalMessage : content;
    
    // Add user message immediately to chat history for both authenticated and guest users
    this.addMessage(displayMessage, true, new Date(), noteId);
    
    // Choose endpoint based on authentication status
    if (this.authService.isAuthenticated()) {
      return this.sendAuthenticatedMessage(content, noteId, originalMessage, hasNoteContext);
    } else {
      return this.sendGuestMessage(content, noteId, originalMessage, hasNoteContext);
    }
  }

  /**
   * Send message for authenticated users (with database storage)
   */
  private sendAuthenticatedMessage(
    content: string, 
    noteId?: string, 
    originalMessage?: string, 
    hasNoteContext?: boolean
  ): Observable<ChatResponse> {
    const payload = { 
      message: content,
      noteId: noteId,
      originalMessage: originalMessage,
      hasNoteContext: hasNoteContext
    };
    
    return this.apiService.post<ChatResponse>('chat/message', payload).pipe(
      tap((response) => {
        // After receiving a successful response, reload messages from the API to get both
        // the user message and AI response that were saved by the backend
        this.messagesLoadingSubject.next(true);
        setTimeout(() => {
          this.loadMessagesFromApi();
        }, 100); // Small delay to ensure backend has processed the response
      })
    );
  }

  /**
   * Send message for guest users (localStorage only)
   */
  private sendGuestMessage(
    content: string, 
    noteId?: string, 
    originalMessage?: string, 
    hasNoteContext?: boolean
  ): Observable<ChatResponse> {
    const payload = { 
      message: content,
      noteId: noteId,
      originalMessage: originalMessage,
      hasNoteContext: hasNoteContext
    };
    
    return this.apiService.post<any>('guest-chat/message', payload).pipe(
      map(response => ({
        message: response.data.message,
        userId: 'guest',
        timestamp: response.data.timestamp
      })),
      tap((response) => {
        // Add AI response to local storage
        this.addMessage(response.message, false, new Date(response.timestamp), noteId);
      })
    );
  }

  // Add a message to the chat history
  addMessage(content: string, isUser: boolean, timestamp: Date = new Date(), noteId?: string): void {
    const message: ChatMessage = {
      content,
      isUser,
      timestamp,
      noteId
    };
    
    // Add to local cache
    if (!noteId) {
      this.defaultMessages.push(message);
    } else {
      // Initialize messages array for this note if it doesn't exist
      if (!this.messagesByNoteId[noteId]) {
        this.messagesByNoteId[noteId] = [];
      }
      
      this.messagesByNoteId[noteId].push(message);
    }
    
    // Save to localStorage for guest users
    this.saveMessagesToStorage();
    
    // Save to database for authenticated users
    if (this.authService.isAuthenticated()) {
      this.apiService.post('chat/save', {
        content: message.content,
        isUser: message.isUser,
        timestamp: message.timestamp.toISOString(),
        noteId: message.noteId
      }).pipe(
        catchError(error => {
          console.error('Error saving chat message to API:', error);
          return throwError(() => error);
        })
      ).subscribe();
    }
  }

  // Clear chat history for a specific note
  clearChat(noteId?: string): void {
    if (!noteId) {
      this.defaultMessages = [];
    } else {
      this.messagesByNoteId[noteId] = [];
    }
    
    // Save to localStorage for guest users
    this.saveMessagesToStorage();
    
    // Clear from database for authenticated users
    if (this.authService.isAuthenticated()) {
      this.apiService.post('chat/clear', {
        noteId: noteId
      }).pipe(
        catchError(error => {
          console.error('Error clearing chat history from API:', error);
          return throwError(() => error);
        })
      ).subscribe();
    }
  }
}
