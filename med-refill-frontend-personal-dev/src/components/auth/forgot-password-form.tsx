import React, { useState } from 'react';
import { AuthService } from '../../services/AuthService';
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

export const ForgotPasswordForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await AuthService.forgotPassword({ email });
            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
                <div className="text-gray-600 mb-4">
                            <p className="text-sm font-medium mb-2">We've sent a password reset link to:</p>
                            <p className="font-semibold text-gray-800 bg-gray-50 rounded-lg p-2 text-sm">{email}</p>
                </div>
                        <div className="text-xs text-gray-500 space-y-1">
                    <p>Click the link in the email to reset your password.</p>
                            <p>The link will expire in 1 hour for security.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-100 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-600">No worries, we'll send you reset instructions</p>
                    </div>

                    {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                                    id="email"
                        type="email"
                                    placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                        required
                    />
                            </div>
                </div>

                {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <p className="text-red-700 text-xs font-medium">{error}</p>
                                </div>
                    </div>
                )}

                <button
                    type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Sending...</span>
                                </div>
                            ) : (
                                'Send Reset Link'
                            )}
                </button>
            </form>
                </div>
            </div>
        </div>
    );
}; 