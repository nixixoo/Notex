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
  private readonly LOCAL_STORAGE_KEY = "guest_notes"
  private readonly GUEST_USER_ID = "guest"
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
          status TEXT DEFAULT 'active',
          groupId TEXT,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log("Database initialized successfully")
    } catch (error) {
      console.error("Error initializing database:", error)
    }
  }

  getLocalNotes(): Note[] {
    const notes = localStorage.getItem(this.LOCAL_STORAGE_KEY)
    return notes ? JSON.parse(notes) : []
  }

  private saveLocalNotes(notes: Note[]): void {
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(notes))
  }

  updateLocalNote(updatedNote: Note): void {
    const notes = this.getLocalNotes()
    const index = notes.findIndex((n) => n.id === updatedNote.id)
    if (index !== -1) {
      notes[index] = updatedNote
      this.saveLocalNotes(notes)
      this.notesSubject.next([
        ...notes.filter((n) => n.userId === this.GUEST_USER_ID),
        ...this.notesSubject.value.filter((n) => !n.isLocal),
      ])
    }
  }

  getNotes(status: "active" | "archived" | "trashed" = "active"): Observable<Note[]> {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes().filter(
        (note) => (note.status === status || (!note.status && status === "active")) && !note.groupId,
      )
      return of(notes)
    }

    if (this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUser()?.id
      if (!userId) return of([])

      return from(
        this.client.execute({
          sql: "SELECT * FROM notes WHERE userId = ? AND status = ? AND (groupId IS NULL OR groupId = '') ORDER BY updatedAt DESC",
          args: [userId, status],
        }),
      ).pipe(
        map((result) => this.mapNotes(result)),
        catchError((error) => {
          console.error("Error fetching notes:", error)
          throw error
        }),
      )
    } else {
      const notes = this.getLocalNotes()
        .filter((note) => (note.status === status || (!note.status && status === "active")) && !note.groupId)
        .map((note) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
          isLocal: true,
        }))
      return of(notes)
    }
  }

  getNoteById(id: string): Observable<Note> {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes()
      const localNote = notes.find((n) => n.id === id)
      if (localNote) {
        return of(localNote)
      }
      throw new Error("Note not found")
    }

    const userId = this.authService.getCurrentUser()?.id
    if (!userId) throw new Error("Not authenticated")

    return from(
      this.client.execute({
        sql: "SELECT * FROM notes WHERE id = ? AND userId = ?",
        args: [id, userId],
      }),
    ).pipe(
      map((result) => {
        if (result.rows.length === 0) throw new Error("Note not found")
        return this.mapNote(result.rows[0])
      }),
      catchError((error) => {
        console.error("Error fetching note:", error)
        throw error
      }),
    )
  }

  createNote(noteData: CreateNoteRequest): Observable<Note> {
    console.log("[NotesService] createNote triggered", {
      isAuthenticated: this.authService.isAuthenticated(),
      isGuest: this.authService.isGuestMode(),
    })

    // Guest Mode Flow
    if (this.authService.isGuestMode()) {
      console.log("[NotesService] Creating local guest note")
      const id = Date.now().toString()
      const newNote: Note = {
        id,
        title: noteData.title,
        subtitle: noteData.subtitle,
        content: noteData.content || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.GUEST_USER_ID,
        status: "active",
        isLocal: true,
        groupId: noteData.groupId
      }

      // Update local storage
      const notes = this.getLocalNotes()
      notes.unshift(newNote)
      this.saveLocalNotes(notes)

      // Update BehaviorSubject for immediate UI update
      this.notesSubject.next([newNote, ...this.notesSubject.value])

      return of(newNote)
    }

    // Authenticated User Flow
    if (this.authService.isAuthenticated()) {
      console.log("[NotesService] Creating cloud note")
      const currentUser = this.authService.getCurrentUser()

      if (!currentUser?.id) {
        console.error("[NotesService] No user ID found for authenticated user")
        throw new Error("User not authenticated")
      }

      const id = Date.now().toString()
      const now = new Date().toISOString()
      const newNote: Note = {
        id,
        title: noteData.title,
        subtitle: noteData.subtitle,
        content: noteData.content || "",
        createdAt: new Date(now),
        updatedAt: new Date(now),
        userId: currentUser.id,
        status: "active",
        groupId: noteData.groupId
      }

      return from(
        this.client.execute({
          sql: "INSERT INTO notes (id, title, subtitle, content, createdAt, updatedAt, userId, status, groupId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [id, noteData.title, noteData.subtitle, newNote.content, now, now, currentUser.id, "active", noteData.groupId || null],
        }),
      ).pipe(
        map(() => {
          const currentNotes = this.notesSubject.value
          this.notesSubject.next([newNote, ...currentNotes])
          return newNote
        }),
        catchError((error) => {
          console.error("Error creating note:", error)
          throw error
        }),
      )
    }

    // Error if neither authenticated nor in guest mode
    console.error("[NotesService] No valid authentication method")
    throw new Error("Please login or continue as guest")
  }

  updateNote(id: string, noteData: UpdateNoteRequest): Observable<Note> {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes()
      const noteIndex = notes.findIndex((n) => n.id === id)

      if (noteIndex === -1) {
        return of().pipe(
          catchError(() => {
            throw new Error("Note not found")
          }),
        )
      }

      const updatedNote: Note = {
        ...notes[noteIndex],
        ...noteData,
        updatedAt: new Date(),
      }

      notes[noteIndex] = updatedNote
      this.saveLocalNotes(notes)

      // Update BehaviorSubject
      const currentNotes = this.notesSubject.value
      const updatedNotes = currentNotes.map((note) => (note.id === id ? updatedNote : note))
      this.notesSubject.next(updatedNotes)

      return of(updatedNote)
    }

    const userId = this.authService.getCurrentUser()?.id
    if (!userId) throw new Error("Not authenticated")
    const updatedAt = new Date()

    // Build the SQL query dynamically based on what fields are provided
    let sql = `UPDATE notes SET updatedAt = ?`
    const args: any[] = [updatedAt.toISOString()]

    if (noteData.title !== undefined) {
      sql += `, title = ?`
      args.push(noteData.title)
    }

    if (noteData.subtitle !== undefined) {
      sql += `, subtitle = ?`
      args.push(noteData.subtitle)
    }

    if (noteData.content !== undefined) {
      sql += `, content = ?`
      args.push(noteData.content)
    }

    if (noteData.status !== undefined) {
      sql += `, status = ?`
      args.push(noteData.status)
    }

    if (noteData.groupId !== undefined) {
      sql += `, groupId = ?`
      args.push(noteData.groupId || null)
    }

    sql += ` WHERE id = ? AND userId = ?`
    args.push(id, userId)

    return from(
      this.client.execute({
        sql,
        args,
      }),
    ).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value
        const existingNoteIndex = currentNotes.findIndex((note) => note.id === id)
        
        if (existingNoteIndex === -1) {
          console.warn('Note not found in local state - may have been filtered')
          return {} as Note // Return empty object, will be filtered later
        }
      
        const updatedNote: Note = {
          ...currentNotes[existingNoteIndex],
          ...(noteData.title !== undefined && { title: noteData.title }),
          ...(noteData.subtitle !== undefined && { subtitle: noteData.subtitle }),
          ...(noteData.content !== undefined && { content: noteData.content }),
          ...(noteData.status !== undefined && { status: noteData.status }),
          ...(noteData.groupId !== undefined && { groupId: noteData.groupId }),
          updatedAt,
        }
      
        const updatedNotes = [...currentNotes]
        updatedNotes[existingNoteIndex] = updatedNote
        this.notesSubject.next(updatedNotes)
        return updatedNote
      }),
      catchError((error) => {
        console.error("Error updating note:", error)
        throw error
      }),
    )
  }

  archiveNote(id: string): Observable<Note> {
    return this.updateNote(id, { status: "archived" })
  }

  trashNote(id: string): Observable<Note> {
    return this.updateNote(id, { status: "trashed" })
  }

  restoreNote(id: string): Observable<Note> {
    return this.updateNote(id, { status: "active" })
  }

  deleteLocalNote(noteId: string): void {
    const notes = this.getLocalNotes()
    const filteredNotes = notes.filter((n) => n.id !== noteId)
    this.saveLocalNotes(filteredNotes)
    this.notesSubject.next([...filteredNotes, ...this.notesSubject.value.filter((n) => !n.isLocal)])
  }

  deleteNote(id: string): Observable<void> {
    if (this.authService.isGuestMode()) {
      this.deleteLocalNote(id)
      return of(void 0)
    }

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
      status: ((row["status"] as string) || "active") as "active" | "archived" | "trashed",
      groupId: (row["groupId"] as string) || undefined,
    }
  }

  getNotesCount(): Observable<{ active: number; archived: number; trashed: number }> {
    if (this.authService.isGuestMode()) {
      const notes = this.getLocalNotes()
      const counts = {
        active: notes.filter((n) => (n.status === "active" || !n.status) && !n.groupId).length,
        archived: notes.filter((n) => n.status === "archived" && !n.groupId).length,
        trashed: notes.filter((n) => n.status === "trashed" && !n.groupId).length,
      }
      return of(counts)
    }

    if (this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUser()?.id
      if (!userId) return of({ active: 0, archived: 0, trashed: 0 })

      return from(
        this.client.execute({
          sql: `
          SELECT status, COUNT(*) as count 
          FROM notes 
          WHERE userId = ? AND (groupId IS NULL OR groupId = '')
          GROUP BY status
          `,
          args: [userId],
        }),
      ).pipe(
        map((result) => {
          const counts = {
            active: 0,
            archived: 0,
            trashed: 0,
          }

          result.rows.forEach((row) => {
            const status = (row["status"] as string) || "active"
            counts[status as keyof typeof counts] = Number(row["count"])
          })

          return counts
        }),
        catchError((error) => {
          console.error("Error getting notes count:", error)
          return of({ active: 0, archived: 0, trashed: 0 })
        }),
      )
    }

    return of({ active: 0, archived: 0, trashed: 0 })
  }
}
