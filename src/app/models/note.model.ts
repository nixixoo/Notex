export interface Note {
  id: string
  title: string
  subtitle: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface CreateNoteRequest {
  title: string
  subtitle: string
  content?: string
  userId: string
}

export interface UpdateNoteRequest {
  title?: string
  subtitle?: string
  content?: string
}

