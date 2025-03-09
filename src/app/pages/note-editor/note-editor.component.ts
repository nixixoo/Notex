import { Component, type OnInit, Inject } from "@angular/core"
import { CommonModule, Location } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { NotesService } from "../../services/notes.service"
import type { Note } from "../../models/note.model"
import { animate, style, transition, trigger } from "@angular/animations"
import { AuthService } from "../../services/auth.service"; // Add this import


@Component({
  selector: "app-note-editor",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./note-editor.component.html",
  styleUrls: ["./note-editor.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
  ],
})
export class NoteEditorComponent implements OnInit {
  noteId: string | null = null
  note: Note | undefined
  noteForm: FormGroup
  isLoading = true
  isSaving = false;

  constructor(
    @Inject(ActivatedRoute) private route: ActivatedRoute,
    @Inject(Router) private router: Router,
    @Inject(Location) private location: Location,
    @Inject(NotesService) private notesService: NotesService,
    @Inject(FormBuilder) private fb: FormBuilder,
    @Inject(AuthService) private authService: AuthService // Add to constructor
  ) {
    this.noteForm = this.fb.group({
      title: ['', Validators.required],
      subtitle: ['', Validators.required],
      content: ['']
    });
  }

  get title() {
    return this.noteForm.get("title")
  }
  get subtitle() {
    return this.noteForm.get("subtitle")
  }
  get content() {
    return this.noteForm.get("content")
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.noteId = params.get("id")
      if (this.noteId) {
        this.loadNote(this.noteId)
      } else {
        this.isLoading = false
      }
    })
  }

  loadNote(id: string): void {
    this.isLoading = true;
    
    if (this.authService.isGuestMode()) {
      const notes = this.notesService.getLocalNotes();
      const note = notes.find(n => n.id === id);
      if (note) {
        this.note = note;
        this.noteForm.patchValue({
          title: note.title,
          subtitle: note.subtitle,
          content: note.content,
        });
        this.isLoading = false;
        return;
      }
      this.isLoading = false;
      this.router.navigate(['/notes']);
      return;
    }
  
    this.notesService.getNoteById(id).subscribe({
      next: (note) => {
        this.note = note;
        this.noteForm.patchValue({
          title: note.title,
          subtitle: note.subtitle,
          content: note.content,
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error("Error loading note:", error);
        this.isLoading = false;
        this.router.navigate(['/notes']);
      }
    });
  }

  saveNote(): void {
    if (this.noteForm.invalid || !this.noteId) return;
  
    this.isSaving = true;
  
    if (this.authService.isGuestMode()) {
      const updatedNote: Note = {
        ...this.note!,
        ...this.noteForm.value,
        updatedAt: new Date(),
      };
      
      this.notesService.updateLocalNote(updatedNote);
      this.note = updatedNote;
      this.isSaving = false;
      return;
    }
  
    this.notesService.updateNote(this.noteId, this.noteForm.value).subscribe({
      next: (updatedNote) => {
        this.note = updatedNote;
        this.isSaving = false;
      },
      error: (error) => {
        console.error("Error saving note:", error);
        this.isSaving = false;
      },
    });
  }

  deleteNote(): void {
    if (!this.noteId) return;
  
    if (confirm("Are you sure you want to delete this note?")) {
      if (this.authService.isGuestMode()) {
        this.notesService.deleteLocalNote(this.noteId);
        this.router.navigate(['/notes']);
        return;
      }
  
      this.notesService.deleteNote(this.noteId).subscribe({
        next: () => {
          this.router.navigate(["/notes"]);
        },
        error: (error) => {
          console.error("Error deleting note:", error);
        },
      });
    }
  }

  goBack(): void {
    this.location.back()
  }
}

