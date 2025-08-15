import React, { useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';

export const LoginForm: React.FC<{
    onSignupClick?: () => void;
    onForgotPasswordClick?: () => void;
}> = ({ onSignupClick, onForgotPasswordClick }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const { login, loginWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setIsLoading(true);
        try {
            await login({ email, password });
        } catch (err: any) {
            setLoginError('Invalid email or password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

  return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in to your account</h2>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Field */}
                        <div className="space-y-1">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
                                    id="email"
        type="email"
                                    placeholder="Enter your email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
        required
      />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
        value={password}
        onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
        required
      />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                            </div>
                            {/* Forgot Password Link - Right under password field */}
                            <div className="text-right">
                                <button 
                                    type="button"
                                    onClick={onForgotPasswordClick}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {loginError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-700 text-xs font-medium">{loginError}</p>
                            </div>
                        )}

                        {/* Submit Button */}
      <button
        type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        disabled={isLoading}
      >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                'Sign In'
                            )}
      </button>
    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white/80 px-2 text-gray-500">or continue with</span>
                        </div>
                    </div>

                    {/* Google Login */}
                    <div className="mb-6">
                        <div className="google-login-container">
                        <GoogleLogin
                            onSuccess={async credentialResponse => {
                                const token = credentialResponse.credential;
                                if (token) {
                                    await loginWithGoogle(token);
                                }
                            }}
                            onError={() => {
                        
                            }}
                                useOneTap={false}
                                type="standard"
                                theme="outline"
                                size="large"
                                text="continue_with"
                                shape="rectangular"
                        />
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <button 
                                type="button"
                                onClick={onSignupClick}
                                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                            >
                                Sign up
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
  );
};






