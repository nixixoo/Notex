import { Component, Inject, PLATFORM_ID } from "@angular/core"
import { CommonModule, isPlatformBrowser } from "@angular/common"
import { RouterLink, RouterLinkActive } from "@angular/router"
import { animate, style, transition, trigger } from "@angular/animations"
import { FormsModule } from "@angular/forms"
import { MatIconModule } from "@angular/material/icon"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { User } from "../../models/user.model"
import { AuthService } from "../../services/auth.service"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, MatIconModule],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
  ],
})
export class HeaderComponent {
  isDarkMode: boolean | undefined;
  isMobileMenuOpen: boolean = false;
  user$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.user$ = this.authService.user$;
    this.isAuthenticated$ = this.authService.user$.pipe(
      map(user => !!user)
    );
    
    if (isPlatformBrowser(this.platformId)) {
      this.isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    }
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.toggle('mobile-menu-open', this.isMobileMenuOpen);
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    if (isPlatformBrowser(this.platformId)) {
      const theme = this.isDarkMode ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem("theme")
    this.isDarkMode = savedTheme === "dark"
    this.applyTheme()
  }

  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.isDarkMode) {
        document.documentElement.setAttribute("data-theme", "dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.removeAttribute("data-theme")
        localStorage.setItem("theme", "light")
      }
    }
  }
}
