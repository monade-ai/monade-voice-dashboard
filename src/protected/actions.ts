'use server';

import { redirect } from 'next/navigation';

import { backendServerSignOut } from '@/lib/auth/backend-auth-server';

export async function signOut() {
  await backendServerSignOut();

  return redirect('/login');
}
