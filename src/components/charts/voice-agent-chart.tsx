'use client';

import * as React from 'react';
import { Area, AreaChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

import { BaseChart } from '@/components/ui/base-chart';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { voiceAgentChartConfig, formatChartValue, getResponsiveChartHeight } from '@/lib/chart-utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  timestamp: string
  callVolume: number
  successRate: number
  avgDuration: number
}

interface VoiceAgentChartProps {
  data: ChartDataPoint[]
  timeRange: '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '24h' | '7d' | '30d') => void
  loading?: boolean
  error?: string
  className?: string
}

const VoiceAgentChart = React.forwardRef<HTMLDivElement, VoiceAgentChartProps>(
  ({ data, timeRange, onTimeRangeChange, loading, error, className, ...props }, ref) => {
    const [chartHeight, setChartHeight] = React.useState(300);

    React.useEffect(() => {
      const updateHeight = () => {
        setChartHeight(getResponsiveChartHeight(window.innerWidth));
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);

      return () => window.removeEventListener('resize', updateHeight);
    }, []);

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
      } else if (timeRange === '7d') {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
        });
      }
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
          <div className="rounded-lg border bg-background p-3 shadow-md">
            <p className="text-sm font-medium mb-2">{formattedDate}</p>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">
                  {entry.dataKey === 'successRate' 
                    ? formatChartValue(entry.value, 'percentage')
                    : entry.dataKey === 'avgDuration'
                      ? formatChartValue(entry.value, 'duration')
                      : formatChartValue(entry.value, 'number')
                  }
                </span>
              </div>
            ))}
          </div>
        );
      }

      return null;
    };

    const emptyState = (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">No voice agent data available</p>
        <p className="text-xs text-muted-foreground mt-1">
          Data will appear here once your agents start making calls
        </p>
      </div>
    );

    return (
      <BaseChart
        ref={ref}
        title="Voice Agent Performance"
        description="Call volume and success rates over time"
        config={voiceAgentChartConfig}
        loading={loading}
        error={error}
        emptyState={data.length === 0 ? emptyState : undefined}
        className={cn('w-full', className)}
        headerClassName="flex flex-row items-center justify-between space-y-0 pb-4"
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTimeRangeChange(option.value)}
                className="h-7 px-3 text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="volume"
              orientation="left"
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="rate"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            
            <defs>
              <linearGradient id="callVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <Area
              yAxisId="volume"
              type="monotone"
              dataKey="callVolume"
              stroke="#eab308"
              strokeWidth={2}
              fill="url(#callVolumeGradient)"
              name="Call Volume"
            />
            
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="successRate"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#16a34a', strokeWidth: 2 }}
              name="Success Rate"
            />
            
            <ChartTooltip content={<CustomTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ResponsiveContainer>
      </BaseChart>
    );
  },
);

VoiceAgentChart.displayName = 'VoiceAgentChart';

export { VoiceAgentChart };
export type { VoiceAgentChartProps, ChartDataPoint };