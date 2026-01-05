'use client';

import React from 'react';
import { Plus, Wallet } from 'lucide-react';

interface WalletCardProps {
    balance: number;
    currency?: string;
    minutesRemaining?: number;
    onTopUp?: () => void;
    isLoading?: boolean;
}

export const WalletCard: React.FC<WalletCardProps> = ({
    balance,
    currency = '₹',
    minutesRemaining = 0,
    onTopUp,
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse">
                <div className="h-4 w-16 bg-gray-200 rounded mb-3"></div>
                <div className="h-10 w-28 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
        );
    }

    const formatMinutes = (mins: number) => {
        if (mins >= 1000) {
            return `${(mins / 1000).toFixed(1)}k`;
        }
        return mins.toString();
    };

    return (
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-300/30 rounded-full"></div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-300/20 rounded-full"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-amber-900" />
                    <span className="text-sm font-semibold text-amber-900">Wallet</span>
                </div>

                <p className="text-4xl font-bold text-amber-900 mb-4">
                    {currency}{balance.toLocaleString()}
                </p>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-800">
                        {formatMinutes(minutesRemaining)} mins remaining
                    </p>
                    <button
                        onClick={onTopUp}
                        className="w-10 h-10 bg-amber-900 text-amber-400 rounded-full flex items-center justify-center hover:bg-amber-800 transition-colors shadow-md"
                        aria-label="Top up wallet"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WalletCard;
