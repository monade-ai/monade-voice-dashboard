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
      "bg-white border-gray-200 hover:border-amber-300 transition-all shadow-sm",
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        {children && <div className="mt-4 h-[100px]">{children}</div>}
      </CardContent>
    </Card>
  );
});