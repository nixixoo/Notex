import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { initialAuthState, AuthState } from './auth.state';

export const authReducer = createReducer(
  initialAuthState,

  // Login
  on(AuthActions.login, (state): AuthState => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(AuthActions.loginSuccess, (state, { response }): AuthState => ({
    ...state,
    user: response.user,
    token: response.token,
    isLoggedIn: true,
    isGuestMode: false,
    isLoading: false,
    error: null,
    lastActivity: new Date(),
  })),

  on(AuthActions.loginFailure, (state, { error }): AuthState => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Register
  on(AuthActions.register, (state): AuthState => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(AuthActions.registerSuccess, (state, { response }): AuthState => ({
    ...state,
    user: response.user,
    token: response.token,
    isLoggedIn: true,
    isGuestMode: false,
    isLoading: false,
    error: null,
    lastActivity: new Date(),
  })),

  on(AuthActions.registerFailure, (state, { error }): AuthState => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Guest Mode
  on(AuthActions.enterGuestMode, (state): AuthState => ({
    ...state,
    isGuestMode: true,
    isLoggedIn: false,
    user: null,
    token: null,
    error: null,
  })),

  on(AuthActions.exitGuestMode, (state): AuthState => ({
    ...state,
    isGuestMode: false,
  })),

  // Token Management
  on(AuthActions.validateToken, (state): AuthState => ({
    ...state,
    isLoading: true,
  })),

  on(AuthActions.tokenValid, (state, { user }): AuthState => ({
    ...state,
    user,
    isLoggedIn: true,
    isLoading: false,
    error: null,
    lastActivity: new Date(),
  })),

  on(AuthActions.tokenInvalid, (state): AuthState => ({
    ...state,
    user: null,
    token: null,
    isLoggedIn: false,
    isLoading: false,
    error: 'Session expired',
  })),

  // Refresh Token
  on(AuthActions.refreshTokenSuccess, (state, { token }): AuthState => ({
    ...state,
    token,
    lastActivity: new Date(),
  })),

  on(AuthActions.refreshTokenFailure, (state): AuthState => ({
    ...state,
    token: null,
    isLoggedIn: false,
    user: null,
    error: 'Session expired',
  })),

  // Logout
  on(AuthActions.logout, (state): AuthState => ({
    ...state,
    isLoading: true,
  })),

  on(AuthActions.logoutSuccess, (): AuthState => ({
    ...initialAuthState,
  })),

  // User Management
  on(AuthActions.loadUser, (state): AuthState => ({
    ...state,
    isLoading: true,
  })),

  on(AuthActions.loadUserSuccess, (state, { user }): AuthState => ({
    ...state,
    user,
    isLoading: false,
    error: null,
  })),

  on(AuthActions.loadUserFailure, (state, { error }): AuthState => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Activity Tracking
  on(AuthActions.updateLastActivity, (state): AuthState => ({
    ...state,
    lastActivity: new Date(),
  })),

  // Error Handling
  on(AuthActions.clearAuthError, (state): AuthState => ({
    ...state,
    error: null,
  }))
);