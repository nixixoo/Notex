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
  template: `
    <div class="group-menu-container" (clickOutside)="closeMenu()">
      <button class="menu-button" (click)="toggleMenu($event)">
        <mat-icon>more_vert</mat-icon>
      </button>
      
      <div *ngIf="isOpen" class="menu-dropdown" [@fadeIn]>
        <button class="menu-item delete" (click)="onDelete($event)">
          <mat-icon>delete_forever</mat-icon>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .group-menu-container {
      position: relative;
    }
    
    .menu-button {
      background: none;
      border: none;
      color: var(--text-color-light);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: var(--surface-color);
        color: var(--text-color);
      }
    }
    
    .menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background-color: var(--background-color);
      border-radius: 4px;
      box-shadow: 0 2px 10px var(--shadow-color);
      min-width: 180px;
      z-index: 10;
      overflow: hidden;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      width: 100%;
      background: none;
      border: none;
      text-align: left;
      cursor: pointer;
      color: var(--text-color);
      transition: background-color 0.3s ease;
      
      &:hover {
        background-color: var(--surface-color);
      }
      
      mat-icon {
        margin-right: 0.75rem;
        font-size: 1.25rem;
        color: var(--text-color-light);
      }
      
      &.delete {
        color: var(--error-color);
        
        mat-icon {
          color: var(--error-color);
        }
      }
    }
  `],
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
