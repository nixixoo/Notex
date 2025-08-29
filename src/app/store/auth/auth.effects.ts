import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import { AuthActions } from './auth.actions';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { selectToken, selectIsLoggedIn } from './auth.selectors';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private store = inject(Store);

  // Login Effect
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ credentials }) =>
        this.apiService.post<any>('auth/login', credentials).pipe(
          map((response) => {
            // Save to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', response.data.token);
              localStorage.setItem('user', JSON.stringify(response.data.user));
              localStorage.removeItem('guest_mode'); // Clear guest mode on login
            }
            return AuthActions.loginSuccess({ response: response.data });
          }),
          catchError((error) => {
            const errorMessage = error.error?.error || 'Login failed';
            return of(AuthActions.loginFailure({ error: errorMessage }));
          })
        )
      )
    )
  );

  // Register Effect
  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      switchMap(({ userData }) =>
        this.apiService.post<any>('auth/register', userData).pipe(
          map((response) => {
            // Save to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', response.data.token);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return AuthActions.registerSuccess({ response: response.data });
          }),
          catchError((error) => {
            const errorMessage = error.error?.error || 'Registration failed';
            return of(AuthActions.registerFailure({ error: errorMessage }));
          })
        )
      )
    )
  );

  // Token Validation Effect
  validateToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.validateToken),
      withLatestFrom(this.store.select(selectToken)),
      switchMap(([_, token]) => {
        if (!token) {
          return of(AuthActions.tokenInvalid());
        }

        return this.apiService.get<any>('auth/me').pipe(
          map((response) => {
            // Clear guest mode when token is valid
            if (typeof window !== 'undefined') {
              localStorage.removeItem('guest_mode');
            }
            return AuthActions.tokenValid({ user: response.data });
          }),
          catchError(() => of(AuthActions.tokenInvalid()))
        );
      })
    )
  );

  // Logout Effect
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('guest_mode');
        }
      }),
      map(() => AuthActions.logoutSuccess())
    )
  );

  // Load User Effect
  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadUser),
      withLatestFrom(this.store.select(selectIsLoggedIn)),
      switchMap(([_, isLoggedIn]) => {
        if (!isLoggedIn) {
          return of(AuthActions.loadUserFailure({ error: 'Not authenticated' }));
        }

        return this.apiService.get<any>('auth/me').pipe(
          map((response) => AuthActions.loadUserSuccess({ user: response.data })),
          catchError((error) => {
            const errorMessage = error.error?.error || 'Failed to load user';
            return of(AuthActions.loadUserFailure({ error: errorMessage }));
          })
        );
      })
    )
  );

  // Navigation Effects
  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess, AuthActions.registerSuccess),
        tap(() => {
          this.notificationService.showSuccess('Welcome to Notex!');
          this.router.navigate(['/notes']);
        })
      ),
    { dispatch: false }
  );

  loginFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginFailure, AuthActions.registerFailure),
        tap(({ error }) => {
          this.notificationService.showError(error);
        })
      ),
    { dispatch: false }
  );

  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess),
        tap(() => {
          this.notificationService.showInfo('You have been logged out');
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

  // Temporarily disabled - AuthService handles session management
  // tokenInvalid$ = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(AuthActions.tokenInvalid, AuthActions.refreshTokenFailure),
  //       tap((action) => {
  //         console.log('TokenInvalid effect triggered:', action);
  //         this.notificationService.showWarning('Your session has expired. Please login again.');
  //         this.router.navigate(['/login']);
  //       })
  //     ),
  //   { dispatch: false }
  // );

  // Guest Mode Effects
  enterGuestMode$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.enterGuestMode),
        tap(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('guest_mode', 'true');
          }
          this.notificationService.showInfo('Entering guest mode');
          this.router.navigate(['/notes']);
        })
      ),
    { dispatch: false }
  );

  exitGuestMode$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.exitGuestMode),
        tap(() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('guest_mode');
          }
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

}