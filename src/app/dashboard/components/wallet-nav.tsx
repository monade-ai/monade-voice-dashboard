'use client';

import React from 'react';
import { Wallet, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WalletNavProps {
    balance: number;
    currency?: string;
    minutesRemaining?: number;
}

export const WalletNav: React.FC<WalletNavProps> = ({
    balance,
    currency = '₹',
    minutesRemaining = 0,
}) => {
    const router = useRouter();

    const formatMinutes = (mins: number) => {
        if (mins >= 1000) {
            return `${(mins / 1000).toFixed(1)}k`;
        }
        return mins.toString();
    };

    return (
        <button
            onClick={() => router.push('/wallet')}
            className="flex items-center gap-3 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-md"
        >
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Wallet</span>
                <span className="font-semibold">
                    {currency}{balance.toLocaleString()}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-300">
                    {formatMinutes(minutesRemaining)} mins left
                </span>
            </div>
            <div className="w-5 h-5 border-2 border-amber-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            </div>
        </button>
    );
};

export default WalletNav;
