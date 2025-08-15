export interface LoginCredentials {
    email: string;
    password: string;
}

export interface SignupCredentials {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: UserOut | null;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface UserOut {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
}

export interface ForgotPasswordInfo {
    email: string;
}

export interface ResetPasswordInfo {
    token: string;
    new_password: string;
}


