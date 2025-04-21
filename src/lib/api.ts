// app/lib/api.ts

/**
 * API service for fetching dashboard data
 */

interface FetchOptions {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
    assistantId?: string;
  }
  
/**
   * Base fetch function with error handling
   */
async function fetchWithErrorHandling(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
      
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
      
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}
  
/**
   * Builds query parameters from options
   */
function buildQueryParams(options?: FetchOptions): string {
  if (!options) return '';
    
  const params = new URLSearchParams();
    
  if (options.dateFrom) params.append('dateFrom', options.dateFrom);
  if (options.dateTo) params.append('dateTo', options.dateTo);
  if (options.groupBy) params.append('groupBy', options.groupBy);
  if (options.assistantId) params.append('assistantId', options.assistantId);
    
  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
}
  
/**
   * API service methods
   */
export const apiService = {
  /**
     * Fetches dashboard overview metrics
     */
  getDashboardMetrics: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/dashboard/metrics${queryParams}`);
  },
    
  /**
     * Fetches call details
     */
  getCallDetails: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls${queryParams}`);
  },
    
  /**
     * Fetches call analysis data
     */
  getCallAnalysis: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls/analysis${queryParams}`);
  },
    
  /**
     * Fetches unsuccessful calls
     */
  getUnsuccessfulCalls: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls/unsuccessful${queryParams}`);
  },
    
  /**
     * Fetches concurrent calls data
     */
  getConcurrentCalls: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls/concurrent${queryParams}`);
  },
};