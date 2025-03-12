export interface Note {
  id: string
  title: string
  subtitle: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
  isLocal?: boolean // Add this line
  status?: "active" | "archived" | "trashed"
}

export interface CreateNoteRequest {
  title: string
  subtitle: string
  content?: string
  userId?: string
}

export interface UpdateNoteRequest {
  title?: string
  subtitle?: string
  content?: string
  status?: "active" | "archived" | "trashed"
}

