'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getOrganizationService } from '@/lib/services';
import { AUTH_CONFIG } from '@/lib/auth/auth-config';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const organizationService = getOrganizationService();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Verifying authentication...');
        
        // Wait for auth state to be established with retry logic
        let session = null;
        let attempts = 0;
        const maxAttempts = AUTH_CONFIG.SESSION_RETRY.MAX_ATTEMPTS;
        
        while (!session && attempts < maxAttempts) {
          const { data, error: authError } = await supabase.auth.getSession();
          
          if (authError) {
            throw new Error(authError.message);
          }
          
          if (data.session?.user) {
            session = data.session;
            break;
          }
          
          // Wait with exponential backoff
          const delay = AUTH_CONFIG.SESSION_RETRY.RETRY_DELAY * Math.pow(AUTH_CONFIG.SESSION_RETRY.BACKOFF_MULTIPLIER, attempts);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          setStatus(`Establishing session... (${attempts}/${maxAttempts})`);
        }

        if (!session?.user) {
          throw new Error('Unable to establish user session. Please try signing in again.');
        }

        const user = session.user;
        setStatus('Setting up your account...');

        // Check if this is an invitation acceptance
        const invitationToken = searchParams.get('invitation_token');
        if (invitationToken) {
          setStatus('Accepting organization invitation...');
          
          const response = await organizationService.acceptInvitation({
            token: invitationToken
          });

          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to accept invitation');
          }
        }

        // Create or update user profile - organization will be auto-created by trigger if needed
        const accountType = user.user_metadata?.account_type || searchParams.get('account_type');
        const organizationName = user.user_metadata?.organization_name || searchParams.get('organization_name');
        
        if (accountType === 'organization') {
          setStatus('Setting up your organization...');
        }

        // Create or update user profile
        setStatus('Finalizing setup...');
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            account_type: accountType || 'personal'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw error, profile might be created by trigger
        }

        setStatus('Redirecting to dashboard...');
        
        // Redirect to dashboard
        router.push('/dashboard');

      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, searchParams, supabase, organizationService]);

  if (error) {
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
              {error}
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
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}