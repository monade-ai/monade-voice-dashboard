// app/lib/api.ts

/**
 * API service for fetching dashboard data with organization context
 */

interface FetchOptions {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
    assistantId?: string;
    organizationId?: string;
    query?: string;
    bucketId?: string;
    offset?: number;
    limit?: number;
  }

/**
 * Get organization context from auth
 */
function getOrganizationContext(): { organizationId?: string } {
  // This will be populated by the auth context
  if (typeof window !== 'undefined') {
    const orgId = localStorage.getItem('current_organization_id');

    return orgId ? { organizationId: orgId } : {};
  }

  return {};
}
  
/**
   * Base fetch function with error handling and organization context
   */
async function fetchWithErrorHandling(url: string, options?: RequestInit) {
  try {
    const orgContext = getOrganizationContext();
    const headers = {
      'Content-Type': 'application/json',
      ...(orgContext.organizationId && { 'X-Organization-ID': orgContext.organizationId }),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });
      
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
  if (options.organizationId) params.append('organizationId', options.organizationId);
  if (options.query) params.append('query', options.query);
  if (options.bucketId) params.append('bucketId', options.bucketId);
    
  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
}
  
/**
   * API service methods with organization context
   */
export const apiService = {
  // Dashboard APIs
  getDashboardMetrics: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/dashboard/metrics${queryParams}`);
  },
    
  getCallDetails: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls${queryParams}`);
  },
    
  getCallAnalysis: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls/analysis${queryParams}`);
  },
    
  getUnsuccessfulCalls: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls/unsuccessful${queryParams}`);
  },
    
  getConcurrentCalls: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/calls/concurrent${queryParams}`);
  },

  // Assistants APIs
  getAssistants: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/assistants${queryParams}`);
  },

  createAssistant: async (data: any) => {
    return fetchWithErrorHandling('/api/assistants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAssistant: async (id: string, data: any) => {
    return fetchWithErrorHandling(`/api/assistants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAssistant: async (id: string) => {
    return fetchWithErrorHandling(`/api/assistants/${id}`, {
      method: 'DELETE',
    });
  },

  // Contacts APIs
  getContactBuckets: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/contacts/buckets${queryParams}`);
  },

  createContactBucket: async (data: any) => {
    return fetchWithErrorHandling('/api/contacts/buckets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getContactsInBucket: async (bucketId: string, options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/contacts/buckets/${bucketId}/contacts${queryParams}`);
  },

  createContact: async (bucketId: string, data: any) => {
    return fetchWithErrorHandling(`/api/contacts/buckets/${bucketId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  bulkCreateContacts: async (bucketId: string, data: any[]) => {
    return fetchWithErrorHandling(`/api/contacts/buckets/${bucketId}/contacts/bulk`, {
      method: 'POST',
      body: JSON.stringify({ contacts: data }),
    });
  },

  deleteContact: async (bucketId: string, contactId: string) => {
    return fetchWithErrorHandling(`/api/contacts/buckets/${bucketId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  },

  deleteContactBucket: async (bucketId: string) => {
    return fetchWithErrorHandling(`/api/contacts/buckets/${bucketId}`, {
      method: 'DELETE',
    });
  },

  searchContacts: async (query: string, bucketId?: string, options?: FetchOptions) => {
    const searchOptions = { ...options, query, bucketId };
    const queryParams = buildQueryParams(searchOptions);

    return fetchWithErrorHandling(`/api/contacts/search${queryParams}`);
  },

  // Knowledge Base APIs
  getKnowledgeBases: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/knowledge-bases${queryParams}`);
  },

  createKnowledgeBase: async (data: any) => {
    return fetchWithErrorHandling('/api/knowledge-bases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateKnowledgeBase: async (id: string, data: any) => {
    return fetchWithErrorHandling(`/api/knowledge-bases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteKnowledgeBase: async (id: string) => {
    return fetchWithErrorHandling(`/api/knowledge-bases/${id}`, {
      method: 'DELETE',
    });
  },

  // Workflows APIs
  getWorkflows: async (options?: FetchOptions) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/workflows${queryParams}`);
  },

  createWorkflow: async (data: any) => {
    return fetchWithErrorHandling('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateWorkflow: async (id: string, data: any) => {
    return fetchWithErrorHandling(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteWorkflow: async (id: string) => {
    return fetchWithErrorHandling(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  // Campaign APIs
  getCampaigns: async (options?: FetchOptions & {
    status?: 'Created' | 'InProgress' | 'Completed' | 'Failed' | 'Canceled' | 'Deleted' | 'Paused';
    sort_by?: string;
    name?: string;
    type?: string;
  }) => {
    const queryParams = buildQueryParams(options);

    return fetchWithErrorHandling(`/api/campaigns${queryParams}`);
  },

  createCampaign: async (data: any) => {
    return fetchWithErrorHandling('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCampaign: async (id: string) => {
    return fetchWithErrorHandling(`/api/campaigns/${id}`);
  },

  updateCampaign: async (id: string, action: 'pause' | 'resume' | 'complete' | 'archive') => {
    return fetchWithErrorHandling(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ campaigns: [{ action }] }),
    });
  },

  deleteCampaign: async (id: string) => {
    return fetchWithErrorHandling(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  },

  getCampaignCallDetails: async (id: string, options?: {
    offset?: number;
    limit?: number;
    status?: string;
    sort_by?: string;
  }) => {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return fetchWithErrorHandling(`/api/campaigns/${id}/call-details${queryString}`);
  },
};