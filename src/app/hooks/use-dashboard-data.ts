// app/dashboard/hooks/use-dashboard-data.ts

import { useState, useEffect, useMemo, useCallback } from 'react';

import { apiService } from '@/lib/api';

// Import mock data for fallback
import {
  totalCallMinutesData,
  numberOfCallsData,
  totalSpentData,
  avgCostPerCallData,
  callEndReasonData,
  callDurationByAssistantData,
  costBreakdownData,
  successEvaluationData,
  unsuccessfulCallsData,
  concurrentCallsData,
} from '../dashboard/data/mock-data';

interface DashboardDataOptions {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
  assistantId?: string;
  useMockData?: boolean; // For development/testing
}

/**
 * Custom hook for fetching dashboard data
 * Optimized with memoization to prevent unnecessary recalculations
 */
export function useDashboardData({
  dateFrom,
  dateTo,
  groupBy = 'day',
  assistantId,
  useMockData = true, // Default to mock data for now
}: DashboardDataOptions) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Memoize filter functions to prevent recreation on each render
  const filterDataByDateRange = useCallback(<T extends { date: string }>(data: T[]): T[] => {
    if (!dateFrom || !dateTo) return data;
    
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    return data.filter(item => {
      const itemDate = new Date(item.date);

      return itemDate >= fromDate && itemDate <= toDate;
    });
  }, [dateFrom, dateTo]);
  
  // Filter data by assistant ID if provided - memoized
  const filterDataByAssistant = useCallback((data: any) => {
    if (!assistantId || assistantId === 'all') return data;
    
    // For call duration by assistant, we need special handling
    const filteredCallDuration = data.callDurationByAssistant.map((item: any) => {
      const newItem = { date: item.date };
      
      if (assistantId === 'new' && 'New Assistant' in item) {
        (newItem as any)['New Assistant'] = item['New Assistant'];
      } else if (assistantId === 'unknown' && 'Unknown Assistant' in item) {
        (newItem as any)['Unknown Assistant'] = item['Unknown Assistant'];
      }
      
      return newItem;
    });
    
    return {
      ...data,
      callDurationByAssistant: filteredCallDuration,
    };
  }, [assistantId]);
  
  // Adjust granularity based on groupBy parameter - memoized
  const adjustDataByGrouping = useCallback((data: any) => {
    if (groupBy === 'day') return data; // No adjustment needed
    
    // For demo purposes, we'll just return the data as is
    // In a real implementation, you would aggregate data by week or month
    return data;
  }, [groupBy]);

  // Memoize the processed data to prevent recalculation on every render
  const processedMockData = useMemo(() => ({
    totalCallMinutes: {
      ...totalCallMinutesData,
      points: filterDataByDateRange(totalCallMinutesData.points),
    },
    numberOfCalls: {
      ...numberOfCallsData,
      points: filterDataByDateRange(numberOfCallsData.points),
    },
    totalSpent: {
      ...totalSpentData,
      points: filterDataByDateRange(totalSpentData.points),
    },
    avgCostPerCall: {
      ...avgCostPerCallData,
      points: filterDataByDateRange(avgCostPerCallData.points),
    },
  }), [filterDataByDateRange]);
  
  const [metrics, setMetrics] = useState(processedMockData);
  
  const processedAnalysisData = useMemo(() => filterDataByAssistant({
    callEndReason: callEndReasonData,
    callDurationByAssistant: callDurationByAssistantData,
    costBreakdown: costBreakdownData,
    successEvaluation: successEvaluationData,
  }), [filterDataByAssistant]);
  
  const [analysis, setAnalysis] = useState(processedAnalysisData);
  
  // Filter failed calls if needed - memoized
  const filteredFailedCalls = useMemo(() => {
    return assistantId && assistantId !== 'all'
      ? unsuccessfulCallsData.filter(call => 
        (assistantId === 'new' && call.assistant === 'New Assistant') ||
          (assistantId === 'unknown' && call.assistant === 'Unknown Assistant'),
      )
      : unsuccessfulCallsData;
  }, [assistantId]);
  
  const [failedCalls, setFailedCalls] = useState(filteredFailedCalls);
  
  // Filter concurrent calls by date range - memoized
  const filteredConcurrentCalls = useMemo(() => 
    filterDataByDateRange(concurrentCallsData),
  [filterDataByDateRange]);
  
  const [concurrentCalls, setConcurrentCalls] = useState(filteredConcurrentCalls);

  // Refresh data function - memoized to prevent recreation on each render
  const refreshData = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        if (useMockData) {
          // Update metrics with filtered data
          setMetrics({
            totalCallMinutes: {
              ...totalCallMinutesData,
              points: filterDataByDateRange(totalCallMinutesData.points),
            },
            numberOfCalls: {
              ...numberOfCallsData,
              points: filterDataByDateRange(numberOfCallsData.points),
            },
            totalSpent: {
              ...totalSpentData,
              points: filterDataByDateRange(totalSpentData.points),
            },
            avgCostPerCall: {
              ...avgCostPerCallData,
              points: filterDataByDateRange(avgCostPerCallData.points),
            },
          });
          
          // Update analysis data
          setAnalysis(filterDataByAssistant({
            callEndReason: callEndReasonData,
            callDurationByAssistant: callDurationByAssistantData,
            costBreakdown: costBreakdownData,
            successEvaluation: successEvaluationData,
          }));
          
          // Update failed calls
          setFailedCalls(filteredFailedCalls);
          
          // Update concurrent calls
          setConcurrentCalls(filteredConcurrentCalls);
          
          setLoading(false);
        } else {
          // In a real app, you would call your API here
          // apiService.getDashboardData({ dateFrom, dateTo, groupBy, assistantId })
          //   .then(data => {
          //     setMetrics(data.metrics);
          //     setAnalysis(data.analysis);
          //     setFailedCalls(data.failedCalls);
          //     setConcurrentCalls(data.concurrentCalls);
          //     setLoading(false);
          //   })
          //   .catch(err => {
          //     setError(err);
          //     setLoading(false);
          //   });
          
          // For now, just use the mock data
          setMetrics(processedMockData);
          setAnalysis(processedAnalysisData);
          setFailedCalls(filteredFailedCalls);
          setConcurrentCalls(filteredConcurrentCalls);
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    }, 1000); // Simulate network delay
  }, [
    dateFrom, 
    dateTo, 
    groupBy, 
    assistantId, 
    useMockData, 
    filterDataByDateRange, 
    filterDataByAssistant,
    processedMockData,
    processedAnalysisData,
    filteredFailedCalls,
    filteredConcurrentCalls,
  ]);

  // Effect to refresh data when dependencies change
  useEffect(() => {
    refreshData();
  }, [dateFrom, dateTo, groupBy, assistantId, refreshData]);

  return {
    loading,
    error,
    metrics,
    analysis,
    failedCalls,
    concurrentCalls,
    refreshData,
  };
}