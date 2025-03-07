import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { BehaviorSubject, Observable, from } from "rxjs"
import { delay, map, catchError } from "rxjs/operators"
import { createClient } from "@libsql/client"
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "../models/user.model"
import { Router } from "@angular/router"
import { isPlatformBrowser } from '@angular/common'

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly TOKEN_KEY = "auth_token"
  private readonly USER_KEY = "user"
  private client = createClient({
    url: "libsql://notex-nixixo.turso.io", // Replace with your db URL
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDEyMzAzNDMsImlkIjoiZGE3MjczNmUtMGY3OC00YzVkLTlkMTYtZGQ4ZTg4OWM2ZWZjIn0.WG8YgocNf2Vbugg_6jVZi09dXnGqjqJ1NFrmAkmEpMCT-DdgM2V2rr_IlvBLc2YpOhChu2FrXUrjXizFdpw7Bg" // Replace with your db token
  })
  private userSubject = new BehaviorSubject<User | null>(this.getUserFromStorage())
  public user$ = this.userSubject.asObservable()
  private isBrowser: boolean

  constructor(
    @Inject(Router) private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId)
    this.initDatabase()
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser) return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private async initDatabase() {
    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("Users table initialized")
    } catch (error) {
      console.error("Error initializing users table:", error)
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return from(
      this.client.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [credentials.username],
      })
    ).pipe(
      delay(800),
      map((result) => {
        const userRow = result.rows[0]
        if (!userRow) throw new Error("User not found")
        if (userRow["password"] !== credentials.password) throw new Error("Invalid credentials")
        
        const user: User = {
          id: userRow["id"] as string,
          username: userRow["username"] as string,
        }
        const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDEyMzAzNDMsImlkIjoiZGE3MjczNmUtMGY3OC00YzVkLTlkMTYtZGQ4ZTg4OWM2ZWZjIn0.WG8YgocNf2Vbugg_6jVZi09dXnGqjqJ1NFrmAkmEpMCT-DdgM2V2rr_IlvBLc2YpOhChu2FrXUrjXizFdpw7Bg" // Replace with real token from server
        this.setSession({ user, token })
        return { user, token }
      }),
      catchError((error) => {
        console.error("Login error:", error)
        throw error
      })
    )
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    const id = Date.now().toString()
    const now = new Date().toISOString()

    return from(
      this.client.execute({
        sql: `INSERT INTO users (id, username, password, createdAt, updatedAt) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, userData.username, userData.password, now, now],
      })
    ).pipe(
      delay(800),
      map(() => {
        const user: User = {
          id,
          username: userData.username,
        }
        const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDEyMzAzNDMsImlkIjoiZGE3MjczNmUtMGY3OC00YzVkLTlkMTYtZGQ4ZTg4OWM2ZWZjIn0.WG8YgocNf2Vbugg_6jVZi09dXnGqjqJ1NFrmAkmEpMCT-DdgM2V2rr_IlvBLc2YpOhChu2FrXUrjXizFdpw7Bg" // Replace with real token from server
        this.setSession({ user, token })
        return { user, token }
      }),
      catchError((error) => {
        console.error("Registration error:", error)
        throw error
      })
    )
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
    if (!this.isBrowser) return null
    return localStorage.getItem(this.TOKEN_KEY)
  }

  setSession(authResult: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.TOKEN_KEY, authResult.token)
      localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user))
    }
    this.userSubject.next(authResult.user)
  }

  public getCurrentUser(): User | null {
    return this.userSubject.value;
  }
}