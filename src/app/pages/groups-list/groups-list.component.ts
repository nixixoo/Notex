import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { GroupsService } from '../../services/groups.service';
import { NotesService } from '../../services/notes.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { GroupMenuComponent } from '../../components/group-menu/group-menu.component';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
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
  isLoading = true; 
  showNewGroupForm = false;
  newGroupForm: FormGroup;
  showEmptyMessage = false;
  
  // Sidebar counts
  activeCount = 0;
  archivedCount = 0;
  trashedCount = 0;
  groupCount = 0;

  constructor(
    private groupsService: GroupsService,
    private notesService: NotesService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.newGroupForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadGroups();
    this.loadNoteCounts();
  }

  loadGroups() {
    this.isLoading = true;
    this.showEmptyMessage = false;
    
    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.groupCount = groups.length;
        
        if (groups.length === 0) {
          this.showEmptyMessage = true;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.isLoading = false;
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

  deleteGroup(group: Group, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    if (confirm('Are you sure you want to delete this group?')) {
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

  get name() { return this.newGroupForm.get('name'); }
  get description() { return this.newGroupForm.get('description'); }
}
