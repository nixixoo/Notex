import { AuthState } from './auth/auth.state';
import { NotesState } from './notes/notes.state';
import { GroupsState } from './groups/groups.state';
import { ChatState } from './chat/chat.state';
import { UIState } from './ui/ui.state';

export interface AppState {
  auth: AuthState;
  notes: NotesState;
  groups: GroupsState;
  chat: ChatState;
  ui: UIState;
}