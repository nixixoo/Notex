import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"
import { catchError, retry, throwError, timer } from 'rxjs'

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.scss"],
  animations: [
    trigger("fadeIn", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(10px)" }),
        animate("0.4s ease-out", style({ opacity: 1, transform: "translateY(0)" })),
      ]),
    ]),
  ],
})
export class RegisterComponent {
  registerForm: FormGroup
  isLoading = false;
  errorMessage: string = '';
  hidePassword = true; // For password visibility toggle

  constructor(
    @Inject(FormBuilder) private fb: FormBuilder,
    @Inject(AuthService) private authService: AuthService,
    @Inject(Router) private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get username() {
    return this.registerForm.get("username")
  }
  get password() {
    return this.registerForm.get("password")
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return

    this.isLoading = true;
    this.errorMessage = '';

    // Use retry with backoff strategy for Vercel cold starts
    this.authService.register(this.registerForm.value)
      .pipe(
        // Retry up to 2 times with a 1-second delay between attempts
        retry({
          count: 2,
          delay: (error, retryCount) => {
            console.log(`Registration attempt ${retryCount} failed, retrying...`);
            return timer(1000); // 1 second delay
          }
        }),
        catchError(error => {
          console.error("Registration error after retries:", error);
          this.isLoading = false;
          
          // Handle specific error cases
          if (error instanceof ErrorEvent) {
            this.errorMessage = 'A network error occurred. Please check your connection.';
          } else if (error.status === 409) {
            this.errorMessage = 'Username already exists. Please choose a different username.';
          } else if (error.status === 400) {
            this.errorMessage = 'Invalid registration data. Please check your information.';
          } else if (error.status === 429) {
            this.errorMessage = 'Too many registration attempts. Please try again later.';
          } else {
            // Extract message from different possible locations
            this.errorMessage = error.error?.message || 
                               error.error || 
                               error.message || 
                               'Registration failed. Please try again later.';
          }
          
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.authService.setSession(response);
          this.router.navigate(["/notes"]);
        },
        error: (error) => {
          // Error is already handled in the catchError operator
          console.error("Registration error:", error);
        },
      });
  }
}