import { User } from '../../models/user.model';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isGuestMode: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date | null;
}

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  isLoggedIn: false,
  isGuestMode: false,
  isLoading: false,
  error: null,
  lastActivity: null,
};