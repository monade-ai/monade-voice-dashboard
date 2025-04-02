// app/dashboard/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';

// Components
import { MetricsCard } from './components/metrics-card';
import { LineChart } from './components/line-chart';
import { BarChart } from './components/bar-chart';
import { FailedCallsList } from './components/failed-calls-list';
import { SectionHeader } from '../../components/section-header';
import { DateRangePicker } from './components/date-range-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';

// Data hook
import { useDashboardData } from '../hooks/use-dashboard-data';

// Utils
import { formatCurrency, formatDuration, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  // Get current date and 30 days ago for default range
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  
  // Format for display
  const defaultDateRange = `${format(thirtyDaysAgo, 'MM/dd/yyyy')} - ${format(today, 'MM/dd/yyyy')}`;
  
  // State for dashboard filters
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [groupBy, setGroupBy] = useState('day');
  const [assistantFilter, setAssistantFilter] = useState('all');
  
  // Add state for view more functionality
  const [showAllFailedCalls, setShowAllFailedCalls] = useState(false);
  
  // Convert display dates to API format
  const [dateFrom, dateTo] = dateRange.split(' - ').map(d => {
    // If the date is in format MM/DD/YYYY, convert to YYYY-MM-DD
    const parts = d.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0]}-${parts[1]}`;
    }
    return d;
  });

  // Handle date range change
  const handleDateRangeChange = (newDateRange: string) => {
    setDateRange(newDateRange);
  };

  // Handle refresh button click - explicitly refresh data
  const handleRefresh = () => {
    refreshData();
  };

  // Function to handle date range picker changes
  const handleDatePickerChange = (dates: [Date, Date]) => {
    const [start, end] = dates;
    const formattedRange = `${format(start, 'MM/dd/yyyy')} - ${format(end, 'MM/dd/yyyy')}`;
    setDateRange(formattedRange);
  };
  
  // Handle "View More" button click for failed calls
  const handleViewMoreFailedCalls = () => {
    // In a real app, this would navigate to a more detailed view
    // For demo purposes, we'll just toggle the state
    setShowAllFailedCalls(true);
  };

  // Fetch dashboard data using the hook
  const {
    loading,
    error,
    metrics,
    analysis,
    failedCalls,
    concurrentCalls,
    refreshData
  } = useDashboardData({
    dateFrom,
    dateTo,
    groupBy: groupBy as 'day' | 'week' | 'month',
    assistantId: assistantFilter !== 'all' ? assistantFilter : undefined,
    useMockData: true // Set to false to use real API
  });

  return (
    <div className="container mx-auto p-4 md:p-6 bg-[#f8f5f0]">
      {/* Dashboard Header */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-700">Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Analytics dashboard for call metrics and performance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <DateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
            
            <div className="flex gap-2">
              <Select
                value={groupBy}
                onValueChange={setGroupBy}
              >
                <SelectTrigger className="w-32 h-10 bg-white border-gray-300 text-gray-700">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 text-gray-700">
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={assistantFilter}
                onValueChange={setAssistantFilter}
              >
                <SelectTrigger className="w-48 h-10 bg-white border-gray-300 text-gray-700">
                  <SelectValue placeholder="Filter by Assistant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 text-gray-700">
                  <SelectItem value="all">All Assistants</SelectItem>
                  <SelectItem value="new">New Assistant</SelectItem>
                  <SelectItem value="unknown">Unknown Assistant</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                className="h-10 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6 shadow-sm">
          <p>Error loading dashboard data: {error.message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="mt-2 bg-white border-red-300 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center border border-gray-200">
            <RefreshCw className="animate-spin h-6 w-6 text-amber-600 mr-3" />
            <p className="text-gray-700">Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricsCard
          title="Total Call Minutes"
          value={metrics.totalCallMinutes.total.toFixed(2)}
        >
          <LineChart
            data={metrics.totalCallMinutes.points}
            xKey="date"
            yKey="minutes"
            color="#d97706" // amber-600
            formatX={(date) => format(new Date(date), 'MM/dd')}
            formatY={(value) => `${value} min`}
            hideGrid={true}
            hideTicks={true}
          />
        </MetricsCard>

        <MetricsCard
          title="Number of Calls"
          value={metrics.numberOfCalls.total}
        >
          <LineChart
            data={metrics.numberOfCalls.points}
            xKey="date"
            yKey="calls"
            color="#2563eb" // blue-600
            formatX={(date) => format(new Date(date), 'MM/dd')}
            formatY={(value) => value.toString()}
            hideGrid={true}
            hideTicks={true}
          />
        </MetricsCard>

        <MetricsCard
          title="Total Spent"
          value={formatCurrency(metrics.totalSpent.total)}
        >
          <LineChart
            data={metrics.totalSpent.points}
            xKey="date"
            yKey="amount"
            color="#ea580c" // orange-600
            formatX={(date) => format(new Date(date), 'MM/dd')}
            formatY={(value) => formatCurrency(value)}
            hideGrid={true}
            hideTicks={true}
          />
        </MetricsCard>

        <MetricsCard
          title="Average Cost per Call"
          value={formatCurrency(metrics.avgCostPerCall.total)}
        >
          <LineChart
            data={metrics.avgCostPerCall.points}
            xKey="date"
            yKey="cost"
            color="#059669" // emerald-600
            formatX={(date) => format(new Date(date), 'MM/dd')}
            formatY={(value) => formatCurrency(value)}
            hideGrid={true}
            hideTicks={true}
          />
        </MetricsCard>
      </div>

      {/* Call Analysis Section */}
      <SectionHeader title="Call Analysis" />

      {/* Middle Row - Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-all shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Reason Call Ended</h3>
          <BarChart
            data={analysis.callEndReason}
            xKey="date"
            bars={[
              { key: 'customer-ended-call', color: '#818cf8' }, // indigo
              { key: 'assistant-ended-call', color: '#4ade80' }, // green
            ]}
            formatY={(value) => value.toString()}
            chartHeight={240}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-all shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Average Call Duration by Assistant</h3>
          <BarChart
            data={analysis.callDurationByAssistant}
            xKey="date"
            bars={[
              { key: 'Unknown Assistant', color: '#8b5cf6' }, // violet
              { key: 'New Assistant', color: '#4ade80' }, // green
            ]}
            formatY={(value) => `${value.toFixed(1)}m`}
            chartHeight={240}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-all shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Cost Breakdown</h3>
          <BarChart
            data={analysis.costBreakdown}
            xKey="date"
            bars={[
              { key: 'LLM', color: '#8b5cf6', stackId: 'stack' }, // violet
              { key: 'STT', color: '#f97316', stackId: 'stack' }, // orange
              { key: 'TTS', color: '#0ea5e9', stackId: 'stack' }, // sky
              { key: 'VAPI', color: '#ec4899', stackId: 'stack' }, // pink
            ]}
            formatY={(value) => formatCurrency(value)}
            chartHeight={240}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-all shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Success Evaluation</h3>
          <BarChart
            data={analysis.successEvaluation}
            xKey="date"
            bars={[
              { key: 'True', color: '#4ade80' }, // green
              { key: 'False', color: '#f87171' }, // red
              { key: 'Unknown', color: '#9ca3af' }, // gray
            ]}
            formatY={(value) => value.toString()}
            chartHeight={240}
          />
        </div>

        <FailedCallsList
          calls={failedCalls.slice(0, showAllFailedCalls ? failedCalls.length : 5)}
          onViewMore={handleViewMoreFailedCalls}
          showViewMore={!showAllFailedCalls && failedCalls.length > 5}
        />

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-all shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-500">Number of Concurrent Calls</h3>
            <select 
              className="bg-white border-gray-300 text-gray-700 text-xs rounded-md p-1"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <div className="h-[240px]">
            <LineChart
              data={concurrentCalls}
              xKey="date"
              yKey="calls"
              color="#d97706" // amber-600
              formatX={(date) => format(new Date(date.split(' ')[0]), 'MM/dd')}
              formatY={(value) => value.toString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}