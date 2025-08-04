'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlineMail, AiOutlineLock } from 'react-icons/ai';
import Image from 'next/image';
import { validateEmail } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgMode, setOrgMode] = useState(false);
  const [justSignedOut, setJustSignedOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Check if user just signed out
    const urlParams = new URLSearchParams(window.location.search);
    const signedOut = urlParams.get('signedOut');
    
    if (signedOut === 'true') {
      setJustSignedOut(true);
      // Clean up URL
      window.history.replaceState({}, '', '/auth/login');
    }
    
    const checkUserSession = async () => {
      // If user just signed out, skip session check for a moment
      if (signedOut === 'true') {
        console.log('User just signed out, skipping session check');
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Add delay to ensure sign out has fully propagated
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (!mounted) return;
      
      try {
        // First check session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError);
          return;
        }
        
        // If no session, stay on login page
        if (!sessionData?.session?.user) {
          console.log('No session found, staying on login page');
          setJustSignedOut(false);
          return;
        }
        
        // If user just signed out, force clear the session
        if (justSignedOut || signedOut === 'true') {
          console.log('User just signed out, clearing any remaining session');
          await supabase.auth.signOut();
          setJustSignedOut(false);
          return;
        }
        
        // Double-check with getUser() to ensure session is actually valid
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error validating user:', userError);
          // Clear invalid session
          await supabase.auth.signOut();
          return;
        }
        
        if (userData?.user && mounted && !justSignedOut) {
          console.log('Valid session found, redirecting to dashboard');
          router.push('/dashboard'); 
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    // Listen for auth state changes to handle sign out properly
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Login page auth state change:', event);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, staying on login page');
        // Clear any form errors when user signs out
        setError(null);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, redirecting to dashboard');
        // Add small delay to ensure auth state is fully updated
        setTimeout(() => {
          if (mounted) {
            router.push('/dashboard');
          }
        }, 100);
      }
    });
  
    checkUserSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    const emailErrors = validateEmail(email);
    if (emailErrors.length > 0) {
      setError(emailErrors[0].message);
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    const redirectUrl = `${window.location.origin}/auth/callback`;
    console.log('[Login] Starting Google OAuth with redirect:', redirectUrl);
    console.log('[Login] Current origin:', window.location.origin);
  
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          account_type: orgMode ? 'organization' : 'personal'
        }
      },
    });
  
    console.log('[Login] OAuth response:', { error });
    setLoading(false);
  
    if (error) {
      console.error('[Login] OAuth error:', error);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your monade.ai account
            </p>
          </div>

          {/* Account Type Toggle */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-all ${
                  !orgMode 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setOrgMode(false)}
              >
                Personal
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-all ${
                  orgMode 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setOrgMode(true)}
              >
                Organization
              </button>
            </div>
            {orgMode && (
              <p className="mt-2 text-xs text-blue-600">
                Sign in to your organization account
              </p>
            )}
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AiOutlineMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AiOutlineLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <div className="text-sm">
                <a href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6">
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <Image
            src="/side_image.png" 
            alt="AI Assistant Illustration"
            width={400}  
            height={400}
            className="max-w-md opacity-90"
          />
        </div>
      </div>
    </div>
  );
}
