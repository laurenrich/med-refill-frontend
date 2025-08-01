import React, { useState, useEffect } from 'react';
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { ForgotPasswordForm } from "./forgot-password-form";
import { ResetPasswordForm } from "./reset-password-form"
import { ArrowLeft } from "lucide-react";

export const AuthFlow: React.FC = () => {
    const [showSignup, setShowSignup] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleSignupSuccess = () => setShowSignup(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            setResetToken(token);
            setShowResetPassword(true);
        }
    }, []);

    if (showSignup) {
        return (
            <div className="relative">
                <SignupForm onSuccess={handleSignupSuccess} onBackToLogin={() => setShowSignup(false)} />
              <button
                    className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                onClick={() => setShowSignup(false)}
              >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
              </button>
            </div>
          );
    }

    if (showForgotPassword) {
        return (
            <div className="relative">
                <ForgotPasswordForm />
                <button
                    className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                onClick={() => setShowForgotPassword(false)}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                </button>
            </div>
        );
    }

    if (showResetPassword && resetToken) {
        return (
            <div className="relative">
                <ResetPasswordForm token={resetToken} />
                <button
                    className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                onClick={() => setShowResetPassword(false)}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                </button>
            </div>
        );
    }

    return (
        <LoginForm 
            onSignupClick={() => setShowSignup(true)}
            onForgotPasswordClick={() => setShowForgotPassword(true)}
        />
    ); 
};

