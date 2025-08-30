import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { BehaviorSubject, Observable, of } from "rxjs"
import { map, catchError, tap, retry, delay, filter } from "rxjs/operators"
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
  private initializationComplete = false;
  private initializationSubject = new BehaviorSubject<boolean>(false);
  public initialization$ = this.initializationSubject.asObservable();

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
    if (!this.isBrowser) {
      this.initializationSubject.next(true);
      return;
    }
    
    
    // Check for guest mode
    const isGuestMode = localStorage.getItem(this.GUEST_KEY) === 'true';
    this.guestModeSubject.next(isGuestMode);
    
    // Check for token
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = this.getUserFromStorage();
    
    
    if (token && user) {
      // Set the user from storage immediately to prevent flickering
      this.userSubject.next(user);
      
      // Complete initialization immediately for better UX
      // The token will be validated silently in the background
      this.initializationComplete = true;
      this.initializationSubject.next(true);
      
      // Validate token with backend silently in the background
      // If validation fails due to network issues, user stays logged in
      this.validateToken().subscribe({
        next: (isValid) => {
        },
        error: (error) => {
        }
      });
    } else if (token && !user) {
      // If we have a token but no user data, try to get user info
      this.validateToken().subscribe({
        next: () => {
          this.initializationComplete = true;
          this.initializationSubject.next(true);
        },
        error: () => {
          this.initializationComplete = true;
          this.initializationSubject.next(true);
        }
      });
    } else {
      // No token and no user - initialization complete
      this.initializationComplete = true;
      this.initializationSubject.next(true);
    }
  }

  validateToken(): Observable<boolean> {
    if (!this.isBrowser || this.isValidatingToken) return of(false);
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      this.clearAuthData();
      return of(false);
    }
    
    this.isValidatingToken = true;
    
    return this.apiService.get<User>('auth/me').pipe(
      tap(user => {
        this.userSubject.next(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.isValidatingToken = false;
      }),
      map(() => true),
      catchError(error => {
        this.isValidatingToken = false;
        
        // Only clear auth data if we get a clear authentication error (401/403)
        // Don't clear on network errors, server errors, etc.
        if (error.status === 401 || error.status === 403) {
          this.clearAuthData();
          return of(false);
        }
        
        // For other errors (network, server issues), keep the user logged in
        // They can still use the app and try again later
        return of(true); // Return true to keep user logged in
      })
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<any>('auth/login', credentials).pipe(
      tap(apiResponse => {
        
        // Handle wrapped API response format {success: true, data: {...}}
        const response = apiResponse.data || apiResponse;
        
        
        if (response.token && response.user) {
          
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.userSubject.next(response.user);
          
          
          // Disable guest mode when logging in
          this.setGuestMode(false);
        } else {
        }
      }),
      map(apiResponse => apiResponse.data || apiResponse)
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.apiService.post<any>('auth/register', userData).pipe(
      tap(apiResponse => {
        
        // Handle wrapped API response format {success: true, data: {...}}
        const response = apiResponse.data || apiResponse;
        
        if (response.token && response.user) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.userSubject.next(response.user);
          
          // Disable guest mode when registering
          this.setGuestMode(false);
        }
      }),
      map(apiResponse => apiResponse.data || apiResponse)
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
    // Check both in-memory state and localStorage for reliability
    const memoryUser = this.userSubject.value;
    const token = this.isBrowser ? localStorage.getItem(this.TOKEN_KEY) : null;
    const result = !!(memoryUser && token);
    
    
    return result;
  }

  isGuestMode(): boolean {
    // Get from local subject (more reliable than store for session persistence)
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
      localStorage.setItem(this.TOKEN_KEY, response.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
      this.userSubject.next(response.user);
      
      // Disable guest mode when setting session
      this.setGuestMode(false);
    }
  }

  enableGuestMode(): void {
    // First clear any existing auth data
    this.clearAuthData();
    
    // Then set guest mode
    localStorage.setItem(this.GUEST_KEY, 'true');
    this.guestModeSubject.next(true);
    
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  waitForInitialization(): Observable<boolean> {
    if (this.initializationComplete) {
      return of(true);
    }
    
    return this.initializationSubject.asObservable().pipe(
      filter(complete => complete),
      map(() => true)
    );
  }
}