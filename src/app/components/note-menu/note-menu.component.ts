import { Component, EventEmitter, Input, Output, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatIconModule } from "@angular/material/icon"
import { animate, style, transition, trigger } from "@angular/animations"
import type { Note } from "../../models/note.model"
import { ClickOutsideDirective } from "../../directives/click-outside.directive"
import { Subscription } from "rxjs"
import { MenuStateService } from "../../services/menu-state.service"


@Component({
  selector: "app-note-menu",
  standalone: true,
  imports: [CommonModule, MatIconModule, ClickOutsideDirective],
  templateUrl: "./note-menu.component.html",
  styleUrls: ["./note-menu.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(10px)" }),
        animate("0.2s ease-out", style({ opacity: 1, transform: "translateY(0)" })),
      ]),
      transition(":leave", [animate("0.2s ease-in", style({ opacity: 0, transform: "translateY(10px)" }))]),
    ]),
  ],
})
export class NoteMenuComponent implements OnDestroy{
  @Input() note!: Note
  @Output() archive = new EventEmitter<Note>()
  @Output() trash = new EventEmitter<Note>()
  @Output() restore = new EventEmitter<Note>()
  @Output() delete = new EventEmitter<Note>()

  private menuSub: Subscription;

  constructor(private menuState: MenuStateService) {
    this.menuSub = this.menuState.activeMenuId$.subscribe(activeId => {
      if (activeId !== this.note.id) {
        this.isOpen = false;
      }
    });
  }

  isOpen = false

  get menuButtonStyle() {
    if (this.note.color) {
      return {
        '--hover-bg-color': 'rgba(0, 0, 0, 0.3)'
      };
    }
    return {};
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    if (!this.isOpen) {
      this.menuState.setActiveMenu(this.note.id);
    }
    this.isOpen = !this.isOpen;
  }

  closeMenu(): void {
    this.menuState.closeAllMenus();
    this.isOpen = false;
  }

  onArchive(event: Event): void {
    event.stopPropagation()
    this.archive.emit(this.note)
    this.closeMenu()
  }

  onTrash(event: Event): void {
    event.stopPropagation() 
    this.trash.emit(this.note)
    this.closeMenu()
  }

  onRestore(event: Event): void {
    event.stopPropagation()
    this.restore.emit(this.note)
    this.closeMenu()
  }

  onDelete(event: Event): void {
    event.stopPropagation()
    this.delete.emit(this.note)
    this.closeMenu()
  }

  ngOnDestroy() {
    this.menuSub.unsubscribe();
  }
}
