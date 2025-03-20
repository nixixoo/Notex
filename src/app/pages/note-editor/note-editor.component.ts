import { Component, type OnInit, Inject } from "@angular/core"
import { CommonModule, Location } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { NotesService } from "../../services/notes.service"
import type { Note } from "../../models/note.model"
import { animate, style, transition, trigger } from "@angular/animations"
import { AuthService } from "../../services/auth.service"
import { GroupsService } from "../../services/groups.service"
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { SidebarService } from "../../services/sidebar.service";
import { MatIconModule } from "@angular/material/icon"
import { firstValueFrom } from 'rxjs';

@Component({
  selector: "app-note-editor",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, MatIconModule],
  templateUrl: "./note-editor.component.html",
  styleUrls: ["./note-editor.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
  ],
})
export class NoteEditorComponent implements OnInit {
  noteForm: FormGroup
  note: Note | null = null
  isLoading = false
  isSaving = false
  titleLengthWarning = false
  titleLengthDanger = false
  subtitleLengthWarning = false
  subtitleLengthDanger = false
  activeCount = 0
  archivedCount = 0
  trashedCount = 0
  groupCount = 0
  isEditable = true

  readonly TITLE_MAX_LENGTH = 75
  readonly SUBTITLE_MAX_LENGTH = 150

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private notesService: NotesService,
    public location: Location,
    public authService: AuthService,
    private groupsService: GroupsService,
    private sidebarService: SidebarService
  ) {
    this.noteForm = this.formBuilder.group({
      title: ['', [
        Validators.required,
        Validators.maxLength(this.TITLE_MAX_LENGTH)
      ]],
      subtitle: ['', [
        Validators.required,
        Validators.maxLength(this.SUBTITLE_MAX_LENGTH)
      ]],
      content: ['', [Validators.required]]
    })

    // Subscribe to count updates
    this.sidebarService.activeCount$.subscribe(count => this.activeCount = count)
    this.sidebarService.archivedCount$.subscribe(count => this.archivedCount = count)
    this.sidebarService.trashedCount$.subscribe(count => this.trashedCount = count)
    this.sidebarService.groupCount$.subscribe(count => this.groupCount = count)

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
    return this.noteForm.get('title')
  }

  get subtitle() {
    return this.noteForm.get('subtitle')
  }

  ngOnInit(): void {
    // Load initial counts
    this.sidebarService.loadCounts()

    const id = this.route.snapshot.paramMap.get("id")
    if (id) {
      this.loadNote(id)
    }
  }

  async loadNote(id: string): Promise<void> {
    this.isLoading = true
    try {
      const note = await firstValueFrom(this.notesService.getNoteById(id))
      if (note) {
        this.note = note
        // Disable editing for archived or trashed notes
        this.isEditable = note.status === 'active'
        
        this.noteForm.patchValue({
          title: note.title,
          subtitle: note.subtitle,
          content: note.content
        })

        if (!this.isEditable) {
          this.noteForm.disable()
        }
      }
    } catch (error) {
      console.error('Error loading note:', error)
    } finally {
      this.isLoading = false
    }
  }

  async saveNote(): Promise<void> {
    if (this.noteForm.invalid || !this.note || !this.isEditable) {
      return
    }

    this.isSaving = true
    try {
      const updatedNote = {
        ...this.note,
        title: this.title?.value,
        subtitle: this.subtitle?.value,
        content: this.noteForm.get('content')?.value
      }

      await firstValueFrom(this.notesService.updateNote(this.note.id, updatedNote))
      
      // Navigate back to group if note belongs to a group
      if (this.note.groupId) {
        this.router.navigate(['/groups', this.note.groupId])
      } else {
        this.location.back()
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      this.isSaving = false
    }
  }

  convertToPermanentAccount(): void {
    // Implement the logic to convert guest account to permanent account
    console.log('Converting to permanent account...')
  }
}
