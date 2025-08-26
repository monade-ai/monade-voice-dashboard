'use client';

import { login, signup } from './actions';
import OAuthButton from './components/oauth-button';
import ArtisticBranding from './components/artistic-branding';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const message = searchParams?.get('message');
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  const handleOAuthClick = (provider: 'google' | 'apple') => {
    // Open the coming soon modal
    setIsComingSoonOpen(true);
    console.log(`OAuth ${provider} clicked - not yet implemented`);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Interactive Authentication */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 bg-gray-50">
        <div className="max-w-md w-full mx-auto">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to Monade!
            </h1>
            <p className="text-lg text-gray-600">
              Sign in to access your AI voice agents
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="flex justify-center space-x-4 mb-8">
            <OAuthButton 
              provider="google" 
              onClick={() => handleOAuthClick('google')}
            />
            <OAuthButton 
              provider="apple" 
              onClick={() => handleOAuthClick('apple')}
            />
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500 font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Enter your password"
              />
            </div>

            {/* Error Message */}
            {message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  {message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                formAction={login}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors"
              >
                Sign In
              </button>

              <button
                formAction={signup}
                className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-colors border border-gray-300"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Artistic Branding */}
      <div className="hidden lg:flex flex-1">
        <ArtisticBranding />
      </div>

      {/* Coming Soon Modal */}
      <Dialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Coming Soon! 🚀</DialogTitle>
            <DialogDescription className="text-center">
              OAuth authentication with Google and Apple is currently being implemented. 
              Please use email authentication for now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setIsComingSoonOpen(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
