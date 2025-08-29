import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { animate, style, transition, trigger } from "@angular/animations"
import { User } from "../../models/user.model"
import { Observable, BehaviorSubject } from "rxjs"
import { AuthService } from "../../services/auth.service"


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

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.isLoadingSubject.next(false);
        
        // Small delay to ensure state is fully updated before navigation
        setTimeout(() => {
          console.log('Navigating to /notes after successful login');
          this.router.navigate(['/notes']);
        }, 100);
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.isLoadingSubject.next(false);
        this.errorSubject.next(error.message || 'Login failed. Please try again.');
      }
    });
  }

  enterGuestMode(): void {
    this.authService.enableGuestMode();
    this.router.navigate(['/notes']);
  }
}