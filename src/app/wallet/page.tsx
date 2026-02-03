'use client';

import React from 'react';
import { ArrowLeft, Wallet, CreditCard, Clock, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useCredits } from '@/app/hooks/use-credits';

export default function WalletPage() {
  const router = useRouter();
  const { credits, loading, error } = useCredits();

  // Calculate wallet data from API
  const pricePerMinute = 12; // ₹12 per minute
  const balance = credits?.available_credits || 0;
  const totalCredits = credits?.total_credits || 0;
  const totalUsed = totalCredits - balance;
  const minutesRemaining = Math.floor(balance / pricePerMinute);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-8 rounded-3xl shadow-xl mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-amber-900" />
            <span className="text-amber-900 font-medium">Available Balance</span>
          </div>
          <p className="text-5xl font-bold text-amber-900 mb-2">
            {loading ? '...' : `₹${balance.toLocaleString()}`}
          </p>
          <p className="text-amber-800 mb-6">
                        ≈ {loading ? '...' : minutesRemaining.toLocaleString()} minutes remaining
          </p>
          <Button
            className="bg-amber-900 hover:bg-amber-800 text-amber-400 font-semibold px-6 py-2"
            onClick={() => alert('Top-up coming soon!')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
                        Add Credits
          </Button>
        </div>

        {/* Pricing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Price per Minute</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{pricePerMinute}</p>
          </div>
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Credits Used</span>
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : `₹${totalUsed.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Credits Purchased</span>
              <CreditCard className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : `₹${totalCredits.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Usage Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pricing Information</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Voice calls are billed at <span className="font-semibold text-gray-900">₹{pricePerMinute}/minute</span></p>
            <p>• Credits are deducted in real-time during calls</p>
            <p>• Unused credits never expire</p>
            <p>• Top-up anytime to continue making calls</p>
          </div>
        </div>
      </div>
    </div>
  );
}
