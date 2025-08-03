/**
 * Organization-aware search and filtering utilities
 */

import { useAuth } from '@/lib/auth/AuthProvider';

export interface SearchFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  status?: string;
  organizationId?: string;
}

export interface SearchOptions {
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Get organization context for search operations
 */
export function getOrganizationSearchContext(): { organizationId?: string } {
  if (typeof window !== 'undefined') {
    const orgId = localStorage.getItem('current_organization_id');
    return orgId ? { organizationId: orgId } : {};
  }
  return {};
}

/**
 * Build search parameters with organization context
 */
export function buildOrganizationSearchParams(
  filters: SearchFilters,
  options: SearchOptions = {}
): URLSearchParams {
  const params = new URLSearchParams();
  
  // Add organization context
  const orgContext = getOrganizationSearchContext();
  if (orgContext.organizationId) {
    params.append('organizationId', orgContext.organizationId);
  }
  
  // Add filters
  if (filters.query) params.append('query', filters.query);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  
  // Add options
  if (options.includeArchived) params.append('includeArchived', 'true');
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  
  return params;
}

/**
 * Filter data by organization context
 */
export function filterByOrganization<T extends { organizationId?: string }>(
  data: T[],
  organizationId?: string
): T[] {
  if (!organizationId) return data;
  return data.filter(item => item.organizationId === organizationId);
}

/**
 * Generic search function with organization context
 */
export function searchWithOrganizationContext<T>(
  data: T[],
  query: string,
  searchFields: (keyof T)[],
  organizationId?: string
): T[] {
  let filteredData = data;
  
  // Filter by organization if applicable
  if (organizationId && data.length > 0 && 'organizationId' in data[0]) {
    filteredData = filterByOrganization(data as any, organizationId) as T[];
  }
  
  // Apply text search
  if (!query.trim()) return filteredData;
  
  const lowerQuery = query.toLowerCase();
  return filteredData.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery);
      }
      if (typeof value === 'number') {
        return value.toString().includes(lowerQuery);
      }
      return false;
    });
  });
}

/**
 * Hook for organization-aware search
 */
export function useOrganizationSearch() {
  const { currentOrganization } = useAuth();
  
  const search = <T>(
    data: T[],
    query: string,
    searchFields: (keyof T)[]
  ): T[] => {
    return searchWithOrganizationContext(
      data,
      query,
      searchFields,
      currentOrganization?.id
    );
  };
  
  const buildSearchParams = (
    filters: SearchFilters,
    options: SearchOptions = {}
  ): URLSearchParams => {
    return buildOrganizationSearchParams(
      { ...filters, organizationId: currentOrganization?.id },
      options
    );
  };
  
  return {
    search,
    buildSearchParams,
    organizationId: currentOrganization?.id,
  };
}