import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { BehaviorSubject, Observable, of } from "rxjs"
import { map, catchError, tap, retry, delay } from "rxjs/operators"
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "../models/user.model"
import { Router } from "@angular/router"
import { isPlatformBrowser } from '@angular/common'
import { ApiService } from "./api.service"

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly GUEST_KEY = "guest_mode";
  private guestModeSubject = new BehaviorSubject<boolean>(false);
  public guestMode$ = this.guestModeSubject.asObservable();
  private readonly TOKEN_KEY = "auth_token"
  private readonly USER_KEY = "user"
  
  private userSubject = new BehaviorSubject<User | null>(this.getUserFromStorage())
  public user$ = this.userSubject.asObservable()
  private isBrowser: boolean
  private isValidatingToken = false;

  constructor(
    @Inject(Router) private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    private apiService: ApiService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeAuthState();
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser) return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private initializeAuthState(): void {
    if (!this.isBrowser) return;
    
    // Check for guest mode
    const isGuestMode = localStorage.getItem(this.GUEST_KEY) === 'true';
    this.guestModeSubject.next(isGuestMode);
    
    // Check for token
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = this.getUserFromStorage();
    console.log('Auth state initialized with token:', token ? 'Token exists' : 'No token');
    
    if (token && user) {
      // Set the user from storage immediately to prevent flickering
      this.userSubject.next(user);
      
      // Then validate token with backend
      this.validateToken().subscribe();
    }
  }

  validateToken(): Observable<boolean> {
    if (!this.isBrowser || this.isValidatingToken) return of(false);
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    console.log('Validating token:', token ? 'Token exists' : 'No token');
    if (!token) {
      this.clearAuthData();
      return of(false);
    }
    
    this.isValidatingToken = true;
    
    return this.apiService.get<User>('auth/me').pipe(
      retry(2), // Retry up to 2 times
      delay(500), // Add a small delay between retries
      tap(user => {
        console.log('Token validated successfully, user:', user);
        this.userSubject.next(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.isValidatingToken = false;
      }),
      map(() => true),
      catchError(error => {
        console.error('Token validation failed:', error);
        // Only clear auth data if we get a 401 Unauthorized response
        if (error.status === 401) {
          this.clearAuthData();
        }
        this.isValidatingToken = false;
        return of(false);
      })
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('auth/login', credentials).pipe(
      tap(response => {
        if (response.token) {
          console.log('Login successful, storing token');
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.userSubject.next(response.user);
          
          // Disable guest mode when logging in
          this.setGuestMode(false);
        }
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('auth/register', userData).pipe(
      tap(response => {
        if (response.token) {
          console.log('Registration successful, storing token');
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.userSubject.next(response.user);
          
          // Disable guest mode when registering
          this.setGuestMode(false);
        }
      })
    );
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  private clearAuthData(): void {
    if (!this.isBrowser) return;
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  isGuestMode(): boolean {
    return this.guestModeSubject.value;
  }

  setGuestMode(enabled: boolean): void {
    if (!this.isBrowser) return;
    
    localStorage.setItem(this.GUEST_KEY, enabled.toString());
    this.guestModeSubject.next(enabled);
    
    // If enabling guest mode, make sure user is logged out
    if (enabled) {
      this.clearAuthData();
    }
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setSession(response: AuthResponse): void {
    if (response.token) {
      console.log('Setting session with token');
      localStorage.setItem(this.TOKEN_KEY, response.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
      this.userSubject.next(response.user);
      
      // Disable guest mode when setting session
      this.setGuestMode(false);
    }
  }

  enableGuestMode(): void {
    this.setGuestMode(true);
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }
}