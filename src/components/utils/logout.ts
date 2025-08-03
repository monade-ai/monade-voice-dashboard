'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export function useLogout() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    try {
      console.log('[useLogout] Starting logout process...');
      
      // Clear localStorage data before Supabase sign out
      if (typeof window !== 'undefined') {
        // Remove auth-related items
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_organization_id');
        
        // Remove organization-scoped data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('_') && (
            key.includes('draftAssistants') ||
            key.includes('contact_lists') ||
            key.includes('contacts_') ||
            key.includes('monade_documents')
          )) {
            localStorage.removeItem(key);
          }
        });
      }
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[useLogout] Supabase sign out failed:', error.message);
        // Still redirect even if Supabase sign out fails
        window.location.href = '/auth/login';
      } else {
        console.log('[useLogout] User logged out successfully!');
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('[useLogout] Logout process failed:', error);
      // Force redirect even on complete failure
      window.location.href = '/auth/login';
    }
  };

  return handleLogout;
}
