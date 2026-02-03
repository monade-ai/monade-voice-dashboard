'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  LogOut,
  HelpCircle,
  Globe,
} from 'lucide-react';

import { signOut } from '@/app/actions/auth';
import { useAuth } from '@/contexts/auth-context';

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // User data from auth context
  const userData = {
    email: user?.email || 'admin@monade.ai',
    organization: 'No organization',
    name: user?.email?.split('@')[0] || 'User',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{userData.name}</h2>
              <p className="text-gray-500">{userData.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Organization */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Organization</p>
                <p className="font-medium text-gray-900">{userData.organization}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{userData.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <HelpCircle className="w-5 h-5 text-gray-400" />
            <span className="text-gray-900">Help</span>
          </button>
          {/* Logout using server action form */}
          <form action={signOut}>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-red-600 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </form>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <span className="text-gray-900">English</span>
          </div>
        </div>
      </div>
    </div>
  );
}
