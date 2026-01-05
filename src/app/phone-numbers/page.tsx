'use client';

import React, { useState } from 'react';
import { ArrowLeft, Phone, Check, Copy, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function PhoneNumbersPage() {
    const router = useRouter();
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Available numbers - add more as needed
    const availableNumbers = [
        { number: '+91 80713 87364', region: 'India', type: 'Virtual', status: 'available' },
    ];

    const handleSelectNumber = (number: string) => {
        setSelectedNumber(number);
        toast.success(`Selected: ${number}`);
    };

    const handleCopyNumber = (number: string) => {
        navigator.clipboard.writeText(number.replace(/\s/g, ''));
        toast.success('Number copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
                        <p className="text-gray-500">Manage your virtual phone numbers</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search for phone numbers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900"
                        />
                    </div>
                </div>

                {/* Available Numbers Section */}
                <div className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
                        <h3 className="font-semibold text-gray-900">Available Numbers</h3>
                        <p className="text-sm text-gray-500">Select a number to assign to your voice agent</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {availableNumbers.map((item, index) => (
                            <div
                                key={index}
                                className={`px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${selectedNumber === item.number ? 'bg-amber-50' : ''
                                    }`}
                                onClick={() => handleSelectNumber(item.number)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Phone className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-semibold text-gray-900">{item.number}</p>
                                        <p className="text-sm text-gray-500">
                                            {item.region} • {item.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full uppercase">
                                        {item.status}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyNumber(item.number);
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Copy className="w-4 h-4 text-gray-500" />
                                    </button>
                                    {selectedNumber === item.number && (
                                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* No numbers message */}
                    {availableNumbers.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No phone numbers available</p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        disabled={!selectedNumber}
                        onClick={() => {
                            toast.success(`Number ${selectedNumber} assigned successfully!`);
                            router.back();
                        }}
                    >
                        Assign Number
                    </Button>
                </div>
            </div>
        </div>
    );
}
