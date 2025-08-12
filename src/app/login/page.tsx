import { login, signup } from './actions';
import { headers } from 'next/headers';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const headerStore = headers();
  const message = (await searchParams)?.message;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Supabase Email Auth
        </h1>

        <form className="flex flex-col gap-4">
          <label htmlFor="email" className="text-gray-700 font-semibold mb-1">Email:</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />

          <label htmlFor="password" className="text-gray-700 font-semibold mb-1">Password:</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />

          <div className="flex gap-4">
            <button
              formAction={login}
              className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              Log in
            </button>

            <button
              formAction={signup}
              className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            >
              Sign up
            </button>
          </div>

          {message && (
            <p className="mt-4 text-center text-sm text-red-600">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
