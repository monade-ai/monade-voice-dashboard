'use client';

import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CostDisplayProps {
  costPerMinute: number;
  totalCost: number;
  label?: string;
  showInfo?: boolean;
  infoText?: string;
}

export default function CostDisplay({ 
  costPerMinute,
  totalCost, 
  label = 'Cost', 
  showInfo = true,
  infoText = 'Estimated cost per minute of usage'
}: CostDisplayProps) {
  return (
    <div className="relative w-full p-4 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <span className="text-gray-600">{label}</span>
          {showInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{infoText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      <div className="w-full text-center">
        <div className="font-mono font-bold text-3xl text-amber-600">
          ~₹{costPerMinute.toFixed(2)} <span className="text-lg text-gray-500">/min</span>
        </div>
      </div>
      
      {/* Visual cost indicator */}
      <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="flex h-full">
          <div className="bg-green-400 h-full" style={{ width: '40%' }}></div>
          <div className="bg-fuchsia-400 h-full" style={{ width: '20%' }}></div>
          <div className="bg-blue-400 h-full" style={{ width: '15%' }}></div>
          <div className="bg-amber-400 h-full" style={{ width: '25%' }}></div>
        </div>
      </div>
    </div>
  );
}