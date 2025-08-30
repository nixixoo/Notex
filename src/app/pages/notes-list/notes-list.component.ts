import { Component, type OnInit, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink, ActivatedRoute } from "@angular/router"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { MatIconModule } from "@angular/material/icon"
import { MatDialog, MatDialogModule } from "@angular/material/dialog"
import { NotesService } from "../../services/notes.service"
import type { Note } from "../../models/note.model"
import { animate, query, stagger, style, transition, trigger } from "@angular/animations"
import { FormsModule } from "@angular/forms"
import { PreviewFormatPipe } from "../../pipes/preview-format.pipe"
import { Observable } from "rxjs"
import { AuthService } from "../../services/auth.service"
import { Router } from "@angular/router"
import { SidebarComponent } from "../../components/sidebar/sidebar.component"
import { NoteMenuComponent } from "../../components/note-menu/note-menu.component"
import { ConfirmDialogComponent } from "../../components/confirm-dialog/confirm-dialog.component"
import { SidebarService } from "../../services/sidebar.service"
import { GroupsService } from "../../services/groups.service"

interface CreateNoteRequest {
  title: string
  subtitle: string
  content?: string
  color?: string
}

@Component({
  selector: "app-notes-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    PreviewFormatPipe,
    SidebarComponent,
    NoteMenuComponent,
    MatIconModule,
    MatDialogModule
  ],
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
            stagger(100, [
              animate("0.3s ease-out", style({ opacity: 1, transform: "translateY(0)" }))
            ])
          ],
          { optional: true }
        ),
        query(
          ":leave",
          [
            animate("0.3s ease-out", style({ opacity: 0, transform: "translateX(30px)" }))
          ],
          { optional: true }
        )
      ])
    ]),
    trigger("previewExpand", [
      transition(":enter", [
        style({ height: 0, opacity: 0 }),
        animate("300ms ease-out", style({ height: "*", opacity: 1 })),
      ]),
      transition(":leave", [animate("300ms ease-in", style({ height: 0, opacity: 0 }))]),
    ]),
    trigger("fadeInOut", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("300ms ease-out", style({ opacity: 1 }))
      ]),
      transition(":leave", [
        animate("300ms ease-in", style({ opacity: 0 }))
      ])
    ])
  ],
  
})
export class NotesListComponent implements OnInit {
  notes: Note[] = []
  isLoadingNotes = true
  showNewNoteForm = false
  newNoteForm: FormGroup
  isLoading = false
  showPreview = false
  currentStatus: "active" | "archived" | "trashed" = "active"
  activeCount = 0
  archivedCount = 0
  trashedCount = 0
  groupCount = 0
  showEmptyMessage = false
  titleLengthWarning = false
  titleLengthDanger = false
  subtitleLengthWarning = false
  subtitleLengthDanger = false
  isGuestMode$: Observable<boolean>
  
  // Color options for notes
  colorOptions = [
    { name: 'purple', value: '#bf9dfb' },
    { name: 'blue', value: '#9fdeff' },
    { name: 'green', value: '#b5e9d3' },
    { name: 'yellow', value: '#ffe380' },
    { name: 'orange', value: '#ffc082' },
    { name: 'none', value: '' }
  ]
  selectedColor: string = '';

  readonly TITLE_MAX_LENGTH = 75
  readonly SUBTITLE_MAX_LENGTH = 150

