'use client';

import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const WalletCardSkeleton = () => (
  <div className="bg-yellow-400/20 p-6 rounded-xl border border-yellow-500/30 flex flex-col justify-between h-full min-h-[180px] max-w-full animate-pulse">
    <div>
      <Skeleton className="h-6 w-16 mb-2 bg-yellow-500/30" />
      <Skeleton className="h-12 w-32 bg-yellow-500/30" />
    </div>
    <div className="flex items-baseline justify-between">
      <Skeleton className="h-5 w-24 bg-yellow-500/30" />
      <Skeleton className="h-12 w-12 rounded-full bg-yellow-500/30" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-card p-4 rounded-lg shadow-md border border-border flex flex-col items-center justify-center text-center h-full">
    <div className="flex items-center justify-center mb-2">
      <Skeleton className="w-6 h-6 mr-2" />
      <Skeleton className="w-16 h-12" />
    </div>
    <div className="flex items-center justify-center space-x-2">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-4 w-8" />
    </div>
  </div>
);

export const CarouselSkeleton = () => (
  <div className="w-full overflow-hidden rounded-xl border border-border shadow-sm">
    <div className="p-3 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-24 flex flex-col justify-between p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="w-2 h-2 rounded-full ml-2" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex space-x-1">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-7 w-12" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className="w-full h-[300px]" />
    </CardContent>
  </Card>
);

export const CallLogSkeleton = () => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <div className="bg-muted/30 p-4">
      <div className="grid grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="grid grid-cols-6 gap-4 items-center">
            <div className="flex items-center">
              <Skeleton className="w-8 h-8 rounded-full mr-3" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <div className="flex space-x-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-6 h-6 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="p-4 flex justify-end items-center">
      <Skeleton className="h-8 w-8 rounded-full mr-4" />
      <Skeleton className="h-4 w-16 mr-4" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

interface DashboardSkeletonProps {
  showChart?: boolean
  showCallLogs?: boolean
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ 
  showChart = true, 
  showCallLogs = true, 
}) => (
  <div className="min-h-screen bg-background text-foreground p-8 font-sans">
    <header className="flex justify-between items-center mb-12">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-32" />
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12" style={{ gridAutoRows: '1fr' }}>
      <div className="md:col-span-1 lg:col-span-2">
        <WalletCardSkeleton />
      </div>
      <div className="md:col-span-1 lg:col-span-1 grid grid-rows-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <CarouselSkeleton />
      </div>
    </div>

    {showChart && (
      <div className="mb-12">
        <ChartSkeleton />
      </div>
    )}

    {showCallLogs && (
      <div>
        <Skeleton className="h-8 w-24 mb-6" />
        <CallLogSkeleton />
      </div>
    )}
  </div>
);