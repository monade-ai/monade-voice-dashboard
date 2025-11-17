import { createClient } from '@supabase/supabase-js';

export const createGmailSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_GMAIL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_GMAIL_SUPABASE_ANON_KEY!
  );
};
