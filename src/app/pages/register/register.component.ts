import { Component, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { animate, style, transition, trigger } from "@angular/animations"

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

    this.isLoading = true

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        this.isLoading = false
        this.authService.setSession(response)
        this.router.navigate(["/notes"])
      },
      error: (error) => {
        this.isLoading = false
        console.error("Registration error:", error)
        // Handle error (show message, etc.)
      },
    })
  }
}