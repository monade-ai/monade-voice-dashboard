// app/dashboard/hooks/use-dashboard-data.ts

import { useState, useEffect } from 'react';
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
  concurrentCallsData
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
 */
export function useDashboardData({
  dateFrom,
  dateTo,
  groupBy = 'day',
  assistantId,
  useMockData = true // Default to mock data for now
}: DashboardDataOptions) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Filter and process data based on parameters
  const filterDataByDateRange = <T extends { date: string }>(data: T[]): T[] => {
    if (!dateFrom || !dateTo) return data;
    
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= fromDate && itemDate <= toDate;
    });
  };
  
  // Filter data by assistant ID if provided
  const filterDataByAssistant = (data: any) => {
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
      callDurationByAssistant: filteredCallDuration
    };
  };
  
  // Adjust granularity based on groupBy parameter
  const adjustDataByGrouping = (data: any) => {
    if (groupBy === 'day') return data; // No adjustment needed
    
    // For demo purposes, we'll just return the data as is
    // In a real implementation, you would aggregate data by week or month
    return data;
  };

  // Initialize state with processed mock data
  const processedMockData = {
    totalCallMinutes: {
      ...totalCallMinutesData,
      points: filterDataByDateRange(totalCallMinutesData.points)
    },
    numberOfCalls: {
      ...numberOfCallsData,
      points: filterDataByDateRange(numberOfCallsData.points)
    },
    totalSpent: {
      ...totalSpentData,
      points: filterDataByDateRange(totalSpentData.points)
    },
    avgCostPerCall: {
      ...avgCostPerCallData,
      points: filterDataByDateRange(avgCostPerCallData.points)
    }
  };
  
  const [metrics, setMetrics] = useState(processedMockData);
  
  const processedAnalysisData = filterDataByAssistant({
    callEndReason: callEndReasonData,
    callDurationByAssistant: callDurationByAssistantData,
    costBreakdown: costBreakdownData,
    successEvaluation: successEvaluationData
  });
  
  const [analysis, setAnalysis] = useState(processedAnalysisData);
  
  // Filter failed calls if needed
  const filteredFailedCalls = assistantId && assistantId !== 'all'
    ? unsuccessfulCallsData.filter(call => 
        (assistantId === 'new' && call.assistant === 'New Assistant') ||
        (assistantId === 'unknown' && call.assistant === 'Unknown Assistant')
      )
    : unsuccessfulCallsData;
  
  const [failedCalls, setFailedCalls] = useState(filteredFailedCalls);
  
  // Filter concurrent calls by date range
  const filteredConcurrentCalls = filterDataByDateRange(concurrentCallsData);
  const [concurrentCalls, setConcurrentCalls] = useState(filteredConcurrentCalls);

  useEffect(() => {
    // If using mock data, we'll process it directly
    if (useMockData) {
      // Update metrics with filtered data
      setMetrics({
        totalCallMinutes: {
          ...totalCallMinutesData,
          points: filterDataByDateRange(totalCallMinutesData.points)
        },
        numberOfCalls: {
          ...numberOfCallsData,
          points: filterDataByDateRange(numberOfCallsData.points)
        },
        totalSpent: {
          ...totalSpentData,
          points: filterDataByDateRange(totalSpentData.points)
        },
        avgCostPerCall: {
          ...avgCostPerCallData,
          points: filterDataByDateRange(avgCostPerCallData.points)
        }
      });
      
      // Update analysis with filtered data
      setAnalysis(filterDataByAssistant({
        callEndReason: callEndReasonData,
        callDurationByAssistant: callDurationByAssistantData,
        costBreakdown: costBreakdownData,
        successEvaluation: successEvaluationData
      }));
      
      // Update failed calls if needed
      setFailedCalls(
        assistantId && assistantId !== 'all'
          ? unsuccessfulCallsData.filter(call => 
              (assistantId === 'new' && call.assistant === 'New Assistant') ||
              (assistantId === 'unknown' && call.assistant === 'Unknown Assistant')
            )
          : unsuccessfulCallsData
      );
      
      // Update concurrent calls by date range
      setConcurrentCalls(filterDataByDateRange(concurrentCallsData));
      
      setLoading(false);
      return;
    }
    
    // Function to fetch all data in parallel
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const options = { dateFrom, dateTo, groupBy, assistantId };
        
        // Fetch all data in parallel
        const [
          metricsData,
          analysisData,
          unsuccessfulCallsData,
          concurrentCallsData
        ] = await Promise.all([
          apiService.getDashboardMetrics(options),
          apiService.getCallAnalysis(options),
          apiService.getUnsuccessfulCalls(options),
          apiService.getConcurrentCalls(options)
        ]);
        
        // Update state with fetched data
        setMetrics(metricsData);
        setAnalysis(analysisData);
        setFailedCalls(unsuccessfulCallsData);
        setConcurrentCalls(concurrentCallsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [dateFrom, dateTo, groupBy, assistantId, useMockData]);

  // Function to refresh data on demand
  const refreshData = async () => {
    setLoading(true);
    
    try {
      if (useMockData) {
        // Delay for a brief moment to simulate loading
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update metrics with filtered data
        setMetrics({
          totalCallMinutes: {
            ...totalCallMinutesData,
            points: filterDataByDateRange(totalCallMinutesData.points)
          },
          numberOfCalls: {
            ...numberOfCallsData,
            points: filterDataByDateRange(numberOfCallsData.points)
          },
          totalSpent: {
            ...totalSpentData,
            points: filterDataByDateRange(totalSpentData.points)
          },
          avgCostPerCall: {
            ...avgCostPerCallData,
            points: filterDataByDateRange(avgCostPerCallData.points)
          }
        });
        
        // Update analysis with filtered data
        setAnalysis(filterDataByAssistant({
          callEndReason: callEndReasonData,
          callDurationByAssistant: callDurationByAssistantData,
          costBreakdown: costBreakdownData,
          successEvaluation: successEvaluationData
        }));
        
        // Update failed calls if needed
        setFailedCalls(
          assistantId && assistantId !== 'all'
            ? unsuccessfulCallsData.filter(call => 
                (assistantId === 'new' && call.assistant === 'New Assistant') ||
                (assistantId === 'unknown' && call.assistant === 'Unknown Assistant')
              )
            : unsuccessfulCallsData
        );
        
        // Update concurrent calls by date range
        setConcurrentCalls(filterDataByDateRange(concurrentCallsData));
        
        setError(null);
      } else {
        const options = { dateFrom, dateTo, groupBy, assistantId };
        
        // Fetch all data in parallel
        const [
          metricsData,
          analysisData,
          unsuccessfulCallsData,
          concurrentCallsData
        ] = await Promise.all([
          apiService.getDashboardMetrics(options),
          apiService.getCallAnalysis(options),
          apiService.getUnsuccessfulCalls(options),
          apiService.getConcurrentCalls(options)
        ]);
        
        // Update state with refreshed data
        setMetrics(metricsData);
        setAnalysis(analysisData);
        setFailedCalls(unsuccessfulCallsData);
        setConcurrentCalls(concurrentCallsData);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      console.error('Error refreshing dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    metrics,
    analysis,
    failedCalls,
    concurrentCalls,
    refreshData
  };
}