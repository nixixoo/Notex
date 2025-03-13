// sidebar.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SidebarService } from '../../services/sidebar.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  animations: [
    trigger('countFadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(5px)' }),
        animate('200ms ease-out', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class SidebarComponent {
  @Input() activeCount = 0;
  @Input() archivedCount = 0;
  @Input() trashedCount = 0;
  
  constructor(public sidebarService: SidebarService) {}

  toggle() {
    this.sidebarService.toggle();
  }

  handleNavClick(event: MouseEvent) {
    event.stopPropagation();
    // Keep sidebar open on desktop
    if (window.innerWidth > 768) {
      this.sidebarService.setOpenState(true);
    }
  }
}