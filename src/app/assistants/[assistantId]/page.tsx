'use client';

import React from 'react';
import AssistantTabs from '../components/assistant-tabs';
import  CostDisplay  from '../components/cost-display';
import  AssistantDualButton  from '../components/assistant-dual-button';

interface AssistantPageProps {
  params: {
    assistantId: string;
  };
}

export default function AssistantPage({ params }: AssistantPageProps) {
  const { assistantId } = params;

  // Placeholder data for the assistant
  const assistant = {
    id: assistantId,
    name: 'Customer Support Assistant',
    model: 'gpt-4',
    costPerMinute: 0.02,
    totalCost: 150.50,
    status: 'active' as const,
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{assistant.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Model: {assistant.model}</p>
        </div>
        <AssistantDualButton assistant={assistantId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <AssistantTabs assistant={assistantId} />
        </div>
        <div>
          <CostDisplay
            costPerMinute={assistant.costPerMinute}
            totalCost={assistant.totalCost}
          />
        </div>
      </div>
    </div>
  );
}