import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const initGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On browser, do immediate check of localStorage
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    
    console.log('InitGuard: Checking session data', { hasToken: !!token, hasUser: !!user, isGuestMode });
    
    // If we have valid session data or guest mode, proceed
    if ((token && user) || isGuestMode) {
      console.log('InitGuard: Valid session found, allowing access');
      return of(true);
    }
    
    // No valid session, redirect to login
    console.log('InitGuard: No valid session, redirecting to login');
    router.navigate(['/login']);
    return of(false);
  }

  // Fallback for SSR
  return authService.waitForInitialization().pipe(
    map(() => {
      if (authService.isLoggedIn() || authService.isGuestMode()) {
        return true;
      }
      
      router.navigate(['/login']);
      return false;
    })
  );
};