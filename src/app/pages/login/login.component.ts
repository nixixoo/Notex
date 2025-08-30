import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { animate, style, transition, trigger } from "@angular/animations"
import { User } from "../../models/user.model"
import { Observable, BehaviorSubject } from "rxjs"
import { AuthService } from "../../services/auth.service"
import { catchError, retry, throwError, timer } from 'rxjs'


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
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();
  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();
  hidePassword = true;

  constructor(
    @Inject(FormBuilder) private fb: FormBuilder,
    private authService: AuthService,
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
    if (this.loginForm.invalid) return;

    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Use retry with backoff strategy for network issues
    this.authService.login(this.loginForm.value)
      .pipe(
        // Retry up to 2 times with a 1-second delay between attempts
        retry({
          count: 2,
          delay: (error, retryCount) => {
            // Don't retry on authentication errors (401/403)
            if (error.status === 401 || error.status === 403) {
              return throwError(() => error);
            }
            return timer(1000); // 1 second delay for network errors
          }
        }),
        catchError(error => {
          this.isLoadingSubject.next(false);
          
          // Handle specific error cases
          let errorMessage: string;
          
          if (error instanceof ErrorEvent) {
            errorMessage = 'A network error occurred. Please check your connection and try again.';
          } else if (error.status === 401) {
            errorMessage = 'Invalid username or password. Please check your credentials.';
          } else if (error.status === 403) {
            errorMessage = 'Account access denied. Please contact support if this persists.';
          } else if (error.status === 429) {
            errorMessage = 'Too many login attempts. Please wait a moment and try again.';
          } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (error.status === 0) {
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
          } else {
            // Extract message from different possible error response formats
            errorMessage = error.error?.message || 
                         error.error?.data?.message ||
                         error.error || 
                         error.message || 
                         'Login failed. Please try again.';
          }
          
          this.errorSubject.next(errorMessage);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoadingSubject.next(false);
          
          // Small delay to ensure state is fully updated before navigation
          setTimeout(() => {
            this.router.navigate(['/notes']);
          }, 100);
        },
        error: (error) => {
          // Error is already handled in the catchError operator
        }
      });
  }

  enterGuestMode(): void {
    this.authService.enableGuestMode();
    this.router.navigate(['/notes']);
  }
}