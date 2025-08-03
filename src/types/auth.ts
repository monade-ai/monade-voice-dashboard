/**
 * Authentication and authorization type definitions
 */

import { User } from '@supabase/supabase-js';
import { Organization, OrganizationMember, UserProfile, OrganizationRole } from './organization';
import { Permission } from './permissions';

// Extended authentication context
export interface AuthContextType {
  // Core auth state
  user: AuthUser | null;
  loading: boolean;
  
  // Organization context
  currentOrganization: Organization | null;
  organizations: Organization[];
  userRole: OrganizationRole | null;
  
  // Permissions
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // Actions
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

// Enhanced user type with organization context
export interface AuthUser extends UserProfile {
  // Supabase user data
  supabase_user: User;
  
  // Organization memberships
  organizations: OrganizationMember[];
  current_organization?: Organization;
  
  // Current context
  role?: OrganizationRole; // Role in current organization
  permissions: Permission[];
  
  // Account status
  is_verified: boolean;
  last_sign_in: string;
}

// JWT custom claims structure
export interface JWTClaims {
  sub: string; // user id
  email: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  
  // Custom claims for organization context
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  
  // Organization-specific claims
  organizations?: Array<{
    id: string;
    role: OrganizationRole;
    slug: string;
  }>;
  current_organization_id?: string;
  current_role?: OrganizationRole;
}

// Authentication flow types
export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
  account_type: 'personal' | 'organization';
  organization_name?: string; // Required if account_type is 'organization'
  organization_industry?: string;
}

export interface SignInData {
  email: string;
  password: string;
  account_type?: 'personal' | 'organization';
}

export interface OAuthSignInData {
  provider: 'google' | 'github' | 'microsoft';
  account_type?: 'personal' | 'organization';
  organization_name?: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  current_password: string;
  new_password: string;
}

// Session management
export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

export interface SessionContext {
  session: SessionData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Organization switching
export interface OrganizationSwitchContext {
  switching: boolean;
  error: string | null;
  switchOrganization: (organizationId: string) => Promise<void>;
}

// Invitation acceptance flow
export interface InvitationAcceptanceData {
  token: string;
  user_data?: {
    full_name?: string;
    password?: string; // If user doesn't exist yet
  };
}

// Account verification
export interface VerificationData {
  token: string;
  type: 'email' | 'phone';
}

// Multi-factor authentication (future)
export interface MFAData {
  enabled: boolean;
  methods: Array<{
    type: 'totp' | 'sms' | 'email';
    verified: boolean;
  }>;
}

// Auth state management
export interface AuthState {
  user: AuthUser | null;
  session: SessionData | null;
  loading: boolean;
  error: string | null;
  
  // Organization context
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchingOrganization: boolean;
  
  // Permissions cache
  permissions: Permission[];
  permissionsLoaded: boolean;
}

export interface AuthActions {
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signInWithOAuth: (data: OAuthSignInData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  updatePassword: (data: UpdatePasswordData) => Promise<void>;
  acceptInvitation: (data: InvitationAcceptanceData) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

// Auth hooks return types
export interface UseAuthReturn extends AuthContextType, AuthActions {}

export interface UsePermissionsReturn {
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  loading: boolean;
  error: string | null;
}

export interface UseOrganizationReturn {
  currentOrganization: Organization | null;
  organizations: Organization[];
  userRole: OrganizationRole | null;
  switchOrganization: (organizationId: string) => Promise<void>;
  switching: boolean;
  error: string | null;
}

// Auth error types
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  USER_NOT_FOUND: 'user_not_found',
  WEAK_PASSWORD: 'weak_password',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  INVALID_EMAIL: 'invalid_email',
  SIGNUP_DISABLED: 'signup_disabled',
  ORGANIZATION_REQUIRED: 'organization_required',
  INVITATION_REQUIRED: 'invitation_required',
  SESSION_EXPIRED: 'session_expired',
  ORGANIZATION_SWITCH_FAILED: 'organization_switch_failed'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

// Type guards
export function isAuthUser(user: any): user is AuthUser {
  return user && typeof user.id === 'string' && typeof user.email === 'string';
}

export function hasOrganizationContext(user: AuthUser): boolean {
  return user.current_organization !== undefined && user.role !== undefined;
}

export function isOrganizationOwner(user: AuthUser): boolean {
  return user.role === 'owner';
}

export function isOrganizationAdmin(user: AuthUser): boolean {
  return user.role === 'admin' || user.role === 'owner';
}