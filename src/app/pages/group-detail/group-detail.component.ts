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
import { Group, UpdateGroupRequest } from "../../models/group.model"
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
          stagger(100, [
            animate("0.3s ease-out", style({ opacity: 1, transform: "translateY(0)" })),
          ]),
        ], { optional: true }),
        query(":leave", [
          animate("0.3s ease-out", style({ opacity: 0, transform: "translateX(30px)" }))
        ], { optional: true })
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
  showEditGroupForm = false;
  isLoading = false;
  isLoadingGroup = false;
  isLoadingNotes = false;
  activeCount = 0;
  archivedCount = 0;
  trashedCount = 0;
  groupCount = 0;
  private subscriptions: Subscription[] = [];
  newNoteForm: FormGroup;
  editGroupForm: FormGroup;
  titleLengthWarning = false;
  titleLengthDanger = false;
  subtitleLengthWarning = false;
  subtitleLengthDanger = false;
  nameLengthWarning = false;
  nameLengthDanger = false;
  descriptionLengthWarning = false;
  descriptionLengthDanger = false;
  colorOptions = [
    { name: 'purple', value: '#bf9dfb' },
    { name: 'blue', value: '#9fdeff' },
    { name: 'green', value: '#b5e9d3' },
    { name: 'yellow', value: '#ffe380' },
    { name: 'orange', value: '#ffc082' },
    { name: 'none', value: '' }
  ];
  selectedColor: string = '';
  readonly TITLE_MAX_LENGTH = 75;
  readonly SUBTITLE_MAX_LENGTH = 150;
  readonly NAME_MAX_LENGTH = 50;
  readonly DESCRIPTION_MAX_LENGTH = 150;

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

    this.editGroupForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.maxLength(this.NAME_MAX_LENGTH)
      ]],
      description: ['', [
        Validators.required,
        Validators.maxLength(this.DESCRIPTION_MAX_LENGTH)
      ]]
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

    this.editGroupForm.get('name')?.valueChanges.subscribe(value => {
      const length = value?.length || 0;
      this.nameLengthWarning = length >= Math.floor(this.NAME_MAX_LENGTH * 0.8);
      this.nameLengthDanger = length >= this.NAME_MAX_LENGTH * 0.9;
    });

    this.editGroupForm.get('description')?.valueChanges.subscribe(value => {
      const length = value?.length || 0;
      this.descriptionLengthWarning = length >= Math.floor(this.DESCRIPTION_MAX_LENGTH * 0.8);
      this.descriptionLengthDanger = length >= this.DESCRIPTION_MAX_LENGTH * 0.9;
    });
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
          this.editGroupForm.patchValue({
            name: group.name,
            description: group.description
          });
          this.loadNotesForGroup(groupId)
        },
        error: (error) => {
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
      this.selectedColor = '';
    } else {
      this.showNewNoteForm = true;
      // Reset and mark as pristine to ensure proper button state
      this.newNoteForm.reset();
      this.newNoteForm.markAsPristine();
      this.newNoteForm.markAsUntouched();
      this.selectedColor = '';
    }
  }

  toggleEditGroupForm(): void {
    this.showEditGroupForm = !this.showEditGroupForm;
    if (this.showEditGroupForm && this.group) {
      this.editGroupForm.patchValue({
        name: this.group.name,
        description: this.group.description
      });
      this.selectedColor = this.group.color || '';
    } else {
      this.editGroupForm.reset();
      this.selectedColor = '';
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
      groupId: this.group.id,
      color: this.selectedColor || ''
    };

    this.subscriptions.push(
      this.notesService.createNote(newNote).subscribe({
        next: () => {
          this.isLoading = false
          this.newNoteForm.reset()
          this.showNewNoteForm = false
          this.selectedColor = ''

          // Reload notes for the group
          if (this.group) {
            this.loadNotesForGroup(this.group.id)
          }

          // Refresh counts
          this.loadCounts()
        },
        error: (error) => {
          this.isLoading = false
        }
      })
    )
  }

  updateGroup(): void {
    if (this.editGroupForm.valid && this.group) {
      this.isLoading = true;
      const updatedGroup: UpdateGroupRequest = {
        name: this.editGroupForm.value.name,
        description: this.editGroupForm.value.description,
        color: this.selectedColor
      };

      this.groupsService.updateGroup(this.group.id, updatedGroup).subscribe({
        next: (group) => {
          this.group = { ...group }; // Create a new reference to trigger change detection
          this.showEditGroupForm = false;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
        }
      });
    }
  }

  removeNoteFromGroup(note: Note): void {
    if (!this.group) return

    this.isLoading = true

    // Create a proper UpdateNoteRequest with groupId set to null
    // This will remove the note from the group in the database
    const updatedNote: UpdateNoteRequest = {
      groupId: null
    }


    this.subscriptions.push(
      this.notesService.updateNote(note.id, updatedNote).subscribe({
        next: (result) => {
          this.isLoading = false

          // Remove note from local array
          this.notes = this.notes.filter(n => n.id !== note.id)

          // Refresh counts
          this.loadCounts()

          // Force refresh the notes service
          this.notesService.getNotes(note.status || 'active').subscribe();
        },
        error: (error) => {
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
        // Also reload the group's notes to ensure consistency
        if (this.group) {
          this.loadNotesForGroup(this.group.id)
        }
      },
      error: (error) => {
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
        // Also reload the group's notes to ensure consistency
        if (this.group) {
          this.loadNotesForGroup(this.group.id)
        }
      },
      error: (error) => {
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

  setNoteColor(colorValue: string): void {
    this.selectedColor = colorValue;
  }

  // Getter methods for form controls
  get title() { return this.newNoteForm.get('title'); }
  get subtitle() { return this.newNoteForm.get('subtitle'); }
  get name() { return this.editGroupForm.get('name'); }
  get description() { return this.editGroupForm.get('description'); }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }
}
