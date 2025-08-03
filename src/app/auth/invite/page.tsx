'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlineMail, AiOutlineLock, AiOutlineUser } from 'react-icons/ai';
import Image from 'next/image';
import { getOrganizationService } from '@/lib/services';
import { validateEmail, validatePassword, validateFullName } from '@/types';

export default function InvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const organizationService = getOrganizationService();
  
  const [token] = useState(searchParams.get('token') || '');
  const [invitationData, setInvitationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Get invitation details
        const { data, error } = await supabase
          .from('invitation_tokens')
          .select(`
            *,
            organization:organizations(*),
            inviter:user_profiles!invited_by(*)
          `)
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .single();

        if (error || !data) {
          setError('Invalid or expired invitation');
          setLoading(false);
          return;
        }

        setInvitationData(data);
        setEmail(data.email);
        
        // Check if user already exists
        const { data: existingUser } = await supabase.auth.getUser();
        if (existingUser?.user) {
          // User is already signed in, just accept the invitation
          await acceptInvitation();
          return;
        }

      } catch (error) {
        console.error('Error loading invitation:', error);
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, supabase]);

  const acceptInvitation = async () => {
    try {
      const response = await organizationService.acceptInvitation({ token });
      
      if (response.success) {
        router.push('/dashboard');
      } else {
        setError(response.error?.message || 'Failed to accept invitation');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to accept invitation');
    }
  };

  const validateForm = () => {
    if (mode === 'signup') {
      const emailErrors = validateEmail(email);
      const passwordErrors = validatePassword(password);
      const nameErrors = validateFullName(fullName);
      
      const allErrors = [...emailErrors, ...passwordErrors, ...nameErrors];
      
      if (allErrors.length > 0) {
        setError(allErrors[0].message);
        return false;
      }
    } else {
      const emailErrors = validateEmail(email);
      if (emailErrors.length > 0) {
        setError(emailErrors[0].message);
        return false;
      }
      
      if (!password) {
        setError('Password is required');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // Sign up new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              invitation_token: token
            }
          }
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (!authData.user) {
          setError('Failed to create account');
          return;
        }

        // Accept invitation
        await acceptInvitation();
        
      } else {
        // Sign in existing user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        // Accept invitation
        await acceptInvitation();
      }

    } catch (error) {
      console.error('Invitation acceptance error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invitation_token=${token}`,
      },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Invitation</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/signup')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Sign Up Instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Invitation Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Join {invitationData?.organization?.name}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              You've been invited by {invitationData?.inviter?.full_name || invitationData?.inviter?.email} 
              to join as {invitationData?.role}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-all ${
                  mode === 'signin' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setMode('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-all ${
                  mode === 'signup' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setMode('signup')}
              >
                Create Account
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {mode === 'signin' 
                ? 'Already have an account? Sign in to accept the invitation'
                : 'New to monade.ai? Create an account to get started'
              }
            </p>
          </div>

          {/* Google Auth */}
          <button
            onClick={handleGoogleAuth}
            disabled={submitting}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            {submitting ? 'Processing...' : 'Continue with Google'}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Full Name (signup only) */}
            {mode === 'signup' && (
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
            )}

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
                  disabled={true} // Email is pre-filled from invitation
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 bg-gray-50 text-gray-500 sm:text-sm"
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
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                />
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              )}
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
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting 
                ? 'Processing...' 
                : mode === 'signup' 
                  ? 'Create Account & Join' 
                  : 'Sign In & Join'
              }
            </button>
          </form>
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