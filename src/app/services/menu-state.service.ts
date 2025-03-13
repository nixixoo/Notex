// menu-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MenuStateService {
  private activeMenuId = new BehaviorSubject<string | null>(null);
  activeMenuId$ = this.activeMenuId.asObservable();

  setActiveMenu(id: string) {
    this.activeMenuId.next(id);
  }

  closeAllMenus() {
    this.activeMenuId.next(null);
  }
}