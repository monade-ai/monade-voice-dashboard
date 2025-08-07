/**
 * Utility types and helper functions for organization context
 */

import { 
  Organization, 
  OrganizationMember, 
  OrganizationRole, 
  Permission,
  AuthUser, 
} from '@/types';

// Utility type for making certain fields optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Utility type for making certain fields required
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Organization context utilities
export interface OrganizationContext {
  organization: Organization;
  userRole: OrganizationRole;
  permissions: Permission[];
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageBilling: boolean;
}

export function createOrganizationContext(
  organization: Organization,
  membership: OrganizationMember,
  permissions: Permission[],
): OrganizationContext {
  const userRole = membership.role;
  
  return {
    organization,
    userRole,
    permissions,
    canEdit: userRole === 'owner' || userRole === 'admin',
    canDelete: userRole === 'owner',
    canInvite: userRole === 'owner' || userRole === 'admin',
    canManageBilling: userRole === 'owner',
  };
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface FormActions<T> {
  setData: (data: Partial<T>) => void;
  setErrors: (errors: ValidationError[]) => void;
  clearErrors: () => void;
  reset: () => void;
  submit: () => Promise<void>;
}

// Loading states for async operations
export interface LoadingState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface AsyncState<T> extends LoadingState {
  data: T | null;
}

export function createAsyncState<T>(initialData: T | null = null): AsyncState<T> {
  return {
    data: initialData,
    loading: false,
    error: null,
    success: false,
  };
}

// Organization member utilities
export interface MemberWithPermissions extends OrganizationMember {
  permissions: Permission[];
  canEdit: boolean;
  canRemove: boolean;
  canChangeRole: boolean;
}

export function enhanceMemberWithPermissions(
  member: OrganizationMember,
  currentUserRole: OrganizationRole,
  permissions: Permission[],
): MemberWithPermissions {
  const canEdit = currentUserRole === 'owner' || 
    (currentUserRole === 'admin' && member.role !== 'owner');
  
  const canRemove = currentUserRole === 'owner' || 
    (currentUserRole === 'admin' && member.role === 'member');
  
  const canChangeRole = currentUserRole === 'owner';
  
  return {
    ...member,
    permissions,
    canEdit,
    canRemove,
    canChangeRole,
  };
}

// Resource ownership utilities
export interface ResourceOwnership {
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export function checkResourceOwnership(
  resourceOwnerId: string,
  currentUserId: string,
  userRole: OrganizationRole,
): ResourceOwnership {
  const isOwner = resourceOwnerId === currentUserId;
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  
  return {
    isOwner,
    canEdit: isOwner || isAdmin,
    canDelete: isAdmin,
    canShare: isOwner || isAdmin,
  };
}

// Subscription and billing utilities
export interface SubscriptionLimits {
  maxAssistants: number;
  maxContacts: number;
  maxKnowledgeBases: number;
  maxStorageMB: number;
  maxCallsPerMonth: number;
  hasAnalytics: boolean;
  hasPrioritySupport: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  free: {
    maxAssistants: 3,
    maxContacts: 100,
    maxKnowledgeBases: 2,
    maxStorageMB: 100,
    maxCallsPerMonth: 50,
    hasAnalytics: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxAssistants: 25,
    maxContacts: 5000,
    maxKnowledgeBases: 10,
    maxStorageMB: 1000,
    maxCallsPerMonth: 1000,
    hasAnalytics: true,
    hasPrioritySupport: false,
  },
  enterprise: {
    maxAssistants: -1, // unlimited
    maxContacts: -1,
    maxKnowledgeBases: -1,
    maxStorageMB: -1,
    maxCallsPerMonth: -1,
    hasAnalytics: true,
    hasPrioritySupport: true,
  },
};

export function getSubscriptionLimits(tier: string): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.free;
}

export function checkUsageLimit(
  currentUsage: number,
  limit: number,
): { withinLimit: boolean; percentage: number; remaining: number } {
  if (limit === -1) {
    return { withinLimit: true, percentage: 0, remaining: -1 };
  }
  
  const percentage = (currentUsage / limit) * 100;
  const remaining = Math.max(0, limit - currentUsage);
  const withinLimit = currentUsage < limit;
  
  return { withinLimit, percentage, remaining };
}

// Date and time utilities for organization context
export interface DateRange {
  start: Date;
  end: Date;
}

export function getOrganizationTimeZone(organization: Organization): string {
  // This would typically come from organization settings
  // For now, return browser timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDateForOrganization(
  date: Date,
  organization: Organization,
  format: 'short' | 'medium' | 'long' = 'medium',
): string {
  const timeZone = getOrganizationTimeZone(organization);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    ...(format === 'short' && {
      month: 'short',
      day: 'numeric',
    }),
    ...(format === 'medium' && {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    ...(format === 'long' && {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Search and filtering utilities
export interface SearchFilters {
  query?: string;
  role?: OrganizationRole;
  status?: string;
  dateRange?: DateRange;
  tags?: string[];
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export function buildSearchParams(
  filters: SearchFilters,
  sort?: SortOptions,
  pagination?: { page: number; limit: number },
): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters.query) params.set('q', filters.query);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateRange) {
    params.set('start_date', filters.dateRange.start.toISOString());
    params.set('end_date', filters.dateRange.end.toISOString());
  }
  if (filters.tags?.length) {
    params.set('tags', filters.tags.join(','));
  }
  
  if (sort) {
    params.set('sort_by', sort.field);
    params.set('sort_order', sort.direction);
  }
  
  if (pagination) {
    params.set('page', pagination.page.toString());
    params.set('limit', pagination.limit.toString());
  }
  
  return params;
}

// Type-safe event handlers
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export interface OrganizationEventHandlers {
  onOrganizationSwitch: EventHandler<{ organizationId: string }>;
  onMemberInvited: EventHandler<{ email: string; role: OrganizationRole }>;
  onMemberRemoved: EventHandler<{ memberId: string }>;
  onRoleChanged: EventHandler<{ memberId: string; newRole: OrganizationRole }>;
  onSettingsUpdated: EventHandler<{ changes: Partial<Organization> }>;
}

// Component prop utilities
export interface WithOrganizationContext {
  organizationContext: OrganizationContext;
}

export interface WithPermissions {
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
}

export interface WithLoading {
  loading?: boolean;
  error?: string | null;
}

// Higher-order type for components that require organization context
export type OrganizationAwareComponent<P = {}> = React.ComponentType<
  P & WithOrganizationContext & WithPermissions
>;