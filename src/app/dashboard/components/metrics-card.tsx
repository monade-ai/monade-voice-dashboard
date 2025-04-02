// app/dashboard/components/metrics-card.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  className?: string;
  children?: React.ReactNode;
}

export function MetricsCard({
  title,
  value,
  className,
  children,
}: MetricsCardProps) {
  return (
    <Card className={cn(
      "bg-white border-gray-200 text-gray-800 hover:border-amber-300 shadow-sm transition-all", 
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-3">
          <p className="text-3xl font-bold text-amber-600">{value}</p>
          <div className="h-[120px] w-full">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}