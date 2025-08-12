import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from './actions';

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user.email}</h1>
        <p className="text-gray-700 mb-6">You are authenticated and viewing a protected page.</p>
        <form action={signOut}>
          <button className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600">
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
