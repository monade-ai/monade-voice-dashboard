/**
 * Campaign API Service
 * Centralized API client for the Campaign Service
 */

import { fetchJson, ApiError, FetchJsonOptions } from '@/lib/http';
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
  CampaignAnalyticsJobStatus,
  CampaignEnhanceTranscriptsResponse,
  UserAnalyticsStats,
  CampaignAnalyticsDetail,
  CampaignRecordingStatus,
  CampaignContact,
  CampaignReanalyzeResponse,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';

const { BASE_URL, DB_SERVICES_URL } = CAMPAIGN_API_CONFIG;

// ============================================
// Base Fetch Helpers
// ============================================

async function fetchCampaignApi<T>(
  endpoint: string,
  options?: FetchJsonOptions,
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
  options?: FetchJsonOptions,
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
      credentials: 'include',
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
 * Get contact-level telemetry for a campaign
 */
export async function getCampaignContacts(
  campaignId: string,
  userUid: string,
  skip = 0,
  limit = 200,
): Promise<CampaignContact[]> {
  return fetchCampaignApi<CampaignContact[]>(
    `/campaigns/${encodeURIComponent(campaignId)}/contacts?user_uid=${encodeURIComponent(userUid)}&skip=${skip}&limit=${limit}`,
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
  options: { includeCalls?: boolean; callLimit?: number; callOffset?: number } = {},
): Promise<CampaignAnalytics> {
  void userUid;
  const params = new URLSearchParams();
  if (options.includeCalls) params.set('include_calls', 'true');
  if (options.callLimit !== undefined) params.set('call_limit', String(options.callLimit));
  if (options.callOffset !== undefined) params.set('call_offset', String(options.callOffset));
  const query = params.toString();

  return fetchDbServicesApi<CampaignAnalytics>(
    `/campaigns/${encodeURIComponent(campaignId)}/analytics${query ? `?${query}` : ''}`,
  );
}

export async function reanalyzeCampaign(
  campaignId: string,
  userUid: string,
  body: { template_id: string; commit: boolean; concurrency: number; async_job?: boolean },
  options: Pick<FetchJsonOptions, 'signal'> = {},
): Promise<CampaignReanalyzeResponse> {
  void userUid;

  return fetchDbServicesApi<CampaignReanalyzeResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/reanalyze`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      retry: { retries: 0 },
      signal: options.signal,
    },
  );
}

export async function enhanceCampaignTranscripts(
  campaignId: string,
  userUid: string,
  body: { concurrency: number; async_job?: boolean },
  options: Pick<FetchJsonOptions, 'signal'> = {},
): Promise<CampaignEnhanceTranscriptsResponse> {
  void userUid;

  return fetchDbServicesApi<CampaignEnhanceTranscriptsResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/enhance-transcripts`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      retry: { retries: 0 },
      signal: options.signal,
    },
  );
}

export async function getCampaignAnalyticsJob(
  campaignId: string,
  userUid: string,
  jobId: string,
): Promise<CampaignAnalyticsJobStatus> {
  void userUid;

  return fetchCampaignApi<CampaignAnalyticsJobStatus>(
    `/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(jobId)}`,
  );
}

export async function cancelCampaignAnalyticsJob(
  campaignId: string,
  userUid: string,
  jobId: string,
): Promise<CampaignAnalyticsJobStatus> {
  void userUid;

  return fetchCampaignApi<CampaignAnalyticsJobStatus>(
    `/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(jobId)}/cancel`,
    {
      method: 'POST',
      retry: { retries: 0 },
    },
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

/**
 * Get all analytics records for a user (fallback when campaign_id is missing).
 */
export async function getUserAnalyticsDetail(
  userUid: string,
): Promise<CampaignAnalyticsDetail> {
  return fetchDbServicesApi<CampaignAnalyticsDetail>(
    `/analytics/user/${encodeURIComponent(userUid)}`,
  );
}

/**
 * Get campaign recording readiness and optionally refresh missing Vobiz URLs.
 */
export async function getCampaignRecordingStatus(
  userUid: string,
  campaignId: string,
  options: { refreshMissing?: boolean; maxRefresh?: number } = {},
): Promise<CampaignRecordingStatus> {
  const params = new URLSearchParams();
  params.set('refresh_missing', String(options.refreshMissing ?? true));
  if (options.maxRefresh !== undefined) {
    params.set('max_refresh', String(options.maxRefresh));
  }

  return fetchDbServicesApi<CampaignRecordingStatus>(
    `/analytics/user/${encodeURIComponent(userUid)}/campaign/${encodeURIComponent(campaignId)}/recordings/status?${params.toString()}`,
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
  getCampaignContacts,
  getCreditStatus,
  getSystemConfig,

  // Analytics
  getAnalytics: getCampaignAnalytics,
  reanalyze: reanalyzeCampaign,
  enhanceTranscripts: enhanceCampaignTranscripts,
  getAnalyticsJob: getCampaignAnalyticsJob,
  cancelAnalyticsJob: cancelCampaignAnalyticsJob,
  getUserStats: getUserAnalyticsStats,
  getDetailedAnalytics: getCampaignAnalyticsDetail,
  getUserDetailedAnalytics: getUserAnalyticsDetail,
  getCampaignRecordingStatus,
};

export default campaignApi;
