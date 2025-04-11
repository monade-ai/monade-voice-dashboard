// app/dashboard/page.tsx

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { format, subDays } from 'date-fns';
import dynamic from 'next/dynamic';

// Static imports for essential components
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { SectionHeader } from '../../components/section-header';

// Dynamic imports with lazy loading
const MetricsCard = dynamic(() => import('./components/metrics-card').then(mod => ({ default: mod.MetricsCard })), {
  loading: () => <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-[200px] animate-pulse" />
});

const LineChart = dynamic(() => import('./components/line-chart').then(mod => ({ default: mod.LineChart })), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
});

const BarChart = dynamic(() => import('./components/bar-chart').then(mod => ({ default: mod.BarChart })), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
});

const DateRangePicker = dynamic(() => import('./components/date-range-picker').then(mod => ({ default: mod.DateRangePicker })), {
  loading: () => <div className="h-10 w-48 bg-gray-100 animate-pulse rounded" />
});

const FailedCallsList = dynamic(() => import('./components/failed-calls-list').then(mod => ({ default: mod.FailedCallsList })), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
});

// Data hook
import { useDashboardData } from '../hooks/use-dashboard-data';

// Utils
import { formatCurrency, formatDuration, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  // Get current date and 30 days ago for default range
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  
  // Format for display - memoized to prevent recalculation
  const defaultDateRange = useMemo(() => {
    return `${format(thirtyDaysAgo, 'MM/dd/yyyy')} - ${format(today, 'MM/dd/yyyy')}`;
  }, [thirtyDaysAgo, today]);
  
  // State for dashboard filters
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [groupBy, setGroupBy] = useState('day');
  const [assistantFilter, setAssistantFilter] = useState('all');
  
  // Add state for view more functionality
  const [showAllFailedCalls, setShowAllFailedCalls] = useState(false);
  
  // Convert display dates to API format - memoized
  const [dateFrom, dateTo] = useMemo(() => {
    return dateRange.split(' - ').map(d => {
      // If the date is in format MM/DD/YYYY, convert to YYYY-MM-DD
      const parts = d.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0]}-${parts[1]}`;
      }
      return d;
    });
  }, [dateRange]);

  // Handle date range change - memoized callback
  const handleDateRangeChange = useCallback((newDateRange: string) => {
    setDateRange(newDateRange);
  }, []);

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

  // Function to handle date range picker changes - memoized callback
  const handleDatePickerChange = useCallback((dates: [Date, Date]) => {
    const [start, end] = dates;
    const formattedRange = `${format(start, 'MM/dd/yyyy')} - ${format(end, 'MM/dd/yyyy')}`;
    setDateRange(formattedRange);
  }, []);
  
  // Handle refresh button click - memoized callback
  const handleRefresh = useCallback(() => {
    if (refreshData) {
      refreshData();
    }
  }, [refreshData]);
  
  // Handle "View More" button click for failed calls - memoized callback
  const handleViewMoreFailedCalls = useCallback(() => {
    setShowAllFailedCalls(true);
  }, []);
  
  // Memoize the dashboard header to prevent unnecessary re-renders
  const dashboardHeader = useMemo(() => (
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
  ), [dateRange, groupBy, assistantFilter, loading, handleDateRangeChange, handleRefresh]);

  // Memoize the metrics cards to prevent unnecessary re-renders
  const metricsCards = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricsCard
        title="Total Call Minutes"
        value={metrics.totalCallMinutes.total.toFixed(2)}
        subtitle="Minutes spent on calls"
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
        value={formatNumber(metrics.numberOfCalls.total)}
        subtitle="Total calls made"
      >
        <LineChart
          data={metrics.numberOfCalls.points}
          xKey="date"
          yKey="count"
          color="#0ea5e9" // sky-500
          formatX={(date) => format(new Date(date), 'MM/dd')}
          formatY={(value) => value.toString()}
          hideGrid={true}
          hideTicks={true}
        />
      </MetricsCard>
      
      <MetricsCard
        title="Total Spent"
        value={formatCurrency(metrics.totalSpent.total)}
        subtitle="Cost of all calls"
      >
        <LineChart
          data={metrics.totalSpent.points}
          xKey="date"
          yKey="amount"
          color="#10b981" // emerald-500
          formatX={(date) => format(new Date(date), 'MM/dd')}
          formatY={(value) => formatCurrency(value)}
          hideGrid={true}
          hideTicks={true}
        />
      </MetricsCard>
      
      <MetricsCard
        title="Avg. Cost Per Call"
        value={formatCurrency(metrics.avgCostPerCall.total)}
        subtitle="Average cost per call"
      >
        <LineChart
          data={metrics.avgCostPerCall.points}
          xKey="date"
          yKey="amount"
          color="#8b5cf6" // violet-500
          formatX={(date) => format(new Date(date), 'MM/dd')}
          formatY={(value) => formatCurrency(value)}
          hideGrid={true}
          hideTicks={true}
        />
      </MetricsCard>
    </div>
  ), [metrics]);

  // Memoize the analysis charts to prevent unnecessary re-renders
  const analysisCharts = useMemo(() => (
    <>
      {/* Middle Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Call End Reason */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Call End Reason</h2>
          <div className="h-64">
            <BarChart
              data={analysis.callEndReason}
              xKey="reason"
              yKey="count"
              color="#f59e0b" // amber-500
              formatY={(value) => value.toString()}
            />
          </div>
        </div>
        
        {/* Call Duration by Assistant */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Call Duration by Assistant</h2>
          <div className="h-64">
            <LineChart
              data={analysis.callDurationByAssistant}
              xKey="date"
              yKey={['New Assistant', 'Unknown Assistant']}
              color={['#0ea5e9', '#8b5cf6']} // sky-500, violet-500
              formatX={(date) => format(new Date(date), 'MM/dd')}
              formatY={(value) => `${value} min`}
              showLegend={true}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row - More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost Breakdown */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Cost Breakdown</h2>
          <div className="h-64">
            <BarChart
              data={analysis.costBreakdown}
              xKey="category"
              yKey="amount"
              color="#10b981" // emerald-500
              formatY={(value) => formatCurrency(value)}
            />
          </div>
        </div>
        
        {/* Success Evaluation */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Success Evaluation</h2>
          <div className="h-64">
            <BarChart
              data={analysis.successEvaluation}
              xKey="metric"
              yKey="percentage"
              color="#8b5cf6" // violet-500
              formatY={(value) => `${value}%`}
            />
          </div>
        </div>
      </div>
    </>
  ), [analysis]);

  // Memoize the failed calls list to prevent unnecessary re-renders
  const failedCallsSection = useMemo(() => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Recent Unsuccessful Calls</h2>
        {!showAllFailedCalls && failedCalls.length > 3 && (
          <Button 
            variant="link" 
            className="text-amber-600 hover:text-amber-700"
            onClick={handleViewMoreFailedCalls}
          >
            View All
          </Button>
        )}
      </div>
      <FailedCallsList 
        calls={showAllFailedCalls ? failedCalls : failedCalls.slice(0, 3)} 
      />
    </div>
  ), [failedCalls, showAllFailedCalls, handleViewMoreFailedCalls]);

  // Memoize the concurrent calls chart to prevent unnecessary re-renders
  const concurrentCallsChart = useMemo(() => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Concurrent Calls</h2>
      <div className="h-64">
        <LineChart
          data={concurrentCalls}
          xKey="date"
          yKey="count"
          color="#f59e0b" // amber-500
          formatX={(date) => format(new Date(date), 'MM/dd')}
          formatY={(value) => value.toString()}
        />
      </div>
    </div>
  ), [concurrentCalls]);

  return (
    <div className="container mx-auto p-4 md:p-6 bg-[#f8f5f0]">
      {/* Dashboard Header */}
      {dashboardHeader}

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

      {/* Wrap content in Suspense boundaries for better loading experience */}
      <Suspense fallback={<div className="h-[200px] bg-gray-100 animate-pulse rounded mb-6" />}>
        {/* Top Row - Key Metrics */}
        {metricsCards}
      </Suspense>

      <Suspense fallback={<div className="h-[400px] bg-gray-100 animate-pulse rounded mb-6" />}>
        {/* Analysis Charts */}
        {analysisCharts}
      </Suspense>

      <Suspense fallback={<div className="h-[200px] bg-gray-100 animate-pulse rounded mb-6" />}>
        {/* Failed Calls List */}
        {failedCallsSection}
      </Suspense>

      <Suspense fallback={<div className="h-[200px] bg-gray-100 animate-pulse rounded" />}>
        {/* Concurrent Calls Chart */}
        {concurrentCallsChart}
      </Suspense>
    </div>
  );
}