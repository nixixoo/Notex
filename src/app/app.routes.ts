import { Routes } from "@angular/router"
import { LoginComponent } from "./pages/login/login.component"
import { RegisterComponent } from "./pages/register/register.component"
import { NotesListComponent } from "./pages/notes-list/notes-list.component"
import { NoteEditorComponent } from "./pages/note-editor/note-editor.component"
import { GroupsListComponent } from "./pages/groups-list/groups-list.component"
import { GroupDetailComponent } from "./pages/group-detail/group-detail.component"
import { authGuard } from "./guards/auth.guard"
import { noAuthGuard } from "./guards/no-auth.guard"

export const routes: Routes = [
  { path: "", redirectTo: "/notes", pathMatch: "full" },
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [noAuthGuard] 
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [noAuthGuard]
  },
  { path: "notes/archived", component: NotesListComponent, canActivate: [authGuard], data: { status: "archived" } },
  { path: "notes/trash", component: NotesListComponent, canActivate: [authGuard], data: { status: "trashed" } },
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
  { 
    path: 'groups', 
    component: GroupsListComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'groups/:id', 
    component: GroupDetailComponent,
    canActivate: [authGuard] 
  },
  { path: "**", redirectTo: "/notes" },
]
