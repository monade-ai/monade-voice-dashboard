'use client';

import { useState, useEffect, useCallback } from 'react';

import { ChartDataPoint, fetchChartData, defaultChartData } from '@/app/(app)/dashboard/data/chart-data';

interface DashboardMetrics {
  agents: {
    total: number
    active: number
    trend: {
      direction: 'up' | 'down' | 'neutral'
      percentage: number
    }
  }
  calls: {
    total: number
    today: number
    trend: {
      direction: 'up' | 'down' | 'neutral'
      percentage: number
    }
  }
  wallet: {
    balance: number
    currency: string
    minutesRemaining: number
  }
}

interface DashboardDataState {
  metrics: DashboardMetrics | null
  chartData: ChartDataPoint[]
  timeRange: '24h' | '7d' | '30d'
  loading: {
    metrics: boolean
    chart: boolean
    initial: boolean
  }
  errors: {
    metrics: string | null
    chart: string | null
  }
}

const defaultMetrics: DashboardMetrics = {
  agents: {
    total: 23,
    active: 18,
    trend: { direction: 'up', percentage: 12 },
  },
  calls: {
    total: 1234,
    today: 89,
    trend: { direction: 'up', percentage: 8 },
  },
  wallet: {
    balance: 12345,
    currency: '₹',
    minutesRemaining: 3400,
  },
};

// Simulate metrics API call
const fetchMetrics = async (): Promise<DashboardMetrics> => {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  // Simulate occasional errors (3% chance)
  if (Math.random() < 0.03) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  
  // Generate slightly varied metrics
  const variation = (base: number, factor: number = 0.1) => 
    Math.floor(base + (Math.random() - 0.5) * base * factor);
  
  return {
    agents: {
      total: variation(23),
      active: variation(18),
      trend: { 
        direction: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'down' : 'neutral',
        percentage: Math.floor(Math.random() * 20) + 1,
      },
    },
    calls: {
      total: variation(1234, 0.2),
      today: variation(89, 0.3),
      trend: { 
        direction: Math.random() > 0.2 ? 'up' : Math.random() > 0.6 ? 'down' : 'neutral',
        percentage: Math.floor(Math.random() * 15) + 1,
      },
    },
    wallet: {
      balance: variation(12345, 0.05),
      currency: '₹',
      minutesRemaining: variation(3400, 0.1),
    },
  };
};

export const useDashboardData = () => {
  const [state, setState] = useState<DashboardDataState>({
    metrics: null,
    chartData: defaultChartData,
    timeRange: '7d',
    loading: {
      metrics: true,
      chart: false,
      initial: true,
    },
    errors: {
      metrics: null,
      chart: null,
    },
  });

  // Load metrics data
  const loadMetrics = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, metrics: true },
      errors: { ...prev.errors, metrics: null },
    }));

    try {
      const metrics = await fetchMetrics();
      setState(prev => ({
        ...prev,
        metrics,
        loading: { ...prev.loading, metrics: false },
      }));
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      setState(prev => ({
        ...prev,
        metrics: defaultMetrics, // Fallback to default metrics
        loading: { ...prev.loading, metrics: false },
        errors: { 
          ...prev.errors, 
          metrics: error instanceof Error ? error.message : 'Failed to load metrics',
        },
      }));
    }
  }, []);

  // Load chart data
  const loadChartData = useCallback(async (timeRange: '24h' | '7d' | '30d') => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, chart: true },
      errors: { ...prev.errors, chart: null },
    }));

    try {
      const chartData = await fetchChartData(timeRange);
      setState(prev => ({
        ...prev,
        chartData,
        timeRange,
        loading: { ...prev.loading, chart: false },
      }));
    } catch (error) {
      console.error('Failed to load chart data:', error);
      // Provide fallback chart data instead of showing error
      const { generateMockChartData } = await import('@/app/(app)/dashboard/data/chart-data');
      const fallbackData = generateMockChartData(timeRange);
      
      setState(prev => ({
        ...prev,
        chartData: fallbackData,
        timeRange,
        loading: { ...prev.loading, chart: false },
        errors: { 
          ...prev.errors, 
          chart: null, // Don't show error, just use fallback data
        },
      }));
    }
  }, []);

  // Change time range
  const changeTimeRange = useCallback((newTimeRange: '24h' | '7d' | '30d') => {
    if (newTimeRange !== state.timeRange) {
      loadChartData(newTimeRange);
    }
  }, [state.timeRange, loadChartData]);

  // Refresh all data
  const refreshData = useCallback(() => {
    loadMetrics();
    loadChartData(state.timeRange);
  }, [loadMetrics, loadChartData, state.timeRange]);

  // Initial data load with progressive loading
  useEffect(() => {
    const initializeData = async () => {
      // Load metrics first (faster)
      await loadMetrics();
      
      // Then load chart data
      await loadChartData('7d');
      
      // Mark initial loading as complete
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, initial: false },
      }));
    };

    initializeData();
  }, [loadMetrics, loadChartData]);

  return {
    ...state,
    changeTimeRange,
    refreshData,
    loadMetrics,
    loadChartData,
  };
};
