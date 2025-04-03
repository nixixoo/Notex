import { Injectable, Inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // API URLs
  private readonly PROD_API_URL = 'https://notex-backend-six.vercel.app/api';
  private readonly DEV_API_URL = 'http://localhost:3000/api';
  
  // Service properties
  private apiUrl: string;
  private readonly TOKEN_KEY = "auth_token"; // Match the key used in AuthService
  private readonly GUEST_KEY = "guest_mode"; // Match the key used in AuthService
  private useProxy: boolean = false; // Always disable proxy - we have proper CORS config now

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Determine if we're in production (Vercel) or development
    if (isPlatformBrowser(this.platformId)) {
      // Check if we're on Vercel by looking at the hostname
      const isVercel = window.location.hostname.includes('vercel.app');
      this.apiUrl = isVercel ? this.PROD_API_URL : this.DEV_API_URL;
    } else {
      // Default to production for SSR
      this.apiUrl = this.PROD_API_URL;
    }
  }

  // Helper method to get auth headers
  private getHeaders(): HttpHeaders {
    let token = null;
    let isGuestMode = false;
    
    // Only access localStorage in browser environment
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem(this.TOKEN_KEY);
      isGuestMode = localStorage.getItem(this.GUEST_KEY) === 'true';
      
      // Don't send any token if in guest mode
      if (isGuestMode) {
        token = null;
      } else {
      }
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest'
    });
    
    return headers;
  }

  // Helper to get the full URL with proxy if needed
  private getFullUrl(endpoint: string): string {
    // The apiUrl already includes /api/ so we don't need to add it again
    const url = `${this.apiUrl}/${endpoint}`;
    return url;
  }

  // Generic GET request
  get<T>(endpoint: string): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.http.get<T>(url, { 
      headers: this.getHeaders(),
      withCredentials: false
    });
  }

  // Generic POST request
  post<T>(endpoint: string, data: any): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.http.post<T>(url, data, { 
      headers: this.getHeaders(),
      withCredentials: false
    });
  }

  // Generic PUT request
  put<T>(endpoint: string, data: any): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.http.put<T>(url, data, { 
      headers: this.getHeaders(),
      withCredentials: false
    });
  }

  // Generic DELETE request
  delete<T>(endpoint: string): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.http.delete<T>(url, { 
      headers: this.getHeaders(),
      withCredentials: false
    });
  }
}
