// app/dashboard/components/metrics-card.tsx

import React, { memo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

// Memoize the component to prevent unnecessary re-renders
export const MetricsCard = memo(function MetricsCard({
  title,
  value,
  subtitle,
  className,
  children,
}: MetricsCardProps) {
  return (
    <Card className={cn(
      'bg-yellow-400 border-yellow-500 hover:border-yellow-600 transition-all shadow-lg w-full max-w-sm',
      className,
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-yellow-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-bold text-yellow-900 mb-1">{value}</div>
        {subtitle && <p className="text-sm text-yellow-800">{subtitle}</p>}
        {children && <div className="mt-4 h-[100px]">{children}</div>}
      </CardContent>
    </Card>
  );
});