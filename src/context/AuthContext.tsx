import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthState, LoginCredentials, SignupCredentials, ChangePasswordRequest } from '../types/auth';
import { AuthService } from '../services/AuthService';


export interface AuthContextType {
    authState: AuthState;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    loginWithGoogle: (token: string) => Promise<void>
    signup: (credentials: SignupCredentials) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (data: ChangePasswordRequest) => Promise<void>;
}

const defaultAuthState: AuthState = {
    isAuthenticated: false,
    user: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
    const [isLoading, setIsLoading] = useState(true);



    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            const user = await AuthService.checkSession();
            setAuthState({
                isAuthenticated: !!user,
                user: user,
            });
            setIsLoading(false);
        };
        initializeAuth();
    }, []);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const user = await AuthService.login(credentials);
            setAuthState({
                isAuthenticated: true,
                user: user,
            });
        } catch (err: any) {
            setAuthState(defaultAuthState);
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithGoogle = async (token: string) => {
        setIsLoading(true);
        try {
            await AuthService.googleAuth(token);
            const user = await AuthService.checkSession();
            setAuthState({
                isAuthenticated: !!user,
                user: user,
            })
        } catch (err: any) {
            setAuthState(defaultAuthState);
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (credentials: SignupCredentials) => {
        setIsLoading(true);
        try {
            await AuthService.signup(credentials);
            setAuthState(defaultAuthState);
        } catch (err: any) {
            setAuthState(defaultAuthState);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await AuthService.logout();
            setAuthState(defaultAuthState);
        } finally {
            setIsLoading(false);
        }
    };

    const changePassword = async (data: ChangePasswordRequest) => {
        setIsLoading(true);
        try {
            await AuthService.changePassword(data);
        } catch (err: any) {
        } finally {
            setIsLoading(false);
        }
    }



    return (
        <AuthContext.Provider
            value={{
                authState,
                isLoading,
                login,
                loginWithGoogle,
                signup,
                logout,
                changePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if(!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}



