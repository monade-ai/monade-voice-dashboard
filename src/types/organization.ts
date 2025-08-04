/**
 * Core organization-related type definitions
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  industry?: string;
  contact_email?: string;
  billing_email?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  status: 'active' | 'invited' | 'suspended';
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
  organization?: Organization;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  current_organization_id?: string;
  account_type: 'personal' | 'organization';
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InvitationToken {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
  organization?: Organization;
  inviter?: UserProfile;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';

export type AccountType = 'personal' | 'organization';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export type MemberStatus = 'active' | 'invited' | 'suspended';


// Organization creation and update types
export interface CreateOrganizationData {
  name: string;
  slug?: string;
  industry?: string;
  contact_email?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  logo_url?: string;
  industry?: string;
  contact_email?: string;
  billing_email?: string;
}

// User invitation types
export interface InviteUserData {
  email: string;
  role: Exclude<OrganizationRole, 'owner'>; // Can't invite as owner
}

export interface AcceptInvitationData {
  token: string;
  user_data?: {
    full_name?: string;
  };
}

// Organization switching
export interface OrganizationSwitchData {
  organization_id: string;
}

// Organization analytics types
export interface OrganizationUsage {
  calls_made: number;
  assistants_created: number;
  contacts_added: number;
  knowledge_bases_created: number;
  storage_used_mb: number;
  current_period_start: string;
  current_period_end: string;
}

export interface OrganizationBilling {
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  usage: OrganizationUsage;
  next_billing_date?: string;
  payment_method?: {
    type: string;
    last_four: string;
    expires: string;
  };
}

// Permission types (will be expanded in permissions.ts)
export type Permission = string;
