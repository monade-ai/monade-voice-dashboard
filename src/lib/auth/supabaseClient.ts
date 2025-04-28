/**
 * DEPRECATED FOR AUTH: Do NOT use this client for authentication/session management in Next.js App Router projects.
 * Use `createClientComponentClient` from `@supabase/auth-helpers-nextjs` everywhere for auth/session.
 * This file may still be used for non-auth Supabase operations if needed.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL and Anon Key must be provided in environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
