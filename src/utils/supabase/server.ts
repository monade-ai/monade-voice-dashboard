import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Hardcoded Supabase config for Vercel deployment
const SUPABASE_URL = 'https://jmuzbxveurbpmlgawcvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdXpieHZldXJicG1sZ2F3Y3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDIxMTgsImV4cCI6MjA2MjgxODExOH0.9GtSBBCwK3dqPPRIcqAOdHOlVVwU7rYFWOz1ejO_KaI';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        },
    );
}
