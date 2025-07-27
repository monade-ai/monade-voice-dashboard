'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlineMail, AiOutlineLock } from 'react-icons/ai';
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard'); 
      }
    };
  
    checkUserSession();
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard'); 
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
  
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, 
      },
    });
  
    setLoading(false);
  
    if (error) {
      setError(error.message);
    }
  };
  

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Left Side - Signup Form */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white px-6">
        <h1 className="text-3xl font-bold mb-4 text-black">Join <span className="text-blue-600">monade.ai!</span></h1>
        <p className="text-gray-600 mb-6">Create your account to get started</p>

        {/* Google Signup */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center w-80 bg-white border border-gray-300 text-black font-semibold py-2 rounded shadow-md hover:bg-gray-100 mb-3"
        >
          <FcGoogle className="w-5 h-5 mr-2" />
          {loading ? 'Signing up...' : 'Sign Up with Google'}
        </button>

        <div className="w-80 text-center text-gray-500 my-2">OR</div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="flex flex-col w-80">
          <div className="relative flex items-center border rounded px-4 py-2 mb-2">
            <AiOutlineMail className="text-gray-500 mr-2" />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full focus:outline-none"
            />
          </div>

          <div className="relative flex items-center border rounded px-4 py-2 mb-4">
            <AiOutlineLock className="text-gray-500 mr-2" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white font-semibold py-2 rounded hover:bg-green-700"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        {/* Redirect to Login */}
        <div className="text-center mt-4">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/auth/login" className="text-blue-600"><u>Sign In</u></a>
          </p>
        </div>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* Right Side - Image */}
      <div className="hidden md:flex w-1/2 items-center justify-center bg-blue-600 text-white p-6 relative">
        <Image
          src="/side_image.png" 
          alt="Illustration"
          width={500}  
          height={500}
          className="w-3/4"
        />
      </div>
    </div>
  );
}
