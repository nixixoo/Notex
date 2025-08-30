import { Component } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { CommonModule } from "@angular/common"
import { HeaderComponent } from "./components/header/header.component"
import { NotificationsComponent } from "./components/notifications/notifications.component"
import { animate, style, transition, trigger } from "@angular/animations"

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
export class AppComponent {
}

