import type { LoginCredentials, SignupCredentials, ChangePasswordRequest, UserOut, ForgotPasswordInfo, ResetPasswordInfo} from '../types/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

export const AuthService = {
    async login(credentials: LoginCredentials): Promise<UserOut> {
        const response = await fetch(`${API_BASE}/api/v1/unauth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Login failed');
        return response.json();
    },

    async googleAuth(token: string): Promise<void> {
        const response = await fetch (`${API_BASE}/api/v1/unauth/google-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token }),
        });
        if (!response.ok) throw new Error('Google login failed');
    },
    
    async signup(credentials: SignupCredentials): Promise<UserOut> {
    const response = await fetch(`${API_BASE}/api/v1/unauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Signup failed');
    return response.json();
  },
  
    async changePassword(data: ChangePasswordRequest): Promise<void> {
        const res = await fetch(`${API_BASE}/api/v1/unauth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Password change failed')
        }
    },

    async logout(): Promise<void> {
        await fetch(`${API_BASE}/api/v1/unauth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    },

    async checkSession(): Promise<UserOut | null> {
        const res = await fetch (`${API_BASE}/api/v1/unauth/me`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!res.ok) return null;
        return res.json();
    },

    async forgotPassword(email: ForgotPasswordInfo): Promise<void> {
        const response = await fetch(`${API_BASE}/api/v1/unauth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(email),
        });
        if (!response.ok) throw new Error('Failed to send reset email');
    },

    async resetPassword(data: ResetPasswordInfo): Promise<void> {
        const response = await fetch(`${API_BASE}/api/v1/unauth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to reset password');
    },
};