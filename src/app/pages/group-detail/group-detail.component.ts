import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute, Router, RouterModule } from "@angular/router"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from "@angular/forms"
import { MatIconModule } from "@angular/material/icon"
import { Subscription } from "rxjs"
import { trigger, transition, style, animate, query, stagger } from "@angular/animations"
import { GroupsService } from "../../services/groups.service"
import { NotesService } from "../../services/notes.service"
import { AuthService } from "../../services/auth.service"
import { SidebarService } from "../../services/sidebar.service"
import { SidebarComponent } from "../../components/sidebar/sidebar.component"
import { PreviewFormatPipe } from "../../pipes/preview-format.pipe"
import { Group } from "../../models/group.model"
import { Note, UpdateNoteRequest, CreateNoteRequest } from "../../models/note.model"
import { NoteGroupMenuComponent } from "../../components/note-group-menu/note-group-menu.component"

@Component({
  selector: "app-group-detail",
  templateUrl: "./group-detail.component.html",
  styleUrls: ["./group-detail.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule,
    SidebarComponent,
    PreviewFormatPipe,
    NoteGroupMenuComponent
  ],
  animations: [
    trigger("fadeInOut", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("0.3s ease-in", style({ opacity: 1 })),
      ]),
      transition(":leave", [
        animate("0.3s ease-out", style({ opacity: 0 })),
      ]),
    ]),
    trigger("listAnimation", [
      transition("* => *", [
        query(":enter", [
          style({ opacity: 0, transform: "translateY(15px)" }),
          stagger(50, [
            animate("0.3s ease-out", style({ opacity: 1, transform: "translateY(0)" })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger("previewExpand", [
      transition(":enter", [
        style({ opacity: 0, height: 0, overflow: "hidden" }),
        animate("0.3s ease-out", style({ opacity: 1, height: "*" })),
      ]),
      transition(":leave", [
        style({ opacity: 1, height: "*", overflow: "hidden" }),
        animate("0.3s ease-in", style({ opacity: 0, height: 0 })),
      ]),
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
  ],
})
export class GroupDetailComponent implements OnInit, OnDestroy {
  group: Group | null = null;
  notes: Note[] = [];
  showPreview = false;
  showNewNoteForm = false;
  isLoading = false;
  isLoadingGroup = false;
  isLoadingNotes = false;
  activeCount = 0;
  archivedCount = 0;
  trashedCount = 0;
  groupCount = 0;
  private subscriptions: Subscription[] = [];
  newNoteForm: FormGroup;
  titleLengthWarning = false;
  titleLengthDanger = false;
  subtitleLengthWarning = false;
  subtitleLengthDanger = false;

  readonly TITLE_MAX_LENGTH = 75;
  readonly SUBTITLE_MAX_LENGTH = 150;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupsService: GroupsService,
    private notesService: NotesService,
    public authService: AuthService,
    private sidebarService: SidebarService,
    private fb: FormBuilder
  ) {
    this.newNoteForm = this.fb.group({
      title: ['', [
        Validators.required,
        Validators.maxLength(this.TITLE_MAX_LENGTH)
      ]],
      subtitle: ['', [
        Validators.required,
        Validators.maxLength(this.SUBTITLE_MAX_LENGTH)
      ]],
      content: ['']
    });

    // Monitor title and subtitle length
    this.title?.valueChanges.subscribe((value: string) => {
      const length = value?.length || 0
      this.titleLengthWarning = length >= Math.floor(this.TITLE_MAX_LENGTH * 0.85) && length < this.TITLE_MAX_LENGTH
      this.titleLengthDanger = length >= this.TITLE_MAX_LENGTH
      
      // Enforce max length by truncating
      if (length > this.TITLE_MAX_LENGTH) {
        this.title?.setValue(value.slice(0, this.TITLE_MAX_LENGTH), { emitEvent: false })
      }
    })

    this.subtitle?.valueChanges.subscribe((value: string) => {
      const length = value?.length || 0
      this.subtitleLengthWarning = length >= Math.floor(this.SUBTITLE_MAX_LENGTH * 0.85) && length < this.SUBTITLE_MAX_LENGTH
      this.subtitleLengthDanger = length >= this.SUBTITLE_MAX_LENGTH
      
      // Enforce max length by truncating
      if (length > this.SUBTITLE_MAX_LENGTH) {
        this.subtitle?.setValue(value.slice(0, this.SUBTITLE_MAX_LENGTH), { emitEvent: false })
      }
    })
  }

  ngOnInit(): void {
    this.loadGroup()
    this.loadCounts()
  }

  loadGroup(): void {
    this.isLoadingGroup = true
    const groupId = this.route.snapshot.paramMap.get("id")

    if (!groupId) {
      this.router.navigate(["/groups"])
      return
    }

    this.subscriptions.push(
      this.groupsService.getGroupById(groupId).subscribe({
        next: (group) => {
          this.group = group
          this.isLoadingGroup = false
          this.loadNotesForGroup(groupId)
        },
        error: (error) => {
          console.error("Error loading group:", error)
          this.isLoadingGroup = false
          this.router.navigate(["/groups"])
        }
      })
    )
  }

  loadNotesForGroup(groupId: string): void {
    this.isLoadingNotes = true

    this.subscriptions.push(
      this.groupsService.getNotesInGroup(groupId).subscribe({
        next: (notes) => {
          this.notes = notes
          this.isLoadingNotes = false
        },
        error: (error) => {
          console.error("Error loading notes for group:", error)
          this.isLoadingNotes = false
        }
      })
    )
  }

  loadCounts(): void {
    this.subscriptions.push(
      this.notesService.getNotesCount().subscribe(counts => {
        this.activeCount = counts.active
        this.archivedCount = counts.archived
        this.trashedCount = counts.trashed
      })
    )

    this.subscriptions.push(
      this.groupsService.getGroups().subscribe(groups => {
        this.groupCount = groups.length
      })
    )
  }

  toggleNewNoteForm(): void {
    if (this.showNewNoteForm) {
      this.showNewNoteForm = false;
      this.newNoteForm.reset();
    } else {
      this.showNewNoteForm = true;
      // Reset and mark as pristine to ensure proper button state
      this.newNoteForm.reset();
      this.newNoteForm.markAsPristine();
      this.newNoteForm.markAsUntouched();
    }
  }

  createNote(): void {
    if (this.newNoteForm.invalid || !this.group) return;
    
    this.isLoading = true;
    const formValue = this.newNoteForm.value;
    
    const newNote: CreateNoteRequest = {
      title: formValue.title || '',
      subtitle: formValue.subtitle || '',
      content: '',
      groupId: this.group.id
    };

    this.subscriptions.push(
      this.notesService.createNote(newNote).subscribe({
        next: () => {
          this.isLoading = false
          this.newNoteForm.reset()
          this.showNewNoteForm = false

          // Reload notes for the group
          if (this.group) {
            this.loadNotesForGroup(this.group.id)
          }

          // Refresh counts
          this.loadCounts()
        },
        error: (error) => {
          console.error("Error creating note:", error)
          this.isLoading = false
        }
      })
    )
  }

  removeNoteFromGroup(note: Note): void {
    if (!this.group) return

    console.log('[DEBUG] Starting removeNoteFromGroup', { noteId: note.id, noteGroupId: note.groupId });
    this.isLoading = true

    // Create a proper UpdateNoteRequest with groupId set to null
    // This will remove the note from the group in the database
    const updatedNote: UpdateNoteRequest = {
      groupId: null
    }

    console.log('[DEBUG] Sending update request', { noteId: note.id, updatedNote });

    this.subscriptions.push(
      this.notesService.updateNote(note.id, updatedNote).subscribe({
        next: (result) => {
          console.log('[DEBUG] Update successful', { result });
          this.isLoading = false

          // Remove note from local array
          this.notes = this.notes.filter(n => n.id !== note.id)
          console.log('[DEBUG] Removed note from local array', { remainingNotes: this.notes.length });

          // Refresh counts
          this.loadCounts()

          // Force refresh the notes service
          console.log('[DEBUG] Refreshing notes list');
          this.notesService.getNotes(note.status || 'active').subscribe(notes => {
            console.log('[DEBUG] Notes list refreshed', { notesCount: notes.length });
          });
        },
        error: (error) => {
          console.error("[DEBUG] Error removing note from group:", error)
          this.isLoading = false
        }
      })
    )
  }

  onArchive(note: Note): void {
    this.notesService.archiveNote(note.id).subscribe({
      next: () => {
        // Remove note from the list
        this.notes = this.notes.filter(n => n.id !== note.id)
        // Refresh counts
        this.loadCounts()
      },
      error: (error) => {
        console.error("Error archiving note:", error)
      }
    })
  }

  onTrash(note: Note): void {
    this.notesService.trashNote(note.id).subscribe({
      next: () => {
        // Remove note from the list
        this.notes = this.notes.filter(n => n.id !== note.id)
        // Refresh counts
        this.loadCounts()
      },
      error: (error) => {
        console.error("Error trashing note:", error)
      }
    })
  }

  onRestore(note: Note): void {
    this.notesService.restoreNote(note.id).subscribe({
      next: () => {
        // Remove note from the list if it was in trash/archive
        this.notes = this.notes.filter(n => n.id !== note.id)
        // Refresh counts
        this.loadCounts()
      },
      error: (error) => {
        console.error("Error restoring note:", error)
      }
    })
  }

  onDelete(note: Note): void {
    this.notesService.deleteNote(note.id).subscribe({
      next: () => {
        // Remove note from the list
        this.notes = this.notes.filter(n => n.id !== note.id)
        // Refresh counts
        this.loadCounts()
      },
      error: (error) => {
        console.error("Error deleting note:", error)
      }
    })
  }

  trackNoteById(index: number, note: Note): string {
    return note.id
  }

  stopPropagation(event: Event): void {
    event.stopPropagation()
  }

  convertToPermanentAccount(): void {
    this.router.navigate(['/register'], { queryParams: { fromGuest: 'true' } })
  }

  // Getter methods for form controls
  get title() { return this.newNoteForm.get('title'); }
  get subtitle() { return this.newNoteForm.get('subtitle'); }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }
}
