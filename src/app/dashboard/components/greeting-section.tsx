'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface GreetingSectionProps {
    userName?: string;
    onTalkToAI?: () => void;
}

export const GreetingSection: React.FC<GreetingSectionProps> = ({
    userName = 'User',
    onTalkToAI,
}) => {
    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="flex items-center justify-between mb-8">
            <div>
                <p className="text-sm text-amber-600 font-medium mb-1">My Workspace</p>
                <h1 className="text-3xl font-semibold text-gray-900">
                    {getGreeting()}, {userName}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Have a question?</span>
                <button
                    onClick={onTalkToAI}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                >
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Talk to AI</span>
                </button>
            </div>
        </div>
    );
};

export default GreetingSection;
