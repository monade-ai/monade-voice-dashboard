'use client';

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getOrganizationService } from '@/lib/services';
import { AUTH_CONFIG } from '@/lib/auth/auth-config';

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
  const [supabase] = useState(() => createClientComponentClient());
  const [organizationService] = useState(() => getOrganizationService());

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing authentication...');
  const hasRunRef = useRef(false);

  useEffect(() => {
    console.log("[AuthCallback] Component mounted, URL:", window.location.href);
    console.log("[AuthCallback] Search params:", Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple executions
      if (hasRunRef.current) {
        console.log("[AuthCallback] Skipping duplicate execution");
        return;
      }
      hasRunRef.current = true;

      console.log("[AuthCallback] handleAuthCallback started.");

      // Since the AuthProvider is handling the auth state and user creation,
      // we just need to wait a moment for it to process and then redirect
      setStatus('Completing authentication...');

      // Give the AuthProvider time to process the auth state change
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log("[AuthCallback] Redirecting to dashboard.");
      router.push('/dashboard');
    };

    handleAuthCallback();
  }, []);

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
