import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink, RouterLinkActive } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
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

