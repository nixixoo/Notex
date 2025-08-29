// no-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On browser, do immediate check of localStorage
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    
    // If we have a real user session (token + user), redirect to notes
    // Guest mode should still allow access to login/register pages
    if (token && user && !isGuestMode) {
      console.log('NoAuthGuard: Access denied - Valid session found, redirecting to notes');
      router.navigate(['/notes']);
      return of(false);
    }
  }

  console.log('NoAuthGuard: Access granted - No valid session found');
  return of(true);
};