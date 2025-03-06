import { Injectable } from "@angular/core"
import { BehaviorSubject, type Observable, from } from "rxjs"
import { map, catchError } from "rxjs/operators"
import { createClient } from "@libsql/client"
import type { Note, CreateNoteRequest, UpdateNoteRequest } from "../models/note.model"

@Injectable({
  providedIn: "root",
})
export class NotesService {
  private client = createClient({
    url: "libsql://notex-nixixo.turso.io",
    authToken:
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDEyMzAzNDMsImlkIjoiZGE3MjczNmUtMGY3OC00YzVkLTlkMTYtZGQ4ZTg4OWM2ZWZjIn0.WG8YgocNf2Vbugg_6jVZi09dXnGqjqJ1NFrmAkmEpMCT-DdgM2V2rr_IlvBLc2YpOhChu2FrXUrjXizFdpw7Bg"
  })

  private notesSubject = new BehaviorSubject<Note[]>([])
  public notes$ = this.notesSubject.asObservable()

  constructor() {
    this.initDatabase()
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
          userId TEXT NOT NULL
        )
      `)
      console.log("Database initialized successfully")
    } catch (error) {
      console.error("Error initializing database:", error)
    }
  }

  getNotes(): Observable<Note[]> {
    console.log("Fetching notes...")
    return from(this.client.execute("SELECT * FROM notes ORDER BY updatedAt DESC")).pipe(
      map((result) => {
        console.log("Raw result:", result)
        const notes = result.rows.map((row) => ({
          id: row["id"] as string,
          title: row["title"] as string,
          subtitle: row["subtitle"] as string,
          content: row["content"] as string,
          createdAt: new Date(row["createdAt"] as string),
          updatedAt: new Date(row["updatedAt"] as string),
          userId: row["userId"] as string,
        }))
        console.log("Parsed notes:", notes)
        this.notesSubject.next(notes)
        return notes
      }),
      catchError((error) => {
        console.error("Error fetching notes:", error)
        throw error
      }),
    )
  }

  getNoteById(id: string): Observable<Note> {
    return from(
      this.client.execute({
        sql: "SELECT * FROM notes WHERE id = ?",
        args: [id],
      }),
    ).pipe(
      map((result) => {
        const row = result.rows[0]
        return {
          id: row["id"] as string,
          title: row["title"] as string,
          subtitle: row["subtitle"] as string,
          content: row["content"] as string,
          createdAt: new Date(row["createdAt"] as string),
          updatedAt: new Date(row["updatedAt"] as string),
          userId: row["userId"] as string,
        }
      }),
    )
  }

  createNote(noteData: CreateNoteRequest): Observable<Note> {
    console.log("Creating note:", noteData)
    const id = Date.now().toString()
    const now = new Date().toISOString()
    const newNote: Note = {
      id,
      ...noteData,
      content: noteData.content || "",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    return from(
      this.client.execute({
        sql: "INSERT INTO notes (id, title, subtitle, content, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [id, noteData.title, noteData.subtitle, newNote.content, now, now, noteData.userId],
      }),
    ).pipe(
      map(() => {
        console.log("Note created successfully:", newNote)
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
    const updatedAt = new Date()
    return from(
      this.client.execute({
        sql: "UPDATE notes SET title = ?, subtitle = ?, content = ?, updatedAt = ? WHERE id = ?",
        args: [
          noteData.title || null,
          noteData.subtitle || null,
          noteData.content || null,
          updatedAt.toISOString(),
          id,
        ],
      }),
    ).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value
        const existingNote = currentNotes.find((note) => note.id === id)
        if (!existingNote) {
          throw new Error("Note not found")
        }
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
    )
  }

  deleteNote(id: string): Observable<void> {
    return from(
      this.client.execute({
        sql: "DELETE FROM notes WHERE id = ?",
        args: [id],
      }),
    ).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value
        const updatedNotes = currentNotes.filter((note) => note.id !== id)
        this.notesSubject.next(updatedNotes)
      }),
    )
  }
}

