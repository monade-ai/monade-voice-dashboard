/**
 * API response types and error handling interfaces
 */

import { Organization, OrganizationMember, UserProfile, InvitationToken } from './organization';

// Generic API response wrapper
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
  message?: string;
}

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path?: string;
}

// Specific error codes
export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_ORGANIZATION: 'INVALID_ORGANIZATION',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Organization errors
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  ORGANIZATION_SLUG_TAKEN: 'ORGANIZATION_SLUG_TAKEN',
  CANNOT_DELETE_LAST_OWNER: 'CANNOT_DELETE_LAST_OWNER',
  
  // User management errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_MEMBER: 'USER_ALREADY_MEMBER',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_INVALID: 'INVITATION_INVALID',
  EMAIL_MISMATCH: 'EMAIL_MISMATCH',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_INVITATIONS: 'TOO_MANY_INVITATIONS'
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Organization API types
export interface OrganizationListResponse extends ApiResponse<Organization[]> {}

export interface OrganizationResponse extends ApiResponse<Organization> {}

export interface OrganizationMembersResponse extends ApiResponse<PaginatedResponse<OrganizationMember>> {}

export interface InvitationResponse extends ApiResponse<InvitationToken> {}

export interface UserProfileResponse extends ApiResponse<UserProfile> {}

// Request types for organization operations
export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  industry?: string;
  contact_email?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  logo_url?: string;
  industry?: string;
  contact_email?: string;
  billing_email?: string;
}

export interface InviteUserRequest {
  email: string;
  role: 'admin' | 'member';
  message?: string;
}

export interface UpdateMemberRoleRequest {
  role: 'owner' | 'admin' | 'member';
}

export interface AcceptInvitationRequest {
  token: string;
  full_name?: string;
}

// Resource API types (for organization-scoped resources)
export interface ResourceListParams extends PaginationParams {
  organization_id?: string;
  search?: string;
  filter?: Record<string, any>;
}

export interface ResourceResponse<T> extends ApiResponse<T> {}

export interface ResourceListResponse<T> extends ApiResponse<PaginatedResponse<T>> {}

// Bulk operation types
export interface BulkOperationRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
}

export interface BulkOperationResponse<T> extends ApiResponse<{
  successful: T[];
  failed: Array<{
    item: T;
    error: ApiError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}> {}

// File upload types
export interface FileUploadRequest {
  file: File;
  organization_id: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse extends ApiResponse<{
  id: string;
  filename: string;
  url: string;
  size: number;
  mime_type: string;
  organization_id: string;
}> {}

// Analytics and reporting types
export interface AnalyticsParams {
  organization_id: string;
  start_date: string;
  end_date: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
}

export interface AnalyticsResponse extends ApiResponse<{
  metrics: Record<string, any>;
  time_series: Array<{
    timestamp: string;
    values: Record<string, number>;
  }>;
  summary: Record<string, number>;
}> {}

// Webhook types for real-time updates
export interface WebhookEvent {
  id: string;
  type: string;
  organization_id: string;
  data: Record<string, any>;
  timestamp: string;
}

// Type guards for API responses
export function isApiError(response: any): response is { error: ApiError } {
  return response && typeof response.error === 'object' && response.error.code;
}

export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

// Error handling utilities
export class ApiErrorHandler {
  static getErrorMessage(error: ApiError): string {
    switch (error.code) {
      case API_ERROR_CODES.INSUFFICIENT_PERMISSIONS:
        return 'You do not have permission to perform this action.';
      case API_ERROR_CODES.ORGANIZATION_NOT_FOUND:
        return 'Organization not found.';
      case API_ERROR_CODES.USER_ALREADY_MEMBER:
        return 'User is already a member of this organization.';
      case API_ERROR_CODES.INVITATION_EXPIRED:
        return 'This invitation has expired. Please request a new one.';
      case API_ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  static isRetryableError(error: ApiError): boolean {
    const retryableCodes = [
      API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      API_ERROR_CODES.DATABASE_ERROR,
      API_ERROR_CODES.RATE_LIMIT_EXCEEDED
    ];
    return retryableCodes.includes(error.code as ApiErrorCode);
  }
}