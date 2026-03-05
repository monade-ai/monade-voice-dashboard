// 'use server';

// import { cookies } from 'next/headers';
// import { redirect } from 'next/navigation';
// import { createClient } from '@/utils/supabase/server';

// export async function login(formData: FormData) {
//   const email = formData.get('email') as string;
//   const password = formData.get('password') as string;
//   const cookieStore = cookies();
//   const supabase = createClient();

//   const { error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });

//   if (error) {
//     redirect('/login?message=' + error.message);
//   }

//   redirect('/protected');
// }

// export async function signup(formData: FormData) {
//   const email = formData.get('email') as string;
//   const password = formData.get('password') as string;
//   const cookieStore = cookies();
//   const supabase = createClient();

//   const { error } = await supabase.auth.signUp({
//     email,
//     password,
//   });

//   if (error) {
//     redirect('/login?message=' + error.message);
//   }

//   redirect('/login?message=Check email to continue signup process');
// }

'use server';

import { redirect } from 'next/navigation';

export interface LoginActionState {
  success: boolean;
  error: string | null;
}

export async function login(
  _prevState: LoginActionState,
  _formData: FormData,
): Promise<LoginActionState> {
  return {
    success: false,
    error: 'Deprecated server action. Use client-side backend auth flow in /login page.',
  };
}

export async function signup(_formData: FormData) {
  redirect('/login?message=' + encodeURIComponent('Deprecated server action. Use client-side backend auth flow.'));
}

export async function logout() {
  redirect('/login');
}
