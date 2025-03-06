import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"

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

  constructor(
    @Inject(FormBuilder) private fb: FormBuilder,
    @Inject(AuthService) private authService: AuthService,
    @Inject(Router) private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email() {
    return this.loginForm.get("email")
  }
  get password() {
    return this.loginForm.get("password")
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return

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
        // Handle error (show message, etc.)
      },
    })
  }
}

