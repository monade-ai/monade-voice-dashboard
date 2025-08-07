'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import { useAuth } from '@/lib/auth/AuthProvider';

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'timeout'>('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let isProcessing = true;

    const processAuth = async () => {
      try {
        console.log('[Callback] Starting auth processing...');
        setStatus('processing');
        setMessage('Verifying authentication...');

        const supabase = createClientComponentClient();
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Callback] Session error:', sessionError);
          throw new Error('Failed to verify authentication session');
        }

        if (!session?.user) {
          console.error('[Callback] No user in session');
          throw new Error('Authentication failed - no user found');
        }

        console.log('[Callback] User authenticated:', session.user.id);
        setMessage('Authentication successful, setting up your account...');

        // Give AuthProvider a moment to process the session, but don't wait too long
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isProcessing) return; // Component unmounted

        // Check if user needs onboarding
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('account_type, has_completed_onboarding')
          .eq('id', session.user.id)
          .single();

        if (!isProcessing) return; // Component unmounted

        if (profile?.account_type === 'organization' && !profile.has_completed_onboarding) {
          console.log('[Callback] Redirecting to onboarding');
          setMessage('Redirecting to onboarding...');
          setRedirecting(true);
          router.replace('/auth/onboarding');

          return;
        }

        // Success - redirect to dashboard
        console.log('[Callback] Redirecting to dashboard');
        setStatus('success');
        setMessage('Welcome! Redirecting to dashboard...');
        setRedirecting(true);
        
        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isProcessing) {
          router.replace('/dashboard');
        }

      } catch (error) {
        if (!isProcessing) return; // Component unmounted
        
        console.error('[Callback] Auth processing error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    // Set timeout for the entire process
    const timeoutId = setTimeout(() => {
      if (isProcessing) {
        console.error('[Callback] Auth processing timeout');
        setStatus('timeout');
        setMessage('Authentication is taking longer than expected');
        isProcessing = false;
      }
    }, 15000); // 15 second timeout

    processAuth();

    return () => {
      isProcessing = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, user]);

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Authentication Failed
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {message}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/auth/login')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/auth/signup')}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Timeout state
  if (status === 'timeout') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Taking Longer Than Expected
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {message}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Retry
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Authentication Successful
            </h3>
            <p className="text-sm text-gray-500">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Processing state (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Setting up your account
          </h3>
          <p className="text-sm text-gray-500">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
