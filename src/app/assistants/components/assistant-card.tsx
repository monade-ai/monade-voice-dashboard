'use client';

import React from 'react';
import { Phone, MessageSquare } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Assistant {
  id: string;
  name: string;
  description: string;
  model: string;
  costPerMinute: number;
  totalCalls: number;
  status: 'active' | 'inactive' | 'error';
}

interface AssistantCardProps {
  assistant: Assistant;
}

export function AssistantCard({ assistant }: AssistantCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: Assistant['status']) => {
    switch (status) {
    case 'active':
      return 'bg-green-900/20 border-green-800 text-green-400';
    case 'inactive':
      return 'bg-gray-900/20 border-gray-800 text-gray-400';
    case 'error':
      return 'bg-red-900/20 border-red-800 text-red-400';
    default:
      return 'bg-gray-900/20 border-gray-800 text-gray-400';
    }
  };

  return (
    <Card className="bg-white border-gray-200 hover:border-amber-300 transition-all shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-800">{assistant.name}</h3>
            <p className="text-sm text-gray-500">{assistant.description}</p>
          </div>
          <div className={`rounded-md border px-2 py-1 ${getStatusColor(assistant.status)}`}>
            <span className="text-xs font-medium capitalize">{assistant.status}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Model</p>
              <p className="text-sm font-medium text-gray-800">{assistant.model}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cost/Min</p>
              <p className="text-sm font-medium text-gray-800">
                {formatCurrency(assistant.costPerMinute)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Total Calls</p>
            <p className="text-sm font-medium text-gray-800">{assistant.totalCalls}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-700 text-amber-600 hover:bg-gray-700"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-700 text-amber-600 hover:bg-gray-700"
            >
              <Phone className="h-4 w-4 mr-2" />
              Talk
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}