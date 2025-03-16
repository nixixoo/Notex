import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { GroupsService } from '../../services/groups.service';
import { NotesService } from '../../services/notes.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PreviewFormatPipe } from '../../pipes/preview-format.pipe';
import { Group } from '../../models/group.model';
import { Note } from '../../models/note.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatMenuModule,
    ReactiveFormsModule,
    FormsModule,
    SidebarComponent,
    PreviewFormatPipe
  ],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-20px)', opacity: 0 }))
      ])
    ]),
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('previewExpand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class GroupDetailComponent implements OnInit {
  group: Group | null = null;
  notes: Note[] = [];
  isLoadingGroup = false;
  isLoadingNotes = false;
  isLoading = false;
  showNewNoteForm = false;
  showPreview = true;
  newNoteForm: FormGroup;
  
  // Sidebar counts
  activeCount = 0;
  archivedCount = 0;
  trashedCount = 0;
  groupCount = 0;

  constructor(
    private groupsService: GroupsService,
    private notesService: NotesService,
    public authService: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.newNoteForm = this.fb.group({
      title: ['', [Validators.required]],
      subtitle: ['', [Validators.required]],
      content: ['']
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadGroup(params['id']);
        this.loadNotes(params['id']);
      }
    });
    this.loadNoteCounts();
  }

  loadGroup(groupId: string) {
    this.isLoadingGroup = true;
    this.groupsService.getGroupById(groupId).subscribe({
      next: (group: Group) => {
        this.group = group;
        this.isLoadingGroup = false;
      },
      error: (error: Error) => {
        console.error('Error loading group:', error);
        this.isLoadingGroup = false;
        this.router.navigate(['/groups']);
      }
    });
  }

  loadNotes(groupId: string) {
    this.isLoadingNotes = true;
    // According to the memory, GroupsService handles fetching notes within groups
    this.groupsService.getNotesInGroup(groupId).subscribe({
      next: (notes: Note[]) => {
        this.notes = notes;
        this.isLoadingNotes = false;
      },
      error: (error: Error) => {
        console.error('Error loading notes:', error);
        this.isLoadingNotes = false;
      }
    });
  }

  loadNoteCounts() {
    this.notesService.getNotesCount().subscribe({
      next: (counts: { active: number; archived: number; trashed: number }) => {
        this.activeCount = counts.active;
        this.archivedCount = counts.archived;
        this.trashedCount = counts.trashed;
      },
      error: (error: Error) => {
        console.error('Error loading note counts:', error);
      }
    });

    this.groupsService.getGroups().subscribe({
      next: (groups: Group[]) => {
        this.groupCount = groups.length;
      },
      error: (error: Error) => {
        console.error('Error loading group count:', error);
      }
    });
  }

  toggleNewNoteForm() {
    this.showNewNoteForm = !this.showNewNoteForm;
    if (!this.showNewNoteForm) {
      this.newNoteForm.reset();
    }
  }

  createNote() {
    if (this.newNoteForm.valid && this.group) {
      this.isLoading = true;
      const noteData = {
        ...this.newNoteForm.value,
        groupId: this.group.id
      };
      
      this.notesService.createNote(noteData).subscribe({
        next: (note: Note) => {
          this.notes = [note, ...this.notes];
          this.showNewNoteForm = false;
          this.newNoteForm.reset();
          this.isLoading = false;
          this.loadNoteCounts();
        },
        error: (error: Error) => {
          console.error('Error creating note:', error);
          this.isLoading = false;
        }
      });
    }
  }

  removeFromGroup(note: Note) {
    if (confirm('Are you sure you want to remove this note from the group?')) {
      this.notesService.updateNote(note.id, { ...note, groupId: undefined }).subscribe({
        next: () => {
          this.notes = this.notes.filter(n => n.id !== note.id);
          this.loadNoteCounts();
        },
        error: (error: Error) => {
          console.error('Error removing note from group:', error);
        }
      });
    }
  }

  onArchive(note: Note) {
    this.notesService.archiveNote(note.id).subscribe({
      next: () => {
        this.notes = this.notes.filter(n => n.id !== note.id);
        this.loadNoteCounts();
      },
      error: (error: Error) => {
        console.error('Error archiving note:', error);
      }
    });
  }

  onTrash(note: Note) {
    this.notesService.trashNote(note.id).subscribe({
      next: () => {
        this.notes = this.notes.filter(n => n.id !== note.id);
        this.loadNoteCounts();
      },
      error: (error: Error) => {
        console.error('Error trashing note:', error);
      }
    });
  }

  convertToPermanentAccount() {
    // Implement the conversion logic here
    console.log('Converting to permanent account...');
  }

  trackNoteById(index: number, note: Note): string {
    return note.id;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  get title() { return this.newNoteForm.get('title'); }
  get subtitle() { return this.newNoteForm.get('subtitle'); }
  get content() { return this.newNoteForm.get('content'); }
}
