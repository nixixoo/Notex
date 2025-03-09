import { Injectable, Inject } from "@angular/core"
import { BehaviorSubject, type Observable, from, of } from "rxjs"
import { map, catchError } from "rxjs/operators"
import { createClient, type ResultSet, type Row } from "@libsql/client"
import type { Note, CreateNoteRequest, UpdateNoteRequest } from "../models/note.model"
import { AuthService } from "./auth.service"

@Injectable({
  providedIn: "root",
})
export class NotesService {
  private readonly LOCAL_STORAGE_KEY = 'guest_notes';
  private readonly GUEST_USER_ID = 'guest';
  private client = createClient({
    url: "libsql://notex-nixixo.turso.io",
    authToken:
      "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDEyMzAzNDMsImlkIjoiZGE3MjczNmUtMGY3OC00YzVkLTlkMTYtZGQ4ZTg4OWM2ZWZjIn0.WG8YgocNf2Vbugg_6jVZi09dXnGqjqJ1NFrmAkmEpMCT-DdgM2V2rr_IlvBLc2YpOhChu2FrXUrjXizFdpw7Bg",
  })

  private notesSubject = new BehaviorSubject<Note[]>([])
  public notes$ = this.notesSubject.asObservable();

  constructor(@Inject(AuthService) private authService: AuthService) {
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          subtitle TEXT NOT NULL,
          content TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log("Database initialized successfully")
    } catch (error) {
      console.error("Error initializing database:", error)
    }
  }

  getLocalNotes(): Note[] {
    const notes = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    return notes ? JSON.parse(notes) : [];
  }
  
  
  private saveLocalNotes(notes: Note[]): void {
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(notes));
  }

  updateLocalNote(updatedNote: Note): void {
    const notes = this.getLocalNotes();
    const index = notes.findIndex(n => n.id === updatedNote.id);
    if (index !== -1) {
      notes[index] = updatedNote;
      this.saveLocalNotes(notes);
      this.notesSubject.next([
        ...notes.filter(n => n.userId === this.GUEST_USER_ID),
        ...this.notesSubject.value.filter(n => !n.isLocal)
      ]);
    }
  }
  getNotes(): Observable<Note[]> {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes();
      return of(notes);
    }
    if (this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUser()?.id;
      if (!userId) return of([]);
      
      return from(this.client.execute({
        sql: "SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC",
        args: [userId],
      })).pipe(
        map((result) => this.mapNotes(result)),
        catchError((error) => {
          console.error("Error fetching notes:", error);
          throw error;
        }),
      );
    }
    else {
      const notes = this.getLocalNotes().map(note => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        isLocal: true
      }));
      return of(notes);
    }
  }

  getNoteById(id: string): Observable<Note> {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes();
      const localNote = notes.find(n => n.id === id);
      if (localNote) {
        return of(localNote);
      }
      throw new Error('Note not found');
    }
  
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) throw new Error("Not authenticated");
  
    return from(
      this.client.execute({
        sql: "SELECT * FROM notes WHERE id = ? AND userId = ?",
        args: [id, userId],
      }),
    ).pipe(
      map((result) => {
        if (result.rows.length === 0) throw new Error("Note not found");
        return this.mapNote(result.rows[0]);
      }),
      catchError((error) => {
        console.error("Error fetching note:", error);
        throw error;
      }),
    );
  }

  createNote(noteData: CreateNoteRequest): Observable<Note> {
    console.log('[NotesService] createNote triggered', {
      isAuthenticated: this.authService.isAuthenticated(),
      isGuest: this.authService.isGuestMode()
    });
  
    // Guest Mode Flow
    if (this.authService.isGuestMode()) {
      console.log('[NotesService] Creating local guest note');
      const id = Date.now().toString();
      const newNote: Note = {
        id,
        title: noteData.title,
        subtitle: noteData.subtitle,
        content: noteData.content || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.GUEST_USER_ID,
        isLocal: true
      };
  
      // Update local storage
      const notes = this.getLocalNotes();
      notes.unshift(newNote);
      this.saveLocalNotes(notes);
      
      // Update BehaviorSubject for immediate UI update
      this.notesSubject.next([newNote, ...this.notesSubject.value]);
      
      return of(newNote);
    }
  
    // Authenticated User Flow
    if (this.authService.isAuthenticated()) {
      console.log('[NotesService] Creating cloud note');
      const currentUser = this.authService.getCurrentUser();
      
      if (!currentUser?.id) {
        console.error('[NotesService] No user ID found for authenticated user');
        throw new Error('User not authenticated');
      }
  
      const id = Date.now().toString();
      const now = new Date().toISOString();
      const newNote: Note = {
        id,
        title: noteData.title,
        subtitle: noteData.subtitle,
        content: noteData.content || '',
        createdAt: new Date(now),
        updatedAt: new Date(now),
        userId: currentUser.id
      };
  
      return from(
        this.client.execute({
          sql: 'INSERT INTO notes (id, title, subtitle, content, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [
            id,
            noteData.title,
            noteData.subtitle,
            newNote.content,
            now,
            now,
            currentUser.id
          ]
        })
      ).pipe(
        map(() => {
          const currentNotes = this.notesSubject.value;
          this.notesSubject.next([newNote, ...currentNotes]);
          return newNote;
        }),
        catchError((error) => {
          console.error('Error creating note:', error);
          throw error;
        })
      );
    }
  
    // Error if neither authenticated nor in guest mode
    console.error('[NotesService] No valid authentication method');
    throw new Error('Please login or continue as guest');
  }

  updateNote(id: string, noteData: UpdateNoteRequest): Observable<Note> {
    const userId = this.authService.getCurrentUser()?.id
    if (!userId) throw new Error("Not authenticated")
    const updatedAt = new Date()

    return from(
      this.client.execute({
        sql: `UPDATE notes 
            SET title = ?, subtitle = ?, content = ?, updatedAt = ? 
            WHERE id = ? AND userId = ?`,
        args: [
          noteData.title ?? null,
          noteData.subtitle ?? null,
          noteData.content ?? null,
          updatedAt.toISOString(),
          id,
          userId,
        ],
      }),
    ).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value
        const existingNote = currentNotes.find((note) => note.id === id)
        if (!existingNote) throw new Error("Note not found")

        const updatedNote: Note = {
          ...existingNote,
          title: noteData.title ?? existingNote.title,
          subtitle: noteData.subtitle ?? existingNote.subtitle,
          content: noteData.content ?? existingNote.content,
          updatedAt,
        }

        const updatedNotes = currentNotes.map((note) => (note.id === id ? updatedNote : note))
        this.notesSubject.next(updatedNotes)
        return updatedNote
      }),
      catchError((error) => {
        console.error("Error updating note:", error)
        throw error
      }),
    )
  }

  deleteLocalNote(noteId: string): void {
    const notes = this.getLocalNotes();
    const filteredNotes = notes.filter(n => n.id !== noteId);
    this.saveLocalNotes(filteredNotes);
    this.notesSubject.next([
      ...filteredNotes,
      ...this.notesSubject.value.filter(n => !n.isLocal)
    ]);
  }

  deleteNote(id: string): Observable<void> {
    const userId = this.authService.getCurrentUser()?.id
    if (!userId) throw new Error("Not authenticated")

    return from(
      this.client.execute({
        sql: "DELETE FROM notes WHERE id = ? AND userId = ?",
        args: [id, userId],
      }),
    ).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value
        const updatedNotes = currentNotes.filter((note) => note.id !== id)
        this.notesSubject.next(updatedNotes)
      }),
      catchError((error) => {
        console.error("Error deleting note:", error)
        throw error
      }),
    )
  }

  private mapNotes(result: ResultSet): Note[] {
    return result.rows.map((row) => this.mapNote(row))
  }

  private mapNote(row: Row): Note {
    return {
      id: row["id"] as string,
      title: row["title"] as string,
      subtitle: row["subtitle"] as string,
      content: row["content"] as string,
      createdAt: new Date(row["createdAt"] as string),
      updatedAt: new Date(row["updatedAt"] as string),
      userId: row["userId"] as string,
    }
  }
}

