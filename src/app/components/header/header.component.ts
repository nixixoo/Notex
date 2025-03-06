import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink, RouterLinkActive } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="logo">
        <a routerLink="/" class="logo-text">Notex</a>
      </div>
      <nav class="nav">
        <ng-container *ngIf="(authService.user$ | async) as user; else loginLinks">
          <a routerLink="/notes" routerLinkActive="active" class="nav-link">My Notes</a>
          <button (click)="logout()" class="nav-link logout-btn">Logout</button>
        </ng-container>
        <ng-template #loginLinks>
          <a routerLink="/login" routerLinkActive="active" class="nav-link">Login</a>
          <a routerLink="/register" routerLinkActive="active" class="nav-link register-btn">Register</a>
        </ng-template>
      </nav>
    </header>
  `,
  styles: [
    `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background-color: #fff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    
    .logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: #FF9E5E;
      text-decoration: none;
      transition: color 0.3s ease;
    }
    
    .logo-text:hover {
      color: #FF8A3D;
    }
    
    .nav {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }
    
    .nav-link {
      color: #333;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
      padding: 0.5rem 0;
      position: relative;
    }
    
    .nav-link:after {
      content: '';
      position: absolute;
      width: 0;
      height: 2px;
      bottom: 0;
      left: 0;
      background-color: #FF9E5E;
      transition: width 0.3s ease;
    }
    
    .nav-link:hover:after,
    .nav-link.active:after {
      width: 100%;
    }
    
    .nav-link:hover,
    .nav-link.active {
      color: #FF9E5E;
    }
    
    .register-btn, .logout-btn {
      background-color: #FF9E5E;
      color: white !important;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }
    
    .register-btn:hover, .logout-btn:hover {
      background-color: #FF8A3D;
    }
    
    .register-btn:after, .logout-btn:after {
      display: none;
    }
    
    .logout-btn {
      border: none;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
    }
  `,
  ],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
  ],
})
export class HeaderComponent {
  constructor(@Inject(AuthService) public authService: AuthService) {}

  logout(): void {
    this.authService.logout()
  }
}

