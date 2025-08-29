import { inject } from "@angular/core"
import { type CanActivateFn, Router } from "@angular/router"
import { AuthService } from "../services/auth.service"
import { map, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On browser, do immediate check of localStorage for better UX
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    
    // If we have valid session data, allow access immediately
    if ((token && user) || isGuestMode) {
      console.log('AuthGuard: Access granted - Session data found in localStorage');
      return of(true);
    }
  }

  // Fallback to the full initialization check
  return authService.waitForInitialization().pipe(
    map(() => {
      // Allow access if user is logged in OR in guest mode
      if (authService.isLoggedIn() || authService.isGuestMode()) {
        console.log('AuthGuard: Access granted - User logged in:', authService.isLoggedIn(), 'Guest mode:', authService.isGuestMode());
        return true;
      }

      console.log('AuthGuard: Access denied - Redirecting to login');
      router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
      return false;
    })
  );
};