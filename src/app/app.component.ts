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
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  animations: [
    trigger("fadeAnimation", [
      transition("* => *", [style({ opacity: 0 }), animate("0.3s ease-in-out", style({ opacity: 1 }))]),
    ]),
  ],
})
export class AppComponent {
  constructor(@Inject(AuthService) public authService: AuthService) {}
}

