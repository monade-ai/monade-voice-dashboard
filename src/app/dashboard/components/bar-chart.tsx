// app/dashboard/components/bar-chart.tsx

import React, { memo, useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string | string[];
  color: string | string[];
  formatY?: (value: any) => string;
  formatX?: (value: any) => string;
  showLegend?: boolean;
}

// Memoize the BarChart component to prevent unnecessary re-renders
export const BarChart = memo(function BarChart({
  data,
  xKey,
  yKey,
  color,
  formatY,
  formatX,
  showLegend = false,
}: BarChartProps) {
  // Memoize the formatted data to prevent recalculation on every render
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      // Format date if it's a string date
      [xKey]: typeof item[xKey] === 'string' && item[xKey].includes('-') 
        ? new Date(item[xKey]) 
        : item[xKey],
    }));
  }, [data, xKey]);

  // Create bars based on whether yKey is a string or array
  const renderBars = useMemo(() => {
    if (Array.isArray(yKey)) {
      return yKey.map((key, index) => {
        const barColor = Array.isArray(color) ? color[index % color.length] : color;

        return (
          <Bar 
            key={key} 
            dataKey={key} 
            fill={barColor} 
            radius={[4, 4, 0, 0]}
          />
        );
      });
    } else {
      return (
        <Bar 
          dataKey={yKey} 
          fill={Array.isArray(color) ? color[0] : color} 
          radius={[4, 4, 0, 0]}
        >
          {formattedData.map((entry, index) => {
            const barColor = Array.isArray(color) 
              ? color[index % color.length] 
              : color;

            return <Cell key={`cell-${index}`} fill={barColor} />;
          })}
        </Bar>
      );
    }
  }, [yKey, color, formattedData]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={formattedData}
        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        
        <XAxis 
          dataKey={xKey} 
          tickFormatter={formatX}
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        
        <YAxis 
          tickFormatter={formatY}
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        
        <Tooltip 
          formatter={(value: any) => [formatY ? formatY(value) : value, '']}
          labelFormatter={(label) => formatX ? formatX(label) : label}
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        />
        
        {showLegend && <Legend />}
        
        {renderBars}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
});