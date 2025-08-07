/**
 * This page is dynamic and cannot be statically exported.
 * If you see a prerender/export error, do not use `next export` for this page.
 * See: https://nextjs.org/docs/messages/prerender-error
 */
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlineMail, AiOutlineLock, AiOutlineUser, AiOutlineCheck, AiOutlineExclamationCircle } from 'react-icons/ai';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import Image from 'next/image';

import { getOrganizationService } from '@/lib/services';
import { validateEmail, validatePassword, validateFullName } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function InvitationPageContent() {
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
              invitation_token: token,
            },
          },
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
          password,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
              <AiOutlineExclamationCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mb-2">Invalid Invitation</CardTitle>
            <CardDescription className="mb-6">{error}</CardDescription>
            <Button onClick={() => router.push('/auth/signup')} className="w-full">
              Sign Up Instead
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Left Side - Invitation Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-lg">
          {/* Invitation Header Card */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                <HiOutlineOfficeBuilding className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                Join {invitationData?.organization?.name}
              </CardTitle>
              <CardDescription className="text-base">
                <span className="font-medium">{invitationData?.inviter?.full_name || invitationData?.inviter?.email}</span> 
                {' '}invited you to join as{' '}
                <Badge variant="secondary" className="ml-1">
                  {invitationData?.role}
                </Badge>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Auth Form Card */}
          <Card>
            <CardHeader>
              {/* Mode Toggle */}
              <div className="flex rounded-lg bg-muted p-1 mb-4">
                <Button
                  type="button"
                  variant={mode === 'signin' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode('signin')}
                >
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant={mode === 'signup' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode('signup')}
                >
                  Create Account
                </Button>
              </div>
              <CardDescription>
                {mode === 'signin' 
                  ? 'Already have an account? Sign in to accept the invitation'
                  : 'New to Monade? Create an account to get started'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Google Auth */}
              <Button
                onClick={handleGoogleAuth}
                disabled={submitting}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <FcGoogle className="w-5 h-5 mr-2" />
                {submitting ? 'Processing...' : 'Continue with Google'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name (signup only) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium">
                      Full name
                    </label>
                    <div className="relative">
                      <AiOutlineUser className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </label>
                  <div className="relative">
                    <AiOutlineMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={true} // Email is pre-filled from invitation
                      className="pl-10 bg-muted"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <AiOutlineCheck className="h-3 w-3 mr-1 text-green-600" />
                    Email verified from invitation
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <AiOutlineLock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
                    <div className="flex items-center">
                      <AiOutlineExclamationCircle className="h-4 w-4 text-destructive mr-2" />
                      <div className="text-sm text-destructive">{error}</div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting 
                    ? 'Processing...' 
                    : mode === 'signup' 
                      ? 'Create Account & Join' 
                      : 'Sign In & Join'
                  }
                </Button>
              </form>

              {/* Footer Links */}
              <div className="text-center text-sm text-muted-foreground">
                {mode === 'signin' ? (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-primary hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <Image
              src="/side_image.png" 
              alt="AI Assistant Illustration"
              width={400}  
              height={400}
              className="max-w-md opacity-90 mb-8"
            />
            <h2 className="text-2xl font-bold mb-4">Welcome to Monade</h2>
            <p className="text-lg opacity-90">
              Join your team and start building amazing AI assistants together
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <Suspense>
      <InvitationPageContent />
    </Suspense>
  );
}
