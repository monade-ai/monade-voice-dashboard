// Campaign types based on Exotel Campaigns API specification

export interface CampaignRetries {
  number_of_retries: number;
  interval_mins: number;
  mechanism: 'Linear' | 'Exponential';
  on_status: ('busy' | 'failed' | 'no-answer')[];
}

export interface CampaignSchedule {
  send_at?: string; // RFC3339 format
  end_at?: string; // RFC3339 format
}

export interface CampaignStats {
  created: number;
  'in-progress': number;
  retry: number;
  retrying: number;
  failed: number;
  'failed-dnd': number;
  invalid: number;
  paused: number;
  'failed-no-attempt': number;
  completed: number;
  pending: number;
}

export interface CampaignSummary {
  campaign_sid: string;
  call_scheduled: number;
  call_initialized: number;
  call_completed: number;
  call_failed: number;
  call_inprogress: number;
  DateCreated: string;
}

export interface Campaign {
  id: string;
  account_sid: string;
  name: string;
  type: 'trans'; // Always transactional as per Exotel regulations
  caller_id: string;
  campaign_type: 'static' | 'dynamic';
  from?: string[]; // Numbers to call (E.164 or STD+number, max 5,000)
  lists?: string[]; // List IDs if using saved lists (max 5 for static, 1 for dynamic)
  flow_type: 'ivr' | 'greeting';
  repeat_menu_attempts?: number; // Only for IVR, default 0
  read_via_text?: string; // IVR/greeting content (supports @@varname for dynamic content)
  url?: string; // Pre-built call flow/applet URL - format: http://my.exotel.com/{sid}/exoml/start_voice/{app_id}
  retries?: CampaignRetries;
  schedule?: CampaignSchedule;
  status_callback?: string; // Webhook URL for campaign status changes
  call_status_callback?: string; // Webhook URL for individual call status
  call_schedule_callback?: string; // Webhook URL when all calls to a number are completed
  call_status_callback_params?: any; // Additional params for callbacks
  mode: 'auto' | 'custom'; // auto = automatic throttling, custom = manual throttle setting
  throttle?: number; // calls/sec if mode=custom (1 to account_throttle-1)
  custom_field?: any; // Application-specific data (json string or object)
  call_duplicate_numbers: boolean; // If true, calls duplicate numbers in lists
  date_created: string; // RFC3339 format
  date_updated: string; // RFC3339 format
  date_started?: string; // RFC3339 format - when campaign actually started
  status: 'Created' | 'InProgress' | 'Completed' | 'Failed' | 'Canceled' | 'Deleted' | 'Paused' | 'Archived';
  stats: CampaignStats;
  summary?: CampaignSummary;
  uri?: string; // API URI for this campaign
}

export interface CreateCampaignRequest {
  caller_id: string;
  from?: string[]; // Either from or lists required
  lists?: string[];
  campaign_type?: 'static' | 'dynamic';
  flow_type?: 'ivr' | 'greeting';
  repeat_menu_attempts?: number;
  url?: string;
  read_via_text?: string;
  name?: string;
  type?: 'trans';
  call_duplicate_numbers?: boolean;
  retries?: CampaignRetries;
  schedule?: CampaignSchedule;
  call_status_callback?: string;
  call_schedule_callback?: string;
  status_callback?: string;
  mode?: 'auto' | 'custom';
  throttle?: number;
  custom_field?: any;
}

export interface UpdateCampaignRequest {
  campaigns: {
    action: 'pause' | 'resume' | 'complete' | 'archive';
  }[];
}

export interface ExotelCampaignCreateRequest {
  campaigns: CreateCampaignRequest[];
}

export interface CampaignResponse {
  request_id: string;
  http_code: number;
  response: {
    code: number;
    status: string;
    data?: Campaign;
    error_data?: {
      code: number;
      description: string;
      message: string;
    };
  }[];
}

export interface CampaignListRequest {
  offset?: number;
  limit?: number;
  status?: Campaign['status'];
  sort_by?: string;
  name?: string;
  type?: string;
}

export interface CampaignCallDetail {
  number: string;
  name?: string;
  duration: string;
  status: string;
  digits?: string;
  recording_url?: string;
  start_time: string;
  end_time: string;
  caller_id: string;
  direction: string;
  call_sid: string;
}

export interface CampaignCallDetailsRequest {
  offset?: number;
  limit?: number;
  status?: string;
  sort_by?: string;
}

// Exotel configuration using environment variables
export const EXOTEL_ACCOUNT_CONFIG = {
  ACCOUNT_SID: process.env.EXOTEL_ACCOUNT_SID || 'monade1',
  REGION: 'Singapore',
  BASE_URL: process.env.EXOTEL_BASE_URL || 'api.exotel.com',
  API_USERNAME: process.env.EXOTEL_API_KEY || '',
  API_PASSWORD: process.env.EXOTEL_FUNCTIONS_KEY || '',
} as const;