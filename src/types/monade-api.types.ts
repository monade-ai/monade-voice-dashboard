/**
 * Monade Voice Config Server API Types
 * Based on Prisma schema and API collection
 */

// ============================================
// User Types
// ============================================

export interface MonadeUser {
  user_uid: string;
  email_id: string;
  name?: string;
  available_credits: number;
  total_credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email_id?: string;
  available_credits?: number;
}

// ============================================
// API Key Types
// ============================================

export interface MonadeApiKey {
  id: number;
  api_key: string;
  user_uid: string;
  created_at: string;
  is_active: boolean;
}

export interface ValidateApiKeyResponse {
  user_uid: string;
  email_id: string;
  name?: string;
  available_credits: number;
}

// ============================================
// Assistant Types
// ============================================

export interface MonadeAssistant {
  id: string;
  user_uid: string;
  name: string;
  phoneNumber: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags: string[];
  createdAt: string;
  knowledgeBase?: string | null;
  contact_bucket_id?: string | null;
  // Email and workflow fields
  emailSubject?: string;
  emailBody?: string;
  from?: string;
  attachments?: string[];
  personalisation?: boolean;
  flowJson?: Record<string, unknown> | null;
}

export interface CreateAssistantRequest {
  name: string;
  phoneNumber: string;
  user_uid: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags?: string[];
  knowledgeBase?: string | null;
  contact_bucket_id?: string | null;
  emailSubject?: string;
  emailBody?: string;
  from?: string;
  attachments?: string[];
  personalisation?: boolean;
  flowJson?: Record<string, unknown> | null;
}

export interface UpdateAssistantRequest {
  name?: string;
  phoneNumber?: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  costPerMin?: number;
  latencyMs?: number;
  tags?: string[];
  knowledgeBase?: string | null;
  contact_bucket_id?: string | null;
  emailSubject?: string;
  emailBody?: string;
  from?: string;
  attachments?: string[];
  personalisation?: boolean;
  flowJson?: Record<string, unknown> | null;
}

// ============================================
// Knowledge Base Types
// ============================================

export interface MonadeKnowledgeBase {
  id: string;
  user_uid: string;
  filename: string;
  url: string;
  createdAt: string;
  user?: MonadeUser;
}

export interface CreateKnowledgeBaseRequest {
  user_uid: string;
  filename: string;
  kb_text?: string;
  kb_file_base64?: string;
}

// ============================================
// Transcript Types
// ============================================

export interface MonadeTranscript {
  id: string;
  user_uid: string;
  transcript_url: string;
  phone_number: string;
  call_date: string;
  call_id: string;
  created_at: string;
}

export interface CreateTranscriptRequest {
  user_uid: string;
  transcript_url: string;
  phone_number: string;
  call_id: string;
}

// ============================================
// Credit Types
// ============================================

export interface CreditBalance {
  user_uid: string;
  available_credits: number;
  total_credits: number;
}

export interface CreditOperationRequest {
  amount: number;
}

// ============================================
// Health Check Types
// ============================================

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
}

export interface ReadyCheckResponse {
  status: 'ready' | 'not_ready';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

// ============================================
// API Response Wrapper
// ============================================

export interface MonadeApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// API Configuration
// ============================================

export const MONADE_API_CONFIG = {
  // Use proxy for client-side to avoid mixed content issues
  BASE_URL: typeof window !== 'undefined' ? '/api/proxy' : 'http://35.200.254.189/db_services',
  PROVIDER: 'vobiz.ai',
  DEFAULT_USER_UID: 'b08d1d4d-a47d-414b-9360-80264388793f',
  API_KEY: 'monade_d8325992-cf93-4cdd-9c54-34ca18d72441',
} as const;
