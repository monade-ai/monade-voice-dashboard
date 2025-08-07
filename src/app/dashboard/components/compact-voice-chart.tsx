'use client';

import React from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface CompactVoiceChartProps {
  data: Array<{
    timestamp: string
    callVolume: number
    successRate: number
  }>
  timeRange: '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '24h' | '7d' | '30d') => void
  loading?: boolean
  error?: string
}

const CompactVoiceChart: React.FC<CompactVoiceChartProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  loading = false,
  error,
}) => {
  // Calculate trend from data
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'neutral', percentage: 0 };
    
    const recent = data.slice(-3).reduce((sum, item) => sum + item.callVolume, 0) / 3;
    const previous = data.slice(-6, -3).reduce((sum, item) => sum + item.callVolume, 0) / 3;
    
    if (previous === 0) return { direction: 'neutral', percentage: 0 };
    
    const change = ((recent - previous) / previous) * 100;
    
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
      percentage: Math.abs(Math.round(change)),
    };
  };

  const trend = calculateTrend();
  const totalCalls = data.reduce((sum, item) => sum + item.callVolume, 0);
  const avgSuccessRate = data.length > 0 
    ? data.reduce((sum, item) => sum + item.successRate, 0) / data.length 
    : 0;

  const timeRangeOptions = [
    { value: '24h' as const, label: '24H' },
    { value: '7d' as const, label: '7D' },
    { value: '30d' as const, label: '30D' },
  ];

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeRange === '24h') {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false, 
      });
    }

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return (
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="text-xs font-medium mb-1">{formattedDate}</p>
          <div className="text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Calls: {payload[0]?.value || 0}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex space-x-1">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-6 w-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-destructive">Voice Performance</CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Voice Performance</CardTitle>
          <div className="flex items-center space-x-1">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTimeRangeChange(option.value)}
                className="h-6 px-2 text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{totalCalls.toLocaleString()}</span>
            <div className="flex items-center space-x-1">
              {trend.direction === 'up' && (
                <div className="flex items-center text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs font-semibold">{trend.percentage}%</span>
                </div>
              )}
              {trend.direction === 'down' && (
                <div className="flex items-center text-red-600">
                  <TrendingDown className="w-3 h-3" />
                  <span className="text-xs font-semibold">{trend.percentage}%</span>
                </div>
              )}
              {trend.direction === 'neutral' && (
                <div className="flex items-center text-gray-500">
                  <Minus className="w-3 h-3" />
                  <span className="text-xs font-semibold">0%</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Success Rate</div>
            <div className="text-sm font-semibold text-green-600">
              {avgSuccessRate.toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="callVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey="callVolume"
                stroke="#eab308"
                strokeWidth={2}
                fill="url(#callVolumeGradient)"
              />
              <ChartTooltip content={<CustomTooltip />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactVoiceChart;