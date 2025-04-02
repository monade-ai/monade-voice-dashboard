// app/dashboard/components/line-chart.tsx

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface LineChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  color: string;
  formatX?: (value: any) => string;
  formatY?: (value: any) => string;
  hideGrid?: boolean;
  hideTicks?: boolean;
}

export function LineChart({
  data,
  xKey,
  yKey,
  color,
  formatX = (value) => value,
  formatY = (value) => value,
  hideGrid = false,
  hideTicks = false,
}: LineChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-2 rounded shadow-lg">
          <p className="text-gray-600">{formatX(label)}</p>
          <p className="text-amber-600 font-medium">
            {formatY(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        {!hideGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={!hideTicks}
          tickFormatter={formatX}
          fontSize={10}
          stroke="#64748b"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={!hideTicks}
          tickFormatter={formatY}
          fontSize={10}
          stroke="#64748b"
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: color, stroke: "#0f172a", strokeWidth: 2 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}