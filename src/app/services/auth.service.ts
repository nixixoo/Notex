import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { BehaviorSubject, type Observable, of } from "rxjs"
import { delay } from "rxjs/operators"
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "../models/user.model"
import { Router } from "@angular/router"
import { isPlatformBrowser } from '@angular/common'

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly TOKEN_KEY = "auth_token"
  private readonly USER_KEY = "user"

  private userSubject = new BehaviorSubject<User | null>(this.getUserFromStorage())
  public user$ = this.userSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    @Inject(Router) private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    // Simulate API call with mock data
    return of({
      user: {
        id: "1",
        email: credentials.email,
        name: "Demo User",
      },
      token: "mock_jwt_token",
    }).pipe(delay(800))
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    // Simulate API call with mock data
    return of({
      user: {
        id: "1",
        email: userData.email,
        name: userData.name,
      },
      token: "mock_jwt_token",
    }).pipe(delay(800))
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
    }
    this.userSubject.next(null)
    this.router.navigate(["/login"])
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY)
  }

  setSession(authResult: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.TOKEN_KEY, authResult.token)
      localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user))
    }
    this.userSubject.next(authResult.user)
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser) return null;
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }
}