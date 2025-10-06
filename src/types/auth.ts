export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: string;
}

export interface LoginRequest {
  provider: 'google';
  redirectTo?: string;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}