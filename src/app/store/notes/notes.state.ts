import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Note } from '../../models/note.model';

export interface NotesState extends EntityState<Note> {
  selectedNoteId: string | null;
  searchTerm: string;
  filter: {
    status: 'active' | 'archived' | 'trashed' | 'all';
    groupId: string | null;
    color: string | null;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const notesAdapter: EntityAdapter<Note> = createEntityAdapter<Note>({
  selectId: (note: Note) => note.id,
  sortComparer: (a: Note, b: Note) => {
    // Sort by updatedAt descending
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }
});

export const initialNotesState: NotesState = notesAdapter.getInitialState({
  selectedNoteId: null,
  searchTerm: '',
  filter: {
    status: 'active' as const,
    groupId: null,
    color: null,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  lastUpdated: null,
});