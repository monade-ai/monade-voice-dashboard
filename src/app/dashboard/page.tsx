'use client';

import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Users, Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';


import { useDashboardData } from '@/app/hooks/use-dashboard-data';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';

import {
  DashboardSkeleton,
  WalletCardSkeleton,
  StatCardSkeleton,
  CarouselSkeleton,
  ChartSkeleton,
  CallLogSkeleton,
} from './components/loading-states';
import DashboardCarousel from './components/carousel';
import CompactVoiceChart from './components/compact-voice-chart';


// Enhanced WalletCard with data integration
const WalletCard = ({ wallet, isLoading = false, onTopUp }) => {
  if (isLoading) {
    return <WalletCardSkeleton />;
  }

  return (
    <div className="bg-yellow-400 p-6 rounded-xl shadow-lg border border-yellow-500 flex flex-col justify-between h-full min-h-[180px] w-[250px] transition-all duration-200 hover:shadow-xl">
      <div>
        <h3 className="font-semibold text-lg text-yellow-900 mb-2">Wallet</h3>
        <p className="text-5xl font-bold text-yellow-900">
          {wallet?.currency}{wallet?.balance?.toLocaleString() || '0'}
        </p>
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-lg text-yellow-800">
          {wallet?.minutesRemaining ? `${(wallet.minutesRemaining / 1000).toFixed(1)}k mins left` : '0 mins left'}
        </p>
        <button
          onClick={onTopUp}
          className="bg-yellow-900 text-yellow-400 p-3 rounded-full hover:bg-yellow-800 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2"
          aria-label="Top up wallet"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, isLoading = false }) => (
  <div className="bg-card p-4 rounded-lg shadow-md border border-border flex flex-col items-center justify-center text-center h-full hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-center mb-2">
      {Icon && <Icon className="w-6 h-6 text-muted-foreground mr-2" />}
      {isLoading ? (
        <div className="w-16 h-12 bg-muted animate-pulse rounded"></div>
      ) : (
        <p className="text-4xl font-bold text-foreground">{value}</p>
      )}
    </div>
    <div className="flex items-center justify-center space-x-2">
      <p className="text-lg font-bold text-muted-foreground">{title}</p>
      {trend && (
        <div className="flex items-center space-x-1">
          {trend.direction === 'up' && (
            <div className="flex items-center text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold">{trend.percentage}%</span>
            </div>
          )}
          {trend.direction === 'down' && (
            <div className="flex items-center text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold">{trend.percentage}%</span>
            </div>
          )}
          {trend.direction === 'neutral' && (
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold">{trend.percentage}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

const CallLogItem = ({ agent, to, contactBucket, status, duration, integrations }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'Ended':
        return 'border-green-500 bg-green-500/10 text-green-500';
      case 'Started':
        return 'border-blue-500 bg-blue-500/10 text-blue-500';
      case 'Disconnected':
        return 'border-red-500 bg-red-500/10 text-red-500';
      default:
        return 'border-gray-500 bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="p-4 flex items-center">
        <img src={agent.avatar} alt={agent.name} className="w-8 h-8 rounded-full mr-3" />
        <p className="font-medium text-foreground">{agent.name}</p>
      </td>
      <td className="p-4 text-muted-foreground">{to}</td>
      <td className="p-4 text-muted-foreground">{contactBucket}</td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded-full border text-xs font-semibold ${getStatusClass(status)}`}>
          {status}
        </span>
      </td>
      <td className="p-4 text-muted-foreground">{duration}</td>
      <td className="p-4 flex items-center space-x-2">
        {integrations.map(src => <img key={src} src={src} className="w-6 h-6 rounded-full" />)}
      </td>
    </tr>
  );
};

export default function DashboardPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const callsPerPage = 6;

  // Use the enhanced dashboard data hook
  const {
    metrics,
    chartData,
    timeRange,
    loading,
    errors,
    changeTimeRange,
    refreshData,
  } = useDashboardData();

  // Handle wallet top-up action
  const handleWalletTopUp = () => {
    toast.success('Redirecting to payment gateway...');
    // In a real app, this would redirect to payment flow
  };

  // Handle data refresh
  const handleRefresh = () => {
    refreshData();
    toast.success('Dashboard data refreshed');
  };

  const calls = [
    { agent: { name: 'Agent Smith', avatar: '/avatars/01.png' }, to: '+91 98765 43210', contactBucket: 'Leads', status: 'Ended', duration: '5m 23s', integrations: ['/integrations/hubspot.png', '/integrations/salesforce.png'] },
    { agent: { name: 'Agent 007', avatar: '/avatars/02.png' }, to: '+91 91234 56789', contactBucket: 'Customers', status: 'Started', duration: '1m 12s', integrations: ['/integrations/sheets.png'] },
    { agent: { name: 'Agent Carter', avatar: '/avatars/04.png' }, to: '+91 87654 32109', contactBucket: 'Follow-ups', status: 'Disconnected', duration: '0m 30s', integrations: ['/integrations/hubspot.png'] },
    { agent: { name: 'Agent Romanoff', avatar: '/avatars/05.png' }, to: '+91 78901 23456', contactBucket: 'Leads', status: 'Ended', duration: '12m 45s', integrations: ['/integrations/salesforce.png', '/integrations/sheets.png'] },
    { agent: { name: 'Agent Coulson', avatar: '/avatars/06.png' }, to: '+91 98765 12345', contactBucket: 'Customers', status: 'Ended', duration: '3m 2s', integrations: ['/integrations/hubspot.png'] },
    { agent: { name: 'Agent May', avatar: '/avatars/07.png' }, to: '+91 87654 67890', contactBucket: 'Leads', status: 'Started', duration: '2m 5s', integrations: ['/integrations/sheets.png'] },
    { agent: { name: 'Agent Fitz', avatar: '/avatars/08.png' }, to: '+91 78901 65432', contactBucket: 'Follow-ups', status: 'Ended', duration: '8m 15s', integrations: ['/integrations/hubspot.png', '/integrations/salesforce.png'] },
    { agent: { name: 'Agent Simmons', avatar: '/avatars/09.png' }, to: '+91 98765 54321', contactBucket: 'Customers', status: 'Disconnected', duration: '0m 10s', integrations: ['/integrations/hubspot.png'] },
    { agent: { name: 'Agent Mack', avatar: '/avatars/10.png' }, to: '+91 87654 12345', contactBucket: 'Leads', status: 'Ended', duration: '6m 50s', integrations: ['/integrations/sheets.png'] },
    { agent: { name: 'Agent Daisy', avatar: '/avatars/12.png' }, to: '+91 78901 98765', contactBucket: 'Follow-ups', status: 'Started', duration: '0m 55s', integrations: ['/integrations/salesforce.png'] },
    { agent: { name: 'Agent Yo-Yo', avatar: '/avatars/13.png' }, to: '+91 98765 98765', contactBucket: 'Customers', status: 'Ended', duration: '4m 33s', integrations: ['/integrations/hubspot.png', '/integrations/sheets.png'] },
    { agent: { name: 'Agent Deke', avatar: '/avatars/15.png' }, to: '+91 87654 54321', contactBucket: 'Leads', status: 'Ended', duration: '9m 21s', integrations: ['/integrations/hubspot.png'] },
  ];

  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentCalls = calls.slice(indexOfFirstCall, indexOfLastCall);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Show full skeleton during initial load
  if (loading.initial) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground p-8 font-sans">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            {(errors.metrics || errors.chart) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>
          <Button className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Deploy Agent
          </Button>
        </header>

        {/* Enhanced responsive grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-12" style={{ gridAutoRows: '1fr' }}>
          {/* Wallet Card with Error Boundary - Reduced width */}
<div className="col-span-1 flex justify-center items-center">
  <ErrorBoundary>
    <WalletCard
      wallet={metrics?.wallet}
      isLoading={loading.metrics}
      onTopUp={handleWalletTopUp}
    />
  </ErrorBoundary>
</div>

          {/* Compact Voice Agent Performance Chart */}
          <div className="md:col-span-1 lg:col-span-2">
            <ErrorBoundary>
              <CompactVoiceChart
                data={chartData}
                timeRange={timeRange}
                onTimeRangeChange={changeTimeRange}
                loading={loading.chart}
                error={errors.chart}
              />
            </ErrorBoundary>
          </div>

          {/* Metric Cards Stack */}
          <div className="md:col-span-1 lg:col-span-1 grid grid-rows-2 gap-4">
            <ErrorBoundary>
              <StatCard
                title="Agents"
                value={metrics?.agents?.total?.toLocaleString() || '0'}
                icon={Users}
                trend={metrics?.agents?.trend}
                isLoading={loading.metrics}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <StatCard
                title="Calls"
                value={metrics?.calls?.total?.toLocaleString() || '0'}
                icon={Phone}
                trend={metrics?.calls?.trend}
                isLoading={loading.metrics}
              />
            </ErrorBoundary>
          </div>

          {/* Activity Carousel */}
<div className="md:col-span-2 lg:col-span-2">
  <ErrorBoundary>
    <DashboardCarousel />
  </ErrorBoundary>
</div>
        </div>



        {/* Call Logs Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Call Logs</h2>
          </div>
          <ErrorBoundary>
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agent</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Bucket</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Integrations</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCalls.map((call, i) => (
                    <CallLogItem key={i} {...call} />
                  ))}
                </tbody>
              </table>
              <div className="p-4 flex justify-between items-center bg-muted/10">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirstCall + 1} to {Math.min(indexOfLastCall, calls.length)} of {calls.length} calls
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium px-3">
                    Page {currentPage} of {Math.ceil(calls.length / callsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={indexOfLastCall >= calls.length}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
