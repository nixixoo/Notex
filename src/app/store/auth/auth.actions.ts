import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../../models/user.model';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    // Login Actions
    'Login': props<{ credentials: LoginRequest }>(),
    'Login Success': props<{ response: AuthResponse }>(),
    'Login Failure': props<{ error: string }>(),

    // Register Actions
    'Register': props<{ userData: RegisterRequest }>(),
    'Register Success': props<{ response: AuthResponse }>(),
    'Register Failure': props<{ error: string }>(),

    // Guest Mode
    'Enter Guest Mode': emptyProps(),
    'Exit Guest Mode': emptyProps(),

    // Token Management
    'Validate Token': emptyProps(),
    'Token Valid': props<{ user: User }>(),
    'Token Invalid': emptyProps(),
    'Refresh Token': emptyProps(),
    'Refresh Token Success': props<{ token: string }>(),
    'Refresh Token Failure': emptyProps(),

    // Logout
    'Logout': emptyProps(),
    'Logout Success': emptyProps(),

    // User Management
    'Load User': emptyProps(),
    'Load User Success': props<{ user: User }>(),
    'Load User Failure': props<{ error: string }>(),

    // Activity Tracking
    'Update Last Activity': emptyProps(),

    // Error Handling
    'Clear Auth Error': emptyProps(),
  }
});