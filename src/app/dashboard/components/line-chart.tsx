// app/dashboard/components/line-chart.tsx

import React, { memo, useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string | string[];
  color: string | string[];
  formatX?: (value: any) => string;
  formatY?: (value: any) => string;
  hideGrid?: boolean;
  hideTicks?: boolean;
  showLegend?: boolean;
}

// Memoize the LineChart component to prevent unnecessary re-renders
export const LineChart = memo(function LineChart({
  data,
  xKey,
  yKey,
  color,
  formatX,
  formatY,
  hideGrid = false,
  hideTicks = false,
  showLegend = false
}: LineChartProps) {
  // Memoize the formatted data to prevent recalculation on every render
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      // Format date if it's a string date
      [xKey]: typeof item[xKey] === 'string' && item[xKey].includes('-') 
        ? new Date(item[xKey]) 
        : item[xKey]
    }));
  }, [data, xKey]);

  // Create lines based on whether yKey is a string or array
  const renderLines = useMemo(() => {
    if (Array.isArray(yKey)) {
      return yKey.map((key, index) => {
        const lineColor = Array.isArray(color) ? color[index % color.length] : color;
        return (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        );
      });
    } else {
      return (
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={Array.isArray(color) ? color[0] : color}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      );
    }
  }, [yKey, color]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={formattedData}
        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
      >
        {!hideGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
        
        <XAxis 
          dataKey={xKey} 
          tickFormatter={formatX}
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={!hideTicks}
          hide={hideTicks}
        />
        
        <YAxis 
          tickFormatter={formatY}
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={!hideTicks}
          hide={hideTicks}
        />
        
        <Tooltip 
          formatter={(value: any) => [formatY ? formatY(value) : value, '']}
          labelFormatter={(label) => formatX ? formatX(label) : label}
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        />
        
        {showLegend && <Legend />}
        
        {renderLines}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
});