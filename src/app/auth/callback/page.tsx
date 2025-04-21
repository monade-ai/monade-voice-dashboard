'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleRedirect = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        console.error('Failed to retrieve user:', error?.message);
        router.replace('/auth/login');
      } else {
        console.log('User logged in:', data.user);
        router.replace('/dashboard');
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
}
