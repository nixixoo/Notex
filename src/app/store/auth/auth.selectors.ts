import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

// Basic selectors
export const selectUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectToken = createSelector(
  selectAuthState,
  (state: AuthState) => state.token
);

export const selectIsLoggedIn = createSelector(
  selectAuthState,
  (state: AuthState) => state.isLoggedIn
);

export const selectIsGuestMode = createSelector(
  selectAuthState,
  (state: AuthState) => state.isGuestMode
);

export const selectIsLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.isLoading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectLastActivity = createSelector(
  selectAuthState,
  (state: AuthState) => state.lastActivity
);

// Composite selectors
export const selectIsAuthenticated = createSelector(
  selectIsLoggedIn,
  selectIsGuestMode,
  (isLoggedIn, isGuestMode) => isLoggedIn || isGuestMode
);

export const selectUserProfile = createSelector(
  selectUser,
  selectIsLoggedIn,
  (user, isLoggedIn) => ({
    user,
    isLoggedIn,
    hasProfile: !!user && isLoggedIn
  })
);

export const selectAuthStatus = createSelector(
  selectIsLoggedIn,
  selectIsGuestMode,
  selectIsLoading,
  selectAuthError,
  (isLoggedIn, isGuestMode, isLoading, error) => ({
    isLoggedIn,
    isGuestMode,
    isAuthenticated: isLoggedIn || isGuestMode,
    isLoading,
    hasError: !!error,
    error
  })
);

// Session management
export const selectSessionInfo = createSelector(
  selectToken,
  selectLastActivity,
  (token, lastActivity) => ({
    hasValidToken: !!token,
    lastActivity,
    isSessionActive: !!token && !!lastActivity,
    sessionAge: lastActivity ? Date.now() - lastActivity.getTime() : 0
  })
);