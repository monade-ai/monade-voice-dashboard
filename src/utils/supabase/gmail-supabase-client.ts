import { createBrowserClient } from '@supabase/ssr';

export const createGmailSupabaseClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_GMAIL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_GMAIL_SUPABASE_ANON_KEY!
  );
