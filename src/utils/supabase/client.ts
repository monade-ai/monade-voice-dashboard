import { createBrowserClient } from '@supabase/ssr';

// Hardcoded Supabase config for Vercel deployment
const SUPABASE_URL = 'https://jmuzbxveurbpmlgawcvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdXpieHZldXJicG1sZ2F3Y3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDIxMTgsImV4cCI6MjA2MjgxODExOH0.9GtSBBCwK3dqPPRIcqAOdHOlVVwU7rYFWOz1ejO_KaI';

export function createClient() {
    return createBrowserClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
    );
}
