// sidebar.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotesService } from './notes.service';
import { GroupsService } from './groups.service';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  private activeCountSubject = new BehaviorSubject<number>(0);
  activeCount$ = this.activeCountSubject.asObservable();

  private archivedCountSubject = new BehaviorSubject<number>(0);
  archivedCount$ = this.archivedCountSubject.asObservable();

  private trashedCountSubject = new BehaviorSubject<number>(0);
  trashedCount$ = this.trashedCountSubject.asObservable();

  private groupCountSubject = new BehaviorSubject<number>(0);
  groupCount$ = this.groupCountSubject.asObservable();

  constructor(
    private notesService: NotesService,
    private groupsService: GroupsService
  ) {
    this.loadCounts();
  }

  toggle() {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  setOpenState(state: boolean) {
    this.isOpenSubject.next(state);
  }

  loadCounts() {
    // Load note counts
    this.notesService.getNotesCount().subscribe({
      next: (counts) => {
        this.activeCountSubject.next(counts.active);
        this.archivedCountSubject.next(counts.archived);
        this.trashedCountSubject.next(counts.trashed);
      },
      error: (error) => {
      }
    });

    // Load group count
    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groupCountSubject.next(groups.length);
      },
      error: (error) => {
      }
    });
  }

  updateCounts() {
    this.loadCounts();
  }
}