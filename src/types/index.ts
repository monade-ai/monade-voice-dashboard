/**
 * Central export file for all type definitions
 */

// Organization types
export type {
  Organization,
  OrganizationMember,
  UserProfile,
  InvitationToken,
  OrganizationRole,
  AccountType,
  SubscriptionTier,
  SubscriptionStatus,
  MemberStatus,
  AuthUser,
  CreateOrganizationData,
  UpdateOrganizationData,
  InviteUserData,
  AcceptInvitationData,
  OrganizationSwitchData,
  OrganizationUsage,
  OrganizationBilling,
} from './organization';

// Permission types
export type {
  Permission,
  PermissionContext,
  PermissionGroup,
} from './permissions';

export {
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canEditResource,
  canDeleteResource,
} from './permissions';

// API types
export type {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  PaginationParams,
  PaginatedResponse,
  OrganizationListResponse,
  OrganizationResponse,
  OrganizationMembersResponse,
  InvitationResponse,
  UserProfileResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteUserRequest,
  UpdateMemberRoleRequest,
  AcceptInvitationRequest,
  ResourceListParams,
  ResourceResponse,
  ResourceListResponse,
  BulkOperationRequest,
  BulkOperationResponse,
  FileUploadRequest,
  FileUploadResponse,
  AnalyticsParams,
  AnalyticsResponse,
  WebhookEvent,
} from './api';

export {
  API_ERROR_CODES,
  ApiErrorHandler,
  isApiError,
  isSuccessResponse,
} from './api';

// Auth types
export type {
  AuthContextType,
  AuthUser as AuthUserType,
  JWTClaims,
  SignUpData,
  SignInData,
  OAuthSignInData,
  ResetPasswordData,
  UpdatePasswordData,
  SessionData,
  SessionContext,
  OrganizationSwitchContext,
  InvitationAcceptanceData,
  VerificationData,
  MFAData,
  AuthState,
  AuthActions,
  UseAuthReturn,
  UsePermissionsReturn,
  UseOrganizationReturn,
  AuthError,
  AuthErrorCode,
} from './auth';

export {
  AUTH_ERROR_CODES,
  isAuthUser,
  hasOrganizationContext,
  isOrganizationOwner,
  isOrganizationAdmin,
} from './auth';

// Utility types
export type {
  PartialBy,
  RequiredBy,
  OrganizationContext,
  ValidationError,
  FormState,
  FormActions,
  LoadingState,
  AsyncState,
  MemberWithPermissions,
  ResourceOwnership,
  SubscriptionLimits,
  DateRange,
  SearchFilters,
  SortOptions,
  EventHandler,
  OrganizationEventHandlers,
  WithOrganizationContext,
  WithPermissions,
  WithLoading,
  OrganizationAwareComponent,
} from '../lib/types/utils';

export {
  createOrganizationContext,
  createAsyncState,
  enhanceMemberWithPermissions,
  checkResourceOwnership,
  SUBSCRIPTION_LIMITS,
  getSubscriptionLimits,
  checkUsageLimit,
  getOrganizationTimeZone,
  formatDateForOrganization,
  buildSearchParams,
} from '../lib/types/utils';

// Validation utilities
export type {
  ValidationResult,
} from '../lib/types/validation';

export {
  validateOrganizationName,
  validateOrganizationSlug,
  validateEmail,
  validateCreateOrganizationData,
  validateUpdateOrganizationData,
  validateInviteUserData,
  validateRoleChange,
  validatePassword,
  validateFullName,
  validateUrl,
  validateBatch,
  sanitizeOrganizationName,
  sanitizeSlug,
  sanitizeEmail,
  formatValidationErrors,
  getFirstError,
  VALIDATION_PATTERNS,
  VALIDATION_ERROR_CODES,
} from '../lib/types/validation';

// Re-export commonly used types with shorter names
export type { Permission as Perm } from './permissions';
export type { ApiResponse as Response } from './api';