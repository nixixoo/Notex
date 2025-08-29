import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  noteId?: string;
  language?: 'en' | 'es';
}

export interface ChatState extends EntityState<ChatMessage> {
  activeNoteId: string | null;
  isTyping: boolean;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  lastActivity: Date | null;
  settings: {
    language: 'auto' | 'en' | 'es';
    saveHistory: boolean;
    autoScroll: boolean;
  };
}

export const chatAdapter: EntityAdapter<ChatMessage> = createEntityAdapter<ChatMessage>({
  selectId: (message: ChatMessage) => message.id,
  sortComparer: (a: ChatMessage, b: ChatMessage) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
});

export const initialChatState: ChatState = chatAdapter.getInitialState({
  activeNoteId: null,
  isTyping: false,
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',
  lastActivity: null,
  settings: {
    language: 'auto',
    saveHistory: true,
    autoScroll: true,
  },
});