import { Component, Inject } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { CommonModule } from "@angular/common"
import { HeaderComponent } from "./components/header/header.component"
import { AuthService } from "./services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent],
  template: `
    <div class="app-container">
      <app-header></app-header>
      <main [@fadeAnimation]="o.isActivated ? o.activatedRoute : ''">
        <router-outlet #o="outlet"></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
    .app-container {
      min-height: 100vh;
      background-color: #fff;
    }
    
    main {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
  `,
  ],
  animations: [
    trigger("fadeAnimation", [
      transition("* => *", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
  ],
})
export class AppComponent {
  constructor(@Inject(AuthService) public authService: AuthService) {}
}

