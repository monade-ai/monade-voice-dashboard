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
  autoEnhancedTranscript?: boolean;
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

export interface UpdateAutoEnhancedTranscriptRequest {
  enabled: boolean;
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
  callProvider?: string; // 'twilio' | 'vobiz' - which trunk to use for outbound calls
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
  // Inbound calling fields
  call_direction?: 'inbound' | 'outbound' | 'both' | null;
  inbound_trunk_id?: string | null;
  dispatch_rule_id?: string | null; // read-only, set by backend
  speakingAccent?: string | null;
}

export interface CreateAssistantRequest {
  name: string;
  phoneNumber: string;
  user_uid: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  callProvider?: string; // which trunk to use
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
  call_direction?: 'inbound' | 'outbound' | 'both' | null;
  inbound_trunk_id?: string | null;
  speakingAccent?: string | null;
}

export interface UpdateAssistantRequest {
  name?: string;
  phoneNumber?: string;
  description?: string;
  model?: string;
  provider?: string;
  voice?: string;
  callProvider?: string; // which trunk to use
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
  call_direction?: 'inbound' | 'outbound' | 'both' | null;
  inbound_trunk_id?: string | null;
  speakingAccent?: string | null;
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
  BASE_URL: process.env.NEXT_PUBLIC_MONADE_API_BASE_URL || 'https://service.monade.ai/db_services',
};
