// app/dashboard/components/bar-chart.tsx

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarConfig {
  key: string;
  color: string;
  stackId?: string;
}

interface BarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  bars: BarConfig[];
  title?: string;
  formatX?: (value: any) => string;
  formatY?: (value: any) => string;
  hideGrid?: boolean;
  hideLegend?: boolean;
  chartHeight?: number;
}

export function BarChart({
  data,
  xKey,
  bars,
  title,
  formatX = (value) => value,
  formatY = (value) => value,
  hideGrid = false,
  hideLegend = false,
  chartHeight = 200,
}: BarChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-2 rounded shadow-lg">
          <p className="text-gray-600 text-sm">{formatX(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={`tooltip-${index}`}
              className="text-sm font-medium"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${formatY(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      {title && <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>}
      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
          >
            {!hideGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatX}
              fontSize={10}
              stroke="#64748b"
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={formatY}
              fontSize={10}
              stroke="#64748b"
            />
            <Tooltip content={<CustomTooltip />} />
            {!hideLegend && (
              <Legend
                wrapperStyle={{ fontSize: '10px', bottom: -10 }}
                iconSize={8}
                iconType="circle"
              />
            )}
            {bars.map((bar, index) => (
              <Bar
                key={`bar-${index}`}
                dataKey={bar.key}
                name={bar.key}
                fill={bar.color}
                stackId={bar.stackId}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}