'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface WalletNavProps {
    balance: number; // Available credits (spendable)
    totalCredits?: number; // Total credits ever purchased
}

export const WalletNav: React.FC<WalletNavProps> = ({
  balance,
  totalCredits = 0,
}) => {
  const router = useRouter();

  const formatNumber = (num: number) => {
    // Round to whole number first
    const rounded = Math.round(num);
    // Only abbreviate for 10k+ numbers
    if (rounded >= 10000) {
      return `${(rounded / 1000).toFixed(1)}k`;
    }

    return rounded.toLocaleString();
  };

  const spent = totalCredits > 0 ? totalCredits - balance : 0;

  // 1 credit = 1 minute
  const minutesRemaining = balance;

  return (
    <button
      onClick={() => router.push('/wallet')}
      className="flex items-center gap-3 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-md"
      title={totalCredits > 0 ? `Total Credits: ${totalCredits.toLocaleString()} | Used: ${spent.toLocaleString()}` : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Available</span>
        <span className="font-semibold">
          {formatNumber(balance)} credits
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-sm text-gray-300">
          {formatNumber(minutesRemaining)} mins left
        </span>
      </div>
      <div className="w-5 h-5 border-2 border-amber-400 rounded-full flex items-center justify-center">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
      </div>
    </button>
  );
};

export default WalletNav;
