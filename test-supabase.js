require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_GMAIL_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_GMAIL_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function getClientId() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('client_id')
      .eq('client_email', 'testsdr161@gmail.com')
      .single();

    if (error) {
      throw error;
    }

    console.log('Client ID:', data.client_id);
  } catch (error) {
    console.error('Error fetching client_id:', error);
  }
}

getClientId();