  constructor(
    @Inject(NotesService) private notesService: NotesService,
    @Inject(FormBuilder) private fb: FormBuilder,
    @Inject(Router) public router: Router,
    @Inject(ActivatedRoute) private route: ActivatedRoute,
    public sidebarService: SidebarService,
    @Inject(GroupsService) private groupsService: GroupsService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.isGuestMode$ = this.authService.guestMode$;
    
    this.newNoteForm = this.fb.group({
      title: ['', [
        Validators.required,
        Validators.maxLength(this.TITLE_MAX_LENGTH)
      ]],
      subtitle: ['', [
        Validators.required,
        Validators.maxLength(this.SUBTITLE_MAX_LENGTH)
      ]],
      content: [''],
      color: ['']
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

  get title() {
    return this.newNoteForm.get('title')
  }

  get subtitle() {
    return this.newNoteForm.get('subtitle')
  }
  
  get color() {
    return this.newNoteForm.get('color')
  }

  trackNoteById(index: number, note: Note): string {
    return note.id;
  }

  convertToPermanentAccount(): void {
    // Navigate to register with preserved notes
    this.router.navigate(["/register"], {
      state: {
        notes: this.notes.filter((n) => n.isLocal),
      },
    })
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.currentStatus = data["status"] || "active"
      this.loadNotes()
    })

    this.loadNoteCounts()
    this.loadGroupCount()
  }

  loadNotes(showLoading: boolean = true): void {
    if (showLoading) this.isLoadingNotes = true;
    
    this.notesService.getNotes(this.currentStatus).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.isLoadingNotes = false;
  
        // Delay empty message for animation
        if (notes.length === 0) {
          setTimeout(() => this.showEmptyMessage = true, 300); // Match animation duration (300ms)
        } else {
          this.showEmptyMessage = false;
        }
      },
      error: (error) => {
        this.isLoadingNotes = false;
        this.showEmptyMessage = false;
      },
    });
  }

  loadNoteCounts(): void {
    this.notesService.getNotesCount().subscribe((counts) => {
      this.activeCount = counts.active
      this.archivedCount = counts.archived
      this.trashedCount = counts.trashed
    })
  }

  loadGroupCount(): void {
    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groupCount = groups.length;
      },
      error: (error) => {
      }
    });
  }

  toggleNewNoteForm(): void {
    this.showNewNoteForm = !this.showNewNoteForm
    if (!this.showNewNoteForm) {
      this.newNoteForm.reset()
      this.selectedColor = '';
    }
  }

  createNote(): void {
    if (this.newNoteForm.invalid) {
      return
    }

    this.isLoading = true
    const newNote = {
      title: this.title?.value,
      subtitle: this.subtitle?.value,
      content: this.newNoteForm.get('content')?.value || '',
      color: this.selectedColor || ''
    }

    this.notesService.createNote(newNote).subscribe({
      next: (note) => {
        if (this.currentStatus === "active") {
          this.notes = [note, ...this.notes]
        }
        this.loadNoteCounts()
        this.isLoading = false
        this.newNoteForm.reset()
        this.selectedColor = '';
        this.showNewNoteForm = false
      },
      error: (error) => {
        this.isLoading = false
      }
    })
  }

  onArchive(note: Note): void {
  this.notesService.archiveNote(note.id).subscribe({
    next: () => {
      this.loadNotes(false); // Skip loading animation
      this.loadNoteCounts();
      },
      error: (error) => {
      },
    })
  }

  onTrash(note: Note): void {
    this.notesService.trashNote(note.id).subscribe({
      next: () => {
        this.loadNotes(false); // Skip loading animation
        this.loadNoteCounts() // Add this line
      },
      error: (error) => {
      },
    })
  }

  onRestore(note: Note): void {
    this.notesService.restoreNote(note.id).subscribe({
      next: () => {
      this.loadNotes(false); // Skip loading animation
      this.loadNoteCounts() // Add this line
      },
      error: (error) => {
      },
    })
  }

  onDelete(note: Note): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Forever',
        message: `Are you sure you want to permanently delete "${note.title}"? This action cannot be undone.`,
        confirmText: 'Delete Forever',
        cancelText: 'Cancel',
        type: 'warning'
      },
      panelClass: document.body.classList.contains('dark-theme') ? 'dark-theme-dialog' : '',
      disableClose: true,
      autoFocus: true,
      restoreFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.notesService.deleteNote(note.id).subscribe({
          next: () => {
            this.notes = this.notes.filter((n) => n.id !== note.id)
            this.loadNoteCounts()
          },
          error: (error) => {
          }
        });
      }
    });
  }

  getPageTitle(): string {
    switch (this.currentStatus) {
      case "archived":
        return "Archived Notes"
      case "trashed":
        return "Trash"
      default:
        return "My Notes"
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation()
  }

  setNoteColor(colorValue: string): void {
    this.selectedColor = colorValue;
    this.color?.setValue(colorValue);
  }
}
