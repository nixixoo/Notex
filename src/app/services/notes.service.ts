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

  getNotes(): Observable<Note[]> {
    const userId = this.authService.getCurrentUser()?.id
    if (!userId) return of([])

    return from(
      this.client.execute({
        sql: "SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC",
        args: [userId],
      }),
    ).pipe(
      map((result) => this.mapNotes(result)),
      catchError((error) => {
        console.error("Error fetching notes:", error)
        throw error
      }),
    )
  }

  getNoteById(id: string): Observable<Note> {
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
    const currentUser = this.authService.getCurrentUser()
    if (!currentUser?.id) throw new Error("User not authenticated")

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
    }

    return from(
      this.client.execute({
        sql: "INSERT INTO notes (id, title, subtitle, content, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [id, noteData.title, noteData.subtitle, newNote.content, now, now, currentUser.id],
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

