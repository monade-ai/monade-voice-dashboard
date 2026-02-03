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

import { createActionClient } from '@/utils/supabase/action';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  // Create supabase client with proper cookie handling for server actions
  const supabase = await createActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect('/login?message=' + encodeURIComponent(error.message));
  }

  redirect('/protected');
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  // Create supabase client with proper cookie handling for server actions
  const supabase = await createActionClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect('/login?message=' + encodeURIComponent(error.message));
  }

  redirect('/login?message=Check email to continue signup process');
}

export async function logout() {
  const supabase = await createActionClient();
  
  await supabase.auth.signOut();
  redirect('/login');
}
