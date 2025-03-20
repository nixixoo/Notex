import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-group-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ClickOutsideDirective
  ],
  templateUrl: './group-menu.component.html',
  styleUrls: ['./group-menu.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('0.2s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('0.2s ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ])
  ]
})
export class GroupMenuComponent {
  @Input() group!: Group;
  @Output() delete = new EventEmitter<Group>();
  
  isOpen = false;

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  closeMenu() {
    this.isOpen = false;
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit(this.group);
    this.closeMenu();
  }
}
