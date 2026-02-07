/**
 * Campaign API Service
 * Centralized API client for the Campaign Service
 */

import { fetchJson, ApiError } from '@/lib/http';
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignControlResponse,
  CSVUploadResponse,
  QueueStatus,
  CampaignMonitoringStats,
  CreditStatus,
  SystemConfig,
  CampaignAnalytics,
  UserAnalyticsStats,
  CampaignAnalyticsDetail,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';

const { BASE_URL, DB_SERVICES_URL } = CAMPAIGN_API_CONFIG;

// ============================================
// Base Fetch Helpers
// ============================================

async function fetchCampaignApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  try {
    return await fetchJson<T>(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    console.error(`[CampaignAPI] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

async function fetchDbServicesApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${DB_SERVICES_URL}${endpoint}`;

  try {
    return await fetchJson<T>(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    console.error(`[DbServicesAPI] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// ============================================
// Campaign CRUD Operations
// ============================================

/**
 * Create a new campaign
 */
export async function createCampaign(
  data: CreateCampaignRequest,
): Promise<Campaign> {
  return fetchCampaignApi<Campaign>(
    `/campaigns/?user_uid=${encodeURIComponent(data.user_uid)}`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

/**
 * List all campaigns for a user
 */
export async function listCampaigns(userUid: string): Promise<Campaign[]> {
  return fetchCampaignApi<Campaign[]>(
    `/campaigns/?user_uid=${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(
  campaignId: string,
  userUid: string,
): Promise<Campaign> {
  return fetchCampaignApi<Campaign>(
    `/campaigns/${campaignId}?user_uid=${encodeURIComponent(userUid)}`,
  );
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  userUid: string,
  data: UpdateCampaignRequest,
): Promise<Campaign> {
  return fetchCampaignApi<Campaign>(
    `/campaigns/${campaignId}?user_uid=${encodeURIComponent(userUid)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

/**
 * Delete a campaign
 * NOTE: This endpoint currently returns 405 - flagged with backend team
 */
export async function deleteCampaign(
  campaignId: string,
  userUid: string,
): Promise<void> {
  return fetchCampaignApi<void>(
    `/campaigns/${campaignId}?user_uid=${encodeURIComponent(userUid)}`,
    {
      method: 'DELETE',
    },
  );
}

// ============================================
// CSV Upload
// ============================================

/**
 * Upload contacts CSV to a campaign
 */
export async function uploadCampaignCSV(
  campaignId: string,
  userUid: string,
  file: File,
): Promise<CSVUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${BASE_URL}/campaigns/${campaignId}/upload-csv?user_uid=${encodeURIComponent(userUid)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || 'Failed to upload CSV',
        response.status,
        errorData,
      );
    }

    return await response.json();
  } catch (error) {
    console.error('[CampaignAPI] Error uploading CSV:', error);
    throw error;
  }
}

// ============================================
// Campaign Control Operations
// ============================================

/**
 * Start a campaign
 */
export async function startCampaign(
  campaignId: string,
  userUid: string,
): Promise<CampaignControlResponse> {
  return fetchCampaignApi<CampaignControlResponse>(
    `/campaigns/${campaignId}/start?user_uid=${encodeURIComponent(userUid)}`,
    {
      method: 'POST',
    },
  );
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(
  campaignId: string,
  userUid: string,
): Promise<CampaignControlResponse> {
  return fetchCampaignApi<CampaignControlResponse>(
    `/campaigns/${campaignId}/pause?user_uid=${encodeURIComponent(userUid)}`,
    {
      method: 'POST',
    },
  );
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(
  campaignId: string,
  userUid: string,
): Promise<CampaignControlResponse> {
  return fetchCampaignApi<CampaignControlResponse>(
    `/campaigns/${campaignId}/resume?user_uid=${encodeURIComponent(userUid)}`,
    {
      method: 'POST',
    },
  );
}

/**
 * Stop a campaign
 */
export async function stopCampaign(
  campaignId: string,
  userUid: string,
): Promise<CampaignControlResponse> {
  return fetchCampaignApi<CampaignControlResponse>(
    `/campaigns/${campaignId}/stop?user_uid=${encodeURIComponent(userUid)}`,
    {
      method: 'POST',
    },
  );
}

// ============================================
// Monitoring Operations
// ============================================

/**
 * Get queue status for a user
 */
export async function getQueueStatus(userUid: string): Promise<QueueStatus> {
  return fetchCampaignApi<QueueStatus>(
    `/monitoring/queue-status/${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get monitoring stats for a specific campaign
 */
export async function getCampaignMonitoringStats(
  campaignId: string,
  userUid: string,
): Promise<CampaignMonitoringStats> {
  return fetchCampaignApi<CampaignMonitoringStats>(
    `/monitoring/campaigns/${encodeURIComponent(campaignId)}/stats?user_uid=${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get credit status for a user
 */
export async function getCreditStatus(userUid: string): Promise<CreditStatus> {
  return fetchCampaignApi<CreditStatus>(
    `/monitoring/credit-status/${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get system configuration
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  return fetchCampaignApi<SystemConfig>('/monitoring/config');
}

// ============================================
// Analytics Operations
// ============================================

/**
 * Get analytics for a specific campaign (from Campaign Service)
 */
export async function getCampaignAnalytics(
  campaignId: string,
  userUid: string,
): Promise<CampaignAnalytics> {
  return fetchCampaignApi<CampaignAnalytics>(
    `/campaigns/${campaignId}/analytics?user_uid=${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get user analytics stats (from DB Services)
 */
export async function getUserAnalyticsStats(
  userUid: string,
): Promise<UserAnalyticsStats> {
  return fetchDbServicesApi<UserAnalyticsStats>(
    `/analytics/stats/${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get detailed campaign analytics (from DB Services)
 */
export async function getCampaignAnalyticsDetail(
  userUid: string,
  campaignId: string,
): Promise<CampaignAnalyticsDetail> {
  return fetchDbServicesApi<CampaignAnalyticsDetail>(
    `/analytics/user/${encodeURIComponent(userUid)}/campaign/${encodeURIComponent(campaignId)}`,
  );
}

// ============================================
// Convenience Object Export
// ============================================

export const campaignApi = {
  // CRUD
  create: createCampaign,
  list: listCampaigns,
  get: getCampaign,
  update: updateCampaign,
  delete: deleteCampaign,

  // CSV
  uploadCSV: uploadCampaignCSV,

  // Control
  start: startCampaign,
  pause: pauseCampaign,
  resume: resumeCampaign,
  stop: stopCampaign,

  // Monitoring
  getQueueStatus,
  getCampaignMonitoringStats,
  getCreditStatus,
  getSystemConfig,

  // Analytics
  getAnalytics: getCampaignAnalytics,
  getUserStats: getUserAnalyticsStats,
  getDetailedAnalytics: getCampaignAnalyticsDetail,
};

export default campaignApi;
