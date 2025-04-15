// app/dashboard/components/failed-calls-list.tsx

import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FailedCall {
  assistant: string;
  timestamp: string;
  id: string;
  status: string;
}

interface FailedCallsListProps {
  calls: FailedCall[];
  onViewMore?: () => void;
  showViewMore?: boolean;
}

export function FailedCallsList({ calls, onViewMore, showViewMore = true }: FailedCallsListProps) {
  return (
    <Card className="bg-white border-gray-200 text-gray-800 hover:border-amber-300 transition-all shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Unsuccessful calls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 h-[300px] overflow-y-auto">
          {calls.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No unsuccessful calls found</p>
          ) : (
            <>
              {calls.map((call, index) => (
                <div
                  key={`failed-call-${index}`}
                  className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">{call.assistant}</p>
                    <p className="text-xs text-gray-500">
                      {call.timestamp} • {call.id}
                    </p>
                  </div>
                  <div className="rounded-md bg-red-900/20 border border-red-800 px-2 py-1">
                    <span className="text-xs font-medium text-red-400">{call.status}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {showViewMore && onViewMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="link"
              onClick={onViewMore}
              className="text-amber-600 hover:text-amber-500"
            >
              View More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}