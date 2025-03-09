import { Routes } from "@angular/router"
import { LoginComponent } from "./pages/login/login.component"
import { RegisterComponent } from "./pages/register/register.component"
import { NotesListComponent } from "./pages/notes-list/notes-list.component"
import { NoteEditorComponent } from "./pages/note-editor/note-editor.component"
import { authGuard } from "./guards/auth.guard"
import { noAuthGuard } from "./guards/no-auth.guard"

export const routes: Routes = [
  { path: "", redirectTo: "/notes", pathMatch: "full" },
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [noAuthGuard] // Add this
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [noAuthGuard] // Add this
  },
  { 
    path: 'notes', 
    component: NotesListComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'notes/:id', 
    component: NoteEditorComponent,
    canActivate: [authGuard] 
  },
  { path: "**", redirectTo: "/notes" },
]

