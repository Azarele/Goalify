import React, { useState, useEffect } from 'react';
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';

export const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signUp, signIn, signInWithGoogle, isConfigured } = useAuth();

  useEffect(() => {
    // Check for error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'callback_failed') {
      setError('Authentication failed. Please try again.');
    }
  }, []);

  // Show configuration error if Supabase is not configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Configuration Required</h1>
            <p className="text-purple-300">Supabase environment variables are missing</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-purple-800/30 rounded-2xl p-8 border border-purple-500/20 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-red-300 mb-2">Missing Environment Variables</h3>
                <p className="text-red-200 text-sm mb-3">
                  Please ensure your .env file contains the following variables:
                </p>
                <div className="bg-slate-900/50 rounded p-3 font-mono text-xs text-gray-300">
                  <div>VITE_SUPABASE_URL=your_supabase_url</div>
                  <div>VITE_SUPABASE_ANON_KEY=your_supabase_anon_key</div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-blue-300 mb-2">For Netlify Deployment</h3>
                <p className="text-blue-200 text-sm">
                  Make sure to set these environment variables in your Netlify site settings under 
                  "Environment variables" section.
                </p>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          // Handle specific "user already exists" error
          if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
            setError('An account with this email already exists. Please try signing in instead.');
            // Automatically switch to sign in mode after a brief delay
            setTimeout(() => {
              setIsSignUp(false);
              setError('');
            }, 3000);
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Check your email for the confirmation link!');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Don't set loading to false here as we're redirecting
    } catch (err) {
      setError('Failed to sign in with Google');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Goalify
          </h1>
          <p className="text-purple-300">Your AI Coaching Companion</p>
        </div>

        {/* Auth Form */}
        <div className="bg-gradient-to-br from-slate-800/50 to-purple-800/30 rounded-2xl p-8 border border-purple-500/20 backdrop-blur-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-purple-300 text-sm">
              {isSignUp 
                ? 'Start your coaching journey today' 
                : 'Continue your growth journey'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <p className="text-green-300 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-purple-500/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-br from-slate-800/50 to-purple-800/30 text-purple-300">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mt-4 py-3 px-4 bg-white hover:bg-gray-50 text-gray-900 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-2 border border-gray-300"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin text-gray-600" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>Google</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
              className="text-purple-300 hover:text-white transition-colors text-sm disabled:opacity-50"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};