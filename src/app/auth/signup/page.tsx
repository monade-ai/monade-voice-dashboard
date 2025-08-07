'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlineMail, AiOutlineLock, AiOutlineUser, AiOutlineBank } from 'react-icons/ai';
import Image from 'next/image';

import { getOrganizationService } from '@/lib/services';
import { validateEmail, validatePassword, validateFullName, validateOrganizationName } from '@/types';
import { AUTH_CONFIG, ClientRateLimiter, isRateLimitError, getRateLimitMessage } from '@/lib/auth/auth-config';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const organizationService = getOrganizationService();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgMode, setOrgMode] = useState(false);
  const [step, setStep] = useState<'auth' | 'email-verification'>('auth');

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard'); 
      }
    };
  
    checkUserSession();
  }, [router, supabase]);

  const validateForm = () => {
    const emailErrors = validateEmail(email);
    const passwordErrors = validatePassword(password);
    const nameErrors = validateFullName(fullName);
    const orgErrors = orgMode ? validateOrganizationName(organizationName) : [];

    const allErrors = [...emailErrors, ...passwordErrors, ...nameErrors, ...orgErrors];
    
    if (allErrors.length > 0) {
      setError(allErrors[0].message);

      return false;
    }
    
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check client-side rate limiting
    const rateLimitKey = `signup_${email}`;
    if (!ClientRateLimiter.canAttempt(rateLimitKey, AUTH_CONFIG.RATE_LIMITS.SIGNUP_ATTEMPTS, 10 * 60 * 1000)) {
      const remainingTime = ClientRateLimiter.getRemainingTime(rateLimitKey, 10 * 60 * 1000);
      const minutes = Math.ceil(remainingTime / (60 * 1000));
      setError(`Too many signup attempts. Please wait ${minutes} minute(s) before trying again.`);

      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Record the attempt
      ClientRateLimiter.recordAttempt(rateLimitKey);
      
      // Step 1: Create Supabase auth user with email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            account_type: orgMode ? 'organization' : 'personal',
            organization_name: orgMode ? organizationName : undefined,
          },
        },
      });

      if (authError) {
        // Handle rate limiting errors with user-friendly messages
        if (isRateLimitError(authError)) {
          setError(getRateLimitMessage(authError));
        } else {
          setError(authError.message);
        }

        return;
      }

      if (!authData.user) {
        setError('Failed to create user account');

        return;
      }

      // Check if email confirmation is required
      if (!authData.user.email_confirmed_at) {
        // Show email verification step
        setStep('email-verification');

        return;
      }

      // If email is already confirmed (shouldn't happen in normal flow)
      await completeSignupProcess(authData.user);

    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle rate limiting and other errors
      if (isRateLimitError(error)) {
        setError(getRateLimitMessage(error));
      } else {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const completeSignupProcess = async (user: any) => {
    try {
      // Note: Organization creation is handled in the auth callback
      // This function is only called for immediate email confirmation (rare case)
      
      // Just redirect to dashboard - the auth callback will handle the rest
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup completion error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleResendVerification = async () => {
    // Check client-side rate limiting for resend
    const resendKey = `resend_${email}`;
    if (!ClientRateLimiter.canAttempt(resendKey, AUTH_CONFIG.EMAIL_VERIFICATION.MAX_RESEND_ATTEMPTS, 60 * 60 * 1000)) {
      const remainingTime = ClientRateLimiter.getRemainingTime(resendKey, 60 * 60 * 1000);
      const minutes = Math.ceil(remainingTime / (60 * 1000));
      setError(`Too many resend attempts. Please wait ${minutes} minute(s) before trying again.`);

      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Record the resend attempt
      ClientRateLimiter.recordAttempt(resendKey);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (isRateLimitError(error)) {
          setError(getRateLimitMessage(error));
        } else {
          setError(error.message);
        }
      } else {
        // Show success message briefly
        setError(null);
        // Show temporary success message
        const successMsg = 'Verification email sent! Please check your inbox.';
        setError(successMsg);
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        setError(getRateLimitMessage(error));
      } else {
        setError('Failed to resend verification email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
  
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          account_type: orgMode ? 'organization' : 'personal',
          organization_name: orgMode ? organizationName : undefined,
        },
      },
    });
  
    setLoading(false);
  
    if (error) {
      setError(error.message);
    }
  };

  // Listen for email verification completion
  useEffect(() => {
    if (step === 'email-verification') {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          // Email verified! Complete the signup process
          setLoading(true);
          setError(null);
          
          try {
            await completeSignupProcess(session.user);
          } catch (error) {
            console.error('Error completing signup after verification:', error);
            setError('Failed to complete account setup. Please try signing in.');
          } finally {
            setLoading(false);
          }
        }
      });

      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, [step, supabase, orgMode, organizationName, email, fullName]);

  // Email Verification Step Component
  if (step === 'email-verification') {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <AiOutlineMail className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Check your email
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                We've sent a verification link to <span className="font-medium">{email}</span>
              </p>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-2">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the verification link in the email</li>
                    <li>You'll be automatically redirected to complete setup</li>
                  </ol>
                </div>
              </div>
              
              {/* Real-time verification status */}
              <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span>Waiting for email verification...</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
              {/* Resend Email */}
              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <span className="text-sm text-gray-600">
                  Already verified?{' '}
                  <a href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign in here
                  </a>
                </span>
              </div>

              {/* Change Email */}
              <div className="text-center">
                <button
                  onClick={() => setStep('auth')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Use a different email address
                </button>
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

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Signup Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Join monade.ai
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Create your account to get started with AI assistants
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
                Create an organization account and become the owner
              </p>
            )}
          </div>

          {/* Google Signup */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            {loading ? 'Creating account...' : 'Continue with Google'}
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

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AiOutlineUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Create a password"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Organization Name (if org mode) */}
            {orgMode && (
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  Organization name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AiOutlineBank className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required={orgMode}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter organization name"
                  />
                </div>
              </div>
            )}

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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6">
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
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
