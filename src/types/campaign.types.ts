/**
 * Campaign API Types
 * Types for the Campaign Service API integration
 */

// ============================================
// Campaign Status & Enums
// ============================================

export type CampaignStatus = 'pending' | 'active' | 'paused' | 'stopped' | 'completed';

export type CampaignProvider = 'vobiz' | 'twilio';

export type AnalyticsVerdict =
  | 'interested'
  | 'not_interested'
  | 'call_disconnected'
  | 'likely_to_book';

export type CallQuality =
  | 'completed'
  | 'abrupt_end'
  | 'no_response'
  | 'voicemail';

// ============================================
// Campaign Core Types
// ============================================

export interface Campaign {
  id: string;
  user_uid: string;
  name: string;
  description: string;
  status: CampaignStatus;
  provider: CampaignProvider;
  trunk_name: string;
  assistant_id: string;
  max_concurrent: number;
  calls_per_second: number;
  daily_start_time: string; // "HH:MM"
  daily_end_time: string; // "HH:MM"
  timezone: string;
  total_contacts: number;
  successful_calls: number;
  failed_calls: number;
  max_retries: number;
  unsuccessful_numbers: string[] | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateCampaignRequest {
  user_uid: string;
  name: string;
  description?: string;
  provider: CampaignProvider;
  trunk_name: string;
  assistant_id: string;
  max_concurrent?: number; // default: 5
  calls_per_second?: number; // default: 1
  daily_start_time?: string; // default: "10:00"
  daily_end_time?: string; // default: "17:00"
  timezone?: string; // default: "Asia/Kolkata"
  max_retries?: number; // default: 3
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  trunk_name?: string;
  assistant_id?: string;
  max_concurrent?: number;
  calls_per_second?: number;
  daily_start_time?: string;
  daily_end_time?: string;
  timezone?: string;
  max_retries?: number;
}

// ============================================
// Campaign Control Responses
// ============================================

export interface CampaignControlResponse {
  id: string;
  status: CampaignStatus;
  message?: string;
}

export interface CSVUploadResponse {
  message: string;
  total_rows: number;
  campaign_id: string;
}

// ============================================
// Monitoring Types
// ============================================

export interface QueueStatus {
  user_uid: string;
  active_campaigns: number;
  pending_contacts: number;
  in_progress_calls: number;
  queue_depth: number;
  time_window_active: boolean;
  credits_available: boolean;
}

export interface CampaignMonitoringStats {
  campaign_id: string;
  name: string;
  status: CampaignStatus;
  total_contacts: number;
  successful_calls: number;
  failed_calls: number;
  pending_contacts: number;
  in_progress_contacts: number;
  completed_contacts: number;
  failed_contacts: number;
  success_rate: number;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreditStatus {
  user_uid: string;
  available_credits: number;
  total_credits: number;
  campaign_paused: boolean;
  last_updated: string;
}

export interface SystemConfig {
  GLOBAL_MAX_CONCURRENT_CALLS: number;
  GLOBAL_CALLS_PER_SECOND: number;
  DEFAULT_USER_MAX_CONCURRENT: number;
  DEFAULT_USER_CALLS_PER_SECOND: number;
  RATE_LIMIT_WINDOW_SECONDS: number;
  DEFAULT_DAILY_START_TIME: string;
  DEFAULT_DAILY_END_TIME: string;
  DEFAULT_TIMEZONE: string;
  DEFAULT_MAX_RETRIES: number;
  LOW_CREDIT_THRESHOLD: number;
}

// ============================================
// Analytics Types
// ============================================

export interface CampaignAnalytics {
  campaign_id: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
}

export interface VerdictDistribution {
  interested: number;
  not_interested: number;
  call_disconnected: number;
  likely_to_book: number;
}

export interface CallQualityDistribution {
  completed: number;
  abrupt_end: number;
  no_response: number;
  voicemail: number;
}

export interface UserAnalyticsStats {
  user_uid: string;
  statistics: {
    total_calls: number;
    verdict_distribution: VerdictDistribution;
    average_confidence_score: number;
    call_quality_distribution: CallQualityDistribution;
    period_start: string;
    period_end: string;
  };
}

export interface CampaignAnalyticsDetail {
  campaign_id: string;
  user_uid: string;
  statistics: {
    total_calls: number;
    verdict_distribution: VerdictDistribution;
    average_confidence_score: number;
    call_quality_distribution: CallQualityDistribution;
  };
  calls: CampaignCallRecord[];
}

export interface CampaignCallRecord {
  call_id: string;
  phone_number: string;
  verdict: AnalyticsVerdict;
  confidence_score: number;
  call_quality: CallQuality;
  summary: string;
  key_discoveries: string[];
  transcript_url?: string;
  created_at: string;
}

// ============================================
// Campaign Contact Telemetry
// ============================================

export type CampaignContactStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface CampaignCallAttempt {
  timestamp: string;
  status: string;
  duration: number | null;
  provider_response: {
    status?: string;
    call_id?: string;
    participant_id?: string;
    room_name?: string;
    dispatch_id?: string;
    message?: string;
    [key: string]: unknown;
  } | null;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  user_uid: string;
  phone_number: string;
  status: CampaignContactStatus;
  call_attempts: CampaignCallAttempt[];
  metadata: Record<string, unknown>;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CSV Preview Cache (localStorage)
// ============================================

export interface CSVContact {
  phone_number: string;
  [key: string]: string; // Other fields from CSV
}

export interface CSVPreviewCache {
  campaignId: string;
  uploadedAt: string;
  fileName: string;
  totalContacts: number;
  duplicatesFound: number;
  duplicateNumbers: string[];
  fieldNames: string[];
  preview: CSVContact[]; // First 50 contacts
  phoneColumnName: string;
}

// ============================================
// API Config
// ============================================

export const CAMPAIGN_API_CONFIG = {
  BASE_URL: typeof window !== 'undefined'
    ? '/api/campaigns'
    : (process.env.CAMPAIGN_SERVICE_BASE_URL || 'https://service.monade.ai/campaigns/api/v1'),
  DB_SERVICES_URL: typeof window !== 'undefined'
    ? '/api/proxy/api'
    : `${process.env.MONADE_API_BASE_URL || 'https://service.monade.ai/db_services'}/api`,
  POLL_INTERVALS: {
    QUEUE_STATUS: 5000, // 5 seconds during active campaign
    CREDIT_STATUS: 30000, // 30 seconds
    CAMPAIGN_LIST: 10000, // 10 seconds on dashboard
  },
  DEFAULTS: {
    MAX_CONCURRENT: 5,
    CALLS_PER_SECOND: 1,
    DAILY_START_TIME: '10:00',
    DAILY_END_TIME: '17:00',
    TIMEZONE: 'Asia/Kolkata',
    MAX_RETRIES: 3,
  },
  LIMITS: {
    MAX_CONCURRENT: 10,
    CALLS_PER_SECOND: 2,
    MAX_RETRIES: 5,
    CSV_PREVIEW_CONTACTS: 50,
  },
} as const;

// localStorage key helpers
export const getCampaignPreviewKey = (campaignId: string) =>
  `campaign_csv_preview_${campaignId}`;

export const getCampaignHistoryKey = (userUid: string) =>
  `monade_campaign_history_${userUid}`;

// ============================================
// Status Helpers
// ============================================

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  pending: 'gray',
  active: 'green',
  paused: 'yellow',
  stopped: 'red',
  completed: 'blue',
};

export function isCampaignActive(status: CampaignStatus): boolean {
  return status === 'active';
}

export function isCampaignFinished(status: CampaignStatus): boolean {
  return status === 'completed' || status === 'stopped';
}

export function canStartCampaign(status: CampaignStatus): boolean {
  return status === 'pending';
}

export function canPauseCampaign(status: CampaignStatus): boolean {
  return status === 'active';
}

export function canStopCampaign(status: CampaignStatus): boolean {
  return status === 'active' || status === 'paused';
}

export interface CampaignProgressState {
  percent: number;
  processed: number;
  total: number;
  pending: number;
  inProgress: number;
  statusLabel: string;
}

/**
 * Progress snapshot for campaign UIs.
 * Keeps lifecycle state and completion % aligned even when backend counters lag.
 */
export function getCampaignProgress(
  campaign: Pick<Campaign, 'status' | 'total_contacts' | 'successful_calls' | 'failed_calls'>,
  stats?: Partial<Pick<CampaignMonitoringStats, 'pending_contacts' | 'in_progress_contacts' | 'completed_contacts' | 'failed_contacts'>>,
): CampaignProgressState {
  const total = Math.max(0, campaign.total_contacts || 0);
  const completed = Math.max(0, stats?.completed_contacts ?? campaign.successful_calls ?? 0);
  const failed = Math.max(0, stats?.failed_contacts ?? campaign.failed_calls ?? 0);
  const rawProcessed = completed + failed;
  const processed = total > 0 ? Math.min(total, rawProcessed) : rawProcessed;
  const pending = Math.max(0, stats?.pending_contacts ?? (total > 0 ? Math.max(total - processed, 0) : 0));
  const inProgress = Math.max(0, stats?.in_progress_contacts ?? 0);

  let percent = 0;
  if (campaign.status === 'completed') {
    percent = 100;
  } else if (campaign.status === 'pending') {
    percent = 0;
  } else if (total > 0) {
    percent = Math.round((processed / total) * 100);
    // Avoid showing "fully done" while still marked active.
    if (campaign.status === 'active' && percent >= 100) {
      percent = 99;
    }
  }

  const statusLabel: Record<CampaignStatus, string> = {
    pending: 'Ready',
    active: inProgress > 0 ? 'Dialing' : (pending > 0 ? 'Queued' : 'Running'),
    paused: 'Paused',
    stopped: 'Stopped',
    completed: 'Completed',
  };

  return {
    percent,
    processed,
    total,
    pending,
    inProgress,
    statusLabel: statusLabel[campaign.status],
  };
}
