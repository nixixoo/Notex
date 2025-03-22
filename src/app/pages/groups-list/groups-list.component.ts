import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { GroupsService } from '../../services/groups.service';
import { NotesService } from '../../services/notes.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { GroupMenuComponent } from '../../components/group-menu/group-menu.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { Group } from '../../models/group.model';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    SidebarComponent,
    GroupMenuComponent
  ],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.3s ease-in-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, height: 0, overflow: 'hidden' }),
        animate('0.3s ease-out', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, height: '*', overflow: 'hidden' }),
        animate('0.3s ease-in', style({ opacity: 0, height: 0 }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(100, [
            animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true }),
        query(':leave', [
          animate('0.3s ease-out', style({ opacity: 0, transform: 'translateX(30px)' }))
        ], { optional: true })
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class GroupsListComponent implements OnInit {
  groups: Group[] = [];
  isLoadingGroups = true;
  showNewGroupForm = false;
  newGroupForm: FormGroup;
  isLoading = false;
  showEmptyMessage = false;
  nameLengthWarning = false;
  nameLengthDanger = false;
  descriptionLengthWarning = false;
  descriptionLengthDanger = false;

  readonly NAME_MAX_LENGTH = 50;
  readonly DESCRIPTION_MAX_LENGTH = 150;

  // Color options for groups
  colorOptions = [
    { name: 'purple', value: '#bf9dfb' },
    { name: 'blue', value: '#9fdeff' },
    { name: 'green', value: '#b5e9d3' },
    { name: 'yellow', value: '#ffe380' },
    { name: 'orange', value: '#ffc082' },
    { name: 'none', value: '' }
  ];
  selectedColor: string = '';

  // Sidebar counts
  activeCount = 0;
  archivedCount = 0;
  trashedCount = 0;
  groupCount = 0;

  constructor(
    private groupsService: GroupsService,
    private fb: FormBuilder,
    public authService: AuthService,
    public router: Router,
    public sidebarService: SidebarService,
    private notesService: NotesService,
    private dialog: MatDialog
  ) {
    this.newGroupForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.maxLength(this.NAME_MAX_LENGTH)
      ]],
      description: ['', [
        Validators.required,
        Validators.maxLength(this.DESCRIPTION_MAX_LENGTH)
      ]],
      color: ['']
    });

    // Monitor name and description length
    this.name?.valueChanges.subscribe((value: string) => {
      const length = value?.length || 0
      this.nameLengthWarning = length >= Math.floor(this.NAME_MAX_LENGTH * 0.85) && length < this.NAME_MAX_LENGTH
      this.nameLengthDanger = length >= this.NAME_MAX_LENGTH
      
      // Enforce max length by truncating
      if (length > this.NAME_MAX_LENGTH) {
        this.name?.setValue(value.slice(0, this.NAME_MAX_LENGTH), { emitEvent: false })
      }
    })

    this.description?.valueChanges.subscribe((value: string) => {
      const length = value?.length || 0
      this.descriptionLengthWarning = length >= Math.floor(this.DESCRIPTION_MAX_LENGTH * 0.85) && length < this.DESCRIPTION_MAX_LENGTH
      this.descriptionLengthDanger = length >= this.DESCRIPTION_MAX_LENGTH
      
      // Enforce max length by truncating
      if (length > this.DESCRIPTION_MAX_LENGTH) {
        this.description?.setValue(value.slice(0, this.DESCRIPTION_MAX_LENGTH), { emitEvent: false })
      }
    })
  }

  ngOnInit() {
    this.loadGroups();
    this.loadNoteCounts();
  }

  loadGroups() {
    this.isLoadingGroups = true;
    this.showEmptyMessage = false;
    
    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.groupCount = groups.length;
        
        if (groups.length === 0) {
          this.showEmptyMessage = true;
        }
        this.isLoadingGroups = false;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.isLoadingGroups = false;
        this.showEmptyMessage = false;
      }
    });
  }

  loadNoteCounts() {
    this.notesService.getNotesCount().subscribe({
      next: (counts) => {
        this.activeCount = counts.active;
        this.archivedCount = counts.archived;
        this.trashedCount = counts.trashed;
      },
      error: (error) => {
        console.error('Error loading note counts:', error);
      }
    });
  }

  toggleNewGroupForm() {
    this.showNewGroupForm = !this.showNewGroupForm;
    if (!this.showNewGroupForm) {
      this.newGroupForm.reset();
      this.selectedColor = '';
    }
  }

  createGroup() {
    if (this.newGroupForm.valid) {
      this.isLoading = true;
      const groupData = this.newGroupForm.value;
      
      this.groupsService.createGroup(groupData).subscribe({
        next: (group) => {
          this.groups = [group, ...this.groups];
          this.groupCount = this.groups.length;
          this.showNewGroupForm = false;
          this.newGroupForm.reset();
          this.selectedColor = '';
          this.isLoading = false;
          this.showEmptyMessage = false;
        },
        error: (error) => {
          console.error('Error creating group:', error);
          this.isLoading = false;
        }
      });
    }
  }

  deleteGroup(group: Group) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Group',
        message: `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
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
        this.groupsService.deleteGroup(group.id).subscribe({
          next: () => {
            this.groups = this.groups.filter(g => g.id !== group.id);
            this.groupCount = this.groups.length;
            if (this.groups.length === 0) {
              this.showEmptyMessage = true;
            }
          },
          error: (error) => {
            console.error('Error deleting group:', error);
          }
        });
      }
    });
  }

  trackGroupById(index: number, group: Group): string {
    return group.id;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  convertToPermanentAccount() {
    // Implement the conversion logic here
    console.log('Converting to permanent account...');
  }

  get name() {
    return this.newGroupForm.get('name');
  }

  get description() {
    return this.newGroupForm.get('description');
  }
  
  get color() {
    return this.newGroupForm.get('color');
  }
  
  // Set the selected color for the group
  setGroupColor(colorValue: string): void {
    this.selectedColor = colorValue;
    this.color?.setValue(colorValue);
  }
}
