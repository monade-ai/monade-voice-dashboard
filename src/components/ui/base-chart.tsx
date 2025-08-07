'use client';

import * as React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

interface BaseChartProps {
  title?: string
  description?: string
  config: ChartConfig
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  loading?: boolean
  error?: string
  emptyState?: React.ReactNode
}

const BaseChart = React.forwardRef<HTMLDivElement, BaseChartProps>(
  ({
    title,
    description,
    config,
    children,
    className,
    headerClassName,
    contentClassName,
    loading = false,
    error,
    emptyState,
    ...props
  }, ref) => {
    if (error) {
      return (
        <Card ref={ref} className={cn('w-full', className)} {...props}>
          {(title || description) && (
            <CardHeader className={cn('pb-4', headerClassName)}>
              {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
              {description && (
                <CardDescription className="text-sm text-muted-foreground">
                  {description}
                </CardDescription>
              )}
            </CardHeader>
          )}
          <CardContent className={cn('pt-0', contentClassName)}>
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Failed to load chart data</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (loading) {
      return (
        <Card ref={ref} className={cn('w-full', className)} {...props}>
          {(title || description) && (
            <CardHeader className={cn('pb-4', headerClassName)}>
              {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
              {description && (
                <CardDescription className="text-sm text-muted-foreground">
                  {description}
                </CardDescription>
              )}
            </CardHeader>
          )}
          <CardContent className={cn('pt-0', contentClassName)}>
            <div className="flex h-[200px] items-center justify-center">
              <div className="animate-pulse space-y-2 w-full">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="flex space-x-2 justify-center">
                  <div className="h-3 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref} className={cn('w-full', className)} {...props}>
        {(title || description) && (
          <CardHeader className={cn('pb-4', headerClassName)}>
            {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
            {description && (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className={cn('pt-0', contentClassName)}>
          {emptyState ? (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            <ChartContainer config={config} className="min-h-[200px] w-full">
              {children}
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    );
  },
);

BaseChart.displayName = 'BaseChart';

export { BaseChart };
export type { BaseChartProps };