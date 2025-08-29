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

    // Use retry with backoff strategy for network issues  
    this.authService.register(this.registerForm.value)
      .pipe(
        // Retry up to 2 times with a 1-second delay between attempts
        retry({
          count: 2,
          delay: (error, retryCount) => {
            // Don't retry on client errors (400-499) except for 408 (timeout)
            if (error.status >= 400 && error.status < 500 && error.status !== 408) {
              return throwError(() => error);
            }
            return timer(1000); // 1 second delay for network/server errors
          }
        }),
        catchError(error => {
          console.error("Registration error after retries:", error);
          this.isLoading = false;
          
          // Handle specific error cases with clearer messages
          let errorMessage: string;
          
          if (error instanceof ErrorEvent) {
            errorMessage = 'A network error occurred. Please check your connection and try again.';
          } else if (error.status === 409 || error.status === 422) {
            errorMessage = 'This username is already taken. Please choose a different username.';
          } else if (error.status === 400) {
            // Try to get specific validation message from server
            errorMessage = error.error?.message || 
                          'Invalid registration data. Please ensure your password is at least 6 characters.';
          } else if (error.status === 429) {
            errorMessage = 'Too many registration attempts. Please wait a moment and try again.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.status === 0) {
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
          } else {
            // Extract message from different possible error response formats
            errorMessage = error.error?.message || 
                          error.error?.data?.message ||
                          error.error || 
                          error.message || 
                          'Registration failed. Please try again later.';
          }
          
          this.errorMessage = errorMessage;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          this.isLoading = false;
          this.authService.setSession(response);
          
          // Small delay to ensure state is fully updated before navigation
          setTimeout(() => {
            console.log('Navigating to /notes after successful registration');
            this.router.navigate(["/notes"]);
          }, 100);
        },
        error: (error) => {
          // Error is already handled in the catchError operator
          console.error("Final registration error:", error);
        },
      });
  }
}