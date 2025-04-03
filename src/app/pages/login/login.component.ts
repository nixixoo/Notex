import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"
import { User } from "../../models/user.model"; // Add this import


@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(10px)" }),
        animate("0.4s ease-out", style({ opacity: 1, transform: "translateY(0)" })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  loginForm: FormGroup
  isLoading = false;
  errorMessage: string | null = null;
  hidePassword = true; // For password visibility toggle

  constructor(
    @Inject(FormBuilder) private fb: FormBuilder,
    @Inject(AuthService) private authService: AuthService,
    @Inject(Router) private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get username() {
    return this.loginForm.get("username")
  }
  get password() {
    return this.loginForm.get("password")
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return

    this.errorMessage = null;
    this.isLoading = true

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false
        this.authService.setSession(response)
        this.router.navigate(["/notes"])
      },
      error: (error) => {
        this.isLoading = false
        console.error("Login error:", error)
        
        // Handle network errors
        if (error instanceof ErrorEvent) {
          this.errorMessage = 'A network error occurred. Please check your connection.';
        }
        // Handle specific authentication errors
        else if (error.status === 401) {
          this.errorMessage = 'Invalid username or password. Please try again.';
        }
        else if (error.status === 404) {
          this.errorMessage = 'User not found. Please check your username.';
        }
        else if (error.status === 429) {
          this.errorMessage = 'Too many login attempts. Please try again later.';
        }
        // Handle server-side errors
        else {
          // Extract message from different possible locations
          this.errorMessage = error.error?.message ||  // If exists in error.error.message
                             error.error ||           // If error.error is the message string
                             error.message ||         // If message in error.message
                             'An unexpected error occurred. Please try again later.';
        }
      },
    })
  }

  enterGuestMode(): void {
    console.log('Guest mode button clicked');
    
    // First logout to clear any existing auth state
    this.authService.logout();
    
    // Then enable guest mode
    this.authService.enableGuestMode();
    
    // Add a small delay before navigation to ensure state is updated
    setTimeout(() => {
      console.log('Navigating to notes page');
      this.router.navigate(['/notes']);
    }, 100);
  }
}