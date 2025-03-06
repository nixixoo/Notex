import { Component, type OnInit, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink } from "@angular/router"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { NotesService } from "../../services/notes.service"
import type { Note } from "../../models/note.model"
import { animate, query, stagger, style, transition, trigger } from "@angular/animations"

interface CreateNoteRequest {
  title: string
  subtitle: string
  userId: string
}

@Component({
  selector: "app-notes-list",
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: "./notes-list.component.html",
  styleUrls: ["./notes-list.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
    trigger("slideDown", [
      transition(":enter", [
        style({ opacity: 0, height: 0, overflow: "hidden" }),
        animate("0.3s ease-out", style({ opacity: 1, height: "*" })),
      ]),
      transition(":leave", [
        style({ opacity: 1, height: "*", overflow: "hidden" }),
        animate("0.3s ease-in", style({ opacity: 0, height: 0 })),
      ]),
    ]),
    trigger("listAnimation", [
      transition("* => *", [
        query(
          ":enter",
          [
            style({ opacity: 0, transform: "translateY(15px)" }),
            stagger(100, [animate("0.3s ease-out", style({ opacity: 1, transform: "translateY(0)" }))]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
})
export class NotesListComponent implements OnInit {
  notes: Note[] = []
  isLoadingNotes = true
  showNewNoteForm = false
  newNoteForm: FormGroup
  isLoading = false;

  constructor(
    @Inject(NotesService) private notesService: NotesService,
    @Inject(FormBuilder) private fb: FormBuilder
  ) {
    this.newNoteForm = this.fb.group({
      title: ['', Validators.required],
      subtitle: ['', Validators.required]
    });
  }

  get title() {
    return this.newNoteForm.get("title")
  }
  get subtitle() {
    return this.newNoteForm.get("subtitle")
  }

  ngOnInit(): void {
    this.loadNotes()
  }

  loadNotes(): void {
    this.isLoadingNotes = true
    this.notesService.getNotes().subscribe({
      next: (notes) => {
        this.notes = notes
        this.isLoadingNotes = false
      },
      error: (error) => {
        console.error("Error loading notes:", error)
        this.isLoadingNotes = false
      },
    })
  }

  toggleNewNoteForm(): void {
    this.showNewNoteForm = !this.showNewNoteForm
    if (!this.showNewNoteForm) {
      this.newNoteForm.reset()
    }
  }

  createNote(): void {
    if (this.newNoteForm.invalid) return

    this.isLoading = true

    const noteData: CreateNoteRequest = {
      ...this.newNoteForm.value,
      userId: "placeholder-user-id", // Replace this with actual user ID when you have authentication
    }

    this.notesService.createNote(noteData).subscribe({
      next: (note) => {
        this.notes = [note, ...this.notes]
        this.isLoading = false
        this.newNoteForm.reset()
        this.showNewNoteForm = false
      },
      error: (error) => {
        console.error("Error creating note:", error)
        this.isLoading = false
      },
    })
  }
}

