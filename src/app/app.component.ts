import { Component, OnInit } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { CommonModule } from "@angular/common"
import { HeaderComponent } from "./components/header/header.component"
import { NotificationsComponent } from "./components/notifications/notifications.component"
import { animate, style, transition, trigger } from "@angular/animations"
import { Store } from "@ngrx/store"
import { AuthActions } from "./store/auth/auth.actions"

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent, NotificationsComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  animations: [
    trigger("fadeAnimation", [
      transition("* => *", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
  ],
})
export class AppComponent implements OnInit {
  constructor(private store: Store) {}

  ngOnInit(): void {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const guestMode = localStorage.getItem('guest_mode') === 'true';
      const user = localStorage.getItem('user');
      
      
      if (token) {
        // Validate existing token
        this.store.dispatch(AuthActions.validateToken());
      } else if (guestMode) {
        // Initialize guest mode
        this.store.dispatch(AuthActions.enterGuestMode());
      }
    }
  }
}

