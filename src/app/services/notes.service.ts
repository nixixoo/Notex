import { Injectable, Inject } from "@angular/core"
import { BehaviorSubject, type Observable, from, of } from "rxjs"
import { map, catchError, tap } from "rxjs/operators"
import type { Note, CreateNoteRequest, UpdateNoteRequest } from "../models/note.model"
import { AuthService } from "./auth.service"
import { ApiService } from "./api.service"

@Injectable({
  providedIn: "root",
})
export class NotesService {
  private readonly LOCAL_STORAGE_KEY = "guest_notes"
  private readonly GUEST_USER_ID = "guest"
  
  private notesSubject = new BehaviorSubject<Note[]>([])
  public notes$ = this.notesSubject.asObservable();

  constructor(
    @Inject(AuthService) private authService: AuthService,
    private apiService: ApiService
  ) {
    // Initialize notes based on auth state
    this.authService.user$.subscribe(user => {
      if (user) {
        this.loadNotes('active');
      } else if (this.authService.isGuestMode()) {
        this.notesSubject.next(this.getLocalNotes());
      } else {
        this.notesSubject.next([]);
      }
    });
  }

  getLocalNotes(): Note[] {
    const notes = localStorage.getItem(this.LOCAL_STORAGE_KEY)
    return notes ? JSON.parse(notes) : []
  }

  saveLocalNotes(notes: Note[]): void {
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(notes))
  }

  getNotes(status: "active" | "archived" | "trashed" = "active"): Observable<Note[]> {
    if (this.authService.isGuestMode()) {
      // For guest mode, filter notes from local storage
      const notes = this.getLocalNotes().filter(note => 
        (note.status === status || !note.status && status === 'active') && 
        (!note.groupId)
      );
      return of(notes);
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, get notes from API
      return this.apiService.get<Note[]>(`notes?status=${status}`).pipe(
        tap(notes => {
          if (status === 'active') {
            this.notesSubject.next(notes);
          }
        }),
        catchError(error => {
          console.error('Error fetching notes:', error);
          return of([]);
        })
      );
    }
    return of([]);
  }

  getNotesCount(): Observable<{ active: number; archived: number; trashed: number }> {
    if (this.authService.isGuestMode()) {
      // For guest mode, count notes from local storage
      const notes = this.getLocalNotes();
      const active = notes.filter(n => (!n.status || n.status === 'active') && !n.groupId).length;
      const archived = notes.filter(n => n.status === 'archived').length;
      const trashed = notes.filter(n => n.status === 'trashed').length;
      return of({ active, archived, trashed });
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, get counts from API
      return this.apiService.get<{ active: number; archived: number; trashed: number }>('notes/counts');
    }
    return of({ active: 0, archived: 0, trashed: 0 });
  }

  getNoteById(id: string): Observable<Note | null> {
    if (this.authService.isGuestMode()) {
      // For guest mode, find note in local storage
      const notes = this.getLocalNotes();
      const note = notes.find(n => n.id === id) || null;
      return of(note);
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, get note from API
      return this.apiService.get<Note>(`notes/${id}`).pipe(
        catchError(error => {
          console.error('Error fetching note:', error);
          return of(null);
        })
      );
    }
    return of(null);
  }

  createNote(noteData: CreateNoteRequest): Observable<Note> {
    if (this.authService.isGuestMode()) {
      // For guest mode, create note in local storage
      const notes = this.getLocalNotes();
      const newNote: Note = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        title: noteData.title,
        subtitle: noteData.subtitle,
        content: noteData.content || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.GUEST_USER_ID,
        isLocal: true,
        status: 'active',
        groupId: noteData.groupId,
        color: noteData.color
      };
      
      notes.push(newNote);
      this.saveLocalNotes(notes);
      this.loadNotes('active');
      return of(newNote);
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, create note via API
      return this.apiService.post<Note>('notes', noteData).pipe(
        tap(() => this.loadNotes('active')),
        catchError(error => {
          console.error('Error creating note:', error);
          throw error;
        })
      );
    }
    throw new Error('User must be logged in or in guest mode to create notes');
  }

  updateNote(id: string, updateData: UpdateNoteRequest): Observable<Note | null> {
    if (this.authService.isGuestMode()) {
      // For guest mode, update note in local storage
      const notes = this.getLocalNotes();
      const index = notes.findIndex(n => n.id === id);
      
      if (index === -1) return of(null);
      
      const updatedNote = { ...notes[index], ...updateData, updatedAt: new Date() };
      notes[index] = updatedNote;
      
      this.saveLocalNotes(notes);
      this.loadNotes('active');
      return of(updatedNote);
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, update note via API
      return this.apiService.put<Note>(`notes/${id}`, updateData).pipe(
        tap(() => this.loadNotes('active')),
        catchError(error => {
          console.error('Error updating note:', error);
          return of(null);
        })
      );
    }
    return of(null);
  }

  deleteNote(id: string): Observable<boolean> {
    if (this.authService.isGuestMode()) {
      // For guest mode, delete note from local storage
      const notes = this.getLocalNotes();
      const filteredNotes = notes.filter(n => n.id !== id);
      
      if (filteredNotes.length === notes.length) return of(false);
      
      this.saveLocalNotes(filteredNotes);
      this.loadNotes('active');
      return of(true);
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, delete note via API
      return this.apiService.delete<{message: string}>(`notes/${id}`).pipe(
        map(() => true),
        tap(() => this.loadNotes('active')),
        catchError(error => {
          console.error('Error deleting note:', error);
          return of(false);
        })
      );
    }
    return of(false);
  }

  getNotesByGroup(groupId: string): Observable<Note[]> {
    if (this.authService.isGuestMode()) {
      // For guest mode, filter notes from local storage
      const notes = this.getLocalNotes().filter(note => note.groupId === groupId);
      return of(notes);
    } else if (this.authService.isLoggedIn()) {
      // For authenticated users, get notes from API
      return this.apiService.get<Note[]>(`notes/group/${groupId}`);
    }
    return of([]);
  }

  // Note status management methods
  archiveNote(id: string): Observable<Note | null> {
    return this.updateNote(id, { status: 'archived' });
  }

  trashNote(id: string): Observable<Note | null> {
    return this.updateNote(id, { status: 'trashed' });
  }

  restoreNote(id: string): Observable<Note | null> {
    return this.updateNote(id, { status: 'active' });
  }

  private loadNotes(status: "active" | "archived" | "trashed" = "active"): void {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes().filter(note => 
        (note.status === status || !note.status && status === 'active') && 
        (!note.groupId)
      );
      this.notesSubject.next(notes);
    } else if (this.authService.isLoggedIn()) {
      this.apiService.get<Note[]>(`notes?status=${status}`).subscribe({
        next: (notes) => this.notesSubject.next(notes),
        error: (error) => {
          console.error('Error loading notes:', error);
          this.notesSubject.next([]);
        }
      });
    } else {
      this.notesSubject.next([]);
    }
  }
}
