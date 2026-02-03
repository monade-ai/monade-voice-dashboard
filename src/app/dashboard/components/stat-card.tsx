'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        percentage: number;
        label?: string;
    };
    isLoading?: boolean;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-2xl border border-gray-100 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {Icon && (
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-amber-600" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${trend.direction === 'up'
              ? 'text-green-600'
              : trend.direction === 'down'
                ? 'text-red-500'
                : 'text-gray-500'
            }`}
          >
            {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{trend.percentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Stats Grid Component
interface StatsGridProps {
    stats: StatCardProps[];
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatCard;
