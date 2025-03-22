export interface Note {
  id: string
  title: string
  subtitle: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
  isLocal?: boolean 
  status?: "active" | "archived" | "trashed"
  groupId?: string | null
  color?: string
}

export interface CreateNoteRequest {
  title: string
  subtitle: string
  content?: string
  userId?: string
  groupId?: string | null
  color?: string
}

export interface UpdateNoteRequest {
  title?: string
  subtitle?: string
  content?: string
  status?: "active" | "archived" | "trashed"
  groupId?: string | null
  color?: string
}
