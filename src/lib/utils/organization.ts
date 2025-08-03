/**
 * Organization utility functions and helpers
 */

import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  Permission,
  ROLE_PERMISSIONS,
  SubscriptionLimits,
  SUBSCRIPTION_LIMITS
} from '@/types';

/**
 * Check if user has specific role in organization
 */
export function hasRole(
  membership: OrganizationMember | null,
  role: OrganizationRole
): boolean {
  if (!membership || membership.status !== 'active') {
    return false;
  }
  
  return membership.role === role;
}

/**
 * Check if user has minimum role level (owner > admin > member)
 */
export function hasMinimumRole(
  membership: OrganizationMember | null,
  minimumRole: OrganizationRole
): boolean {
  if (!membership || membership.status !== 'active') {
    return false;
  }

  const roleHierarchy: Record<OrganizationRole, number> = {
    member: 1,
    admin: 2,
    owner: 3
  };

  return roleHierarchy[membership.role] >= roleHierarchy[minimumRole];
}

/**
 * Get user's permissions based on their role in organization
 */
export function getUserPermissions(
  membership: OrganizationMember | null
): Permission[] {
  if (!membership || membership.status !== 'active') {
    return [];
  }

  return ROLE_PERMISSIONS[membership.role] || [];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  membership: OrganizationMember | null,
  permission: Permission
): boolean {
  const permissions = getUserPermissions(membership);
  return permissions.includes(permission);
}

/**
 * Check if user can edit another user's role
 */
export function canEditUserRole(
  currentUserRole: OrganizationRole,
  targetUserRole: OrganizationRole,
  newRole: OrganizationRole
): boolean {
  // Only owners can manage owner roles
  if (targetUserRole === 'owner' || newRole === 'owner') {
    return currentUserRole === 'owner';
  }

  // Admins can manage member roles
  if (currentUserRole === 'admin') {
    return targetUserRole === 'member' && newRole !== 'owner';
  }

  return false;
}

/**
 * Check if user can remove another user
 */
export function canRemoveUser(
  currentUserRole: OrganizationRole,
  targetUserRole: OrganizationRole
): boolean {
  // Owners can remove anyone except other owners (unless they're the last owner)
  if (currentUserRole === 'owner') {
    return true; // Additional check for last owner should be done at service level
  }

  // Admins can only remove members
  if (currentUserRole === 'admin') {
    return targetUserRole === 'member';
  }

  return false;
}

/**
 * Get organization subscription limits
 */
export function getOrganizationLimits(organization: Organization): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[organization.subscription_tier] || SUBSCRIPTION_LIMITS.free;
}

/**
 * Check if organization is within usage limits
 */
export function checkOrganizationUsage(
  organization: Organization,
  usage: {
    assistants?: number;
    contacts?: number;
    knowledgeBases?: number;
    storageMB?: number;
    callsThisMonth?: number;
  }
): {
  assistants: { withinLimit: boolean; used: number; limit: number };
  contacts: { withinLimit: boolean; used: number; limit: number };
  knowledgeBases: { withinLimit: boolean; used: number; limit: number };
  storage: { withinLimit: boolean; used: number; limit: number };
  calls: { withinLimit: boolean; used: number; limit: number };
} {
  const limits = getOrganizationLimits(organization);

  const checkLimit = (used: number, limit: number) => ({
    withinLimit: limit === -1 || used < limit,
    used,
    limit
  });

  return {
    assistants: checkLimit(usage.assistants || 0, limits.maxAssistants),
    contacts: checkLimit(usage.contacts || 0, limits.maxContacts),
    knowledgeBases: checkLimit(usage.knowledgeBases || 0, limits.maxKnowledgeBases),
    storage: checkLimit(usage.storageMB || 0, limits.maxStorageMB),
    calls: checkLimit(usage.callsThisMonth || 0, limits.maxCallsPerMonth)
  };
}

/**
 * Format organization member display name
 */
export function formatMemberDisplayName(member: OrganizationMember): string {
  if (member.user_profile?.full_name) {
    return member.user_profile.full_name;
  }
  
  // Extract name from email if no full name
  const emailName = member.user_profile?.email?.split('@')[0];
  return emailName || 'Unknown User';
}

/**
 * Get role display name with proper capitalization
 */
export function formatRoleDisplayName(role: OrganizationRole): string {
  const roleNames: Record<OrganizationRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member'
  };
  
  return roleNames[role] || role;
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: OrganizationRole): string {
  const colors: Record<OrganizationRole, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    member: 'bg-gray-100 text-gray-800'
  };
  
  return colors[role] || colors.member;
}

/**
 * Check if organization slug is valid format
 */
export function isValidSlug(slug: string): boolean {
  const slugPattern = /^[a-z0-9-]+$/;
  return slugPattern.test(slug) && 
         slug.length >= 3 && 
         slug.length <= 50 &&
         !slug.startsWith('-') && 
         !slug.endsWith('-');
}

/**
 * Generate organization slug from name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Check if organization is active and in good standing
 */
export function isOrganizationActive(organization: Organization): boolean {
  return organization.subscription_status === 'active' || 
         organization.subscription_status === 'trialing';
}

/**
 * Get organization status display info
 */
export function getOrganizationStatusInfo(organization: Organization): {
  status: string;
  color: string;
  message?: string;
} {
  switch (organization.subscription_status) {
    case 'active':
      return {
        status: 'Active',
        color: 'text-green-600'
      };
    case 'trialing':
      return {
        status: 'Trial',
        color: 'text-blue-600',
        message: 'Trial period active'
      };
    case 'past_due':
      return {
        status: 'Past Due',
        color: 'text-yellow-600',
        message: 'Payment required'
      };
    case 'cancelled':
      return {
        status: 'Cancelled',
        color: 'text-red-600',
        message: 'Subscription cancelled'
      };
    default:
      return {
        status: 'Unknown',
        color: 'text-gray-600'
      };
  }
}

/**
 * Sort organization members by role hierarchy and name
 */
export function sortOrganizationMembers(members: OrganizationMember[]): OrganizationMember[] {
  const roleOrder: Record<OrganizationRole, number> = {
    owner: 0,
    admin: 1,
    member: 2
  };

  return [...members].sort((a, b) => {
    // First sort by role
    const roleComparison = roleOrder[a.role] - roleOrder[b.role];
    if (roleComparison !== 0) {
      return roleComparison;
    }

    // Then sort by name
    const nameA = formatMemberDisplayName(a).toLowerCase();
    const nameB = formatMemberDisplayName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Filter organization members by search query
 */
export function filterOrganizationMembers(
  members: OrganizationMember[],
  searchQuery: string
): OrganizationMember[] {
  if (!searchQuery.trim()) {
    return members;
  }

  const query = searchQuery.toLowerCase().trim();
  
  return members.filter(member => {
    const name = formatMemberDisplayName(member).toLowerCase();
    const email = member.user_profile?.email?.toLowerCase() || '';
    const role = member.role.toLowerCase();
    
    return name.includes(query) || 
           email.includes(query) || 
           role.includes(query);
  });
}

/**
 * Get organization member statistics
 */
export function getOrganizationMemberStats(members: OrganizationMember[]): {
  total: number;
  owners: number;
  admins: number;
  members: number;
  active: number;
  invited: number;
} {
  const stats = {
    total: members.length,
    owners: 0,
    admins: 0,
    members: 0,
    active: 0,
    invited: 0
  };

  members.forEach(member => {
    // Count by role
    switch (member.role) {
      case 'owner':
        stats.owners++;
        break;
      case 'admin':
        stats.admins++;
        break;
      case 'member':
        stats.members++;
        break;
    }

    // Count by status
    switch (member.status) {
      case 'active':
        stats.active++;
        break;
      case 'invited':
        stats.invited++;
        break;
    }
  });

  return stats;
}

/**
 * Check if user can perform billing operations
 */
export function canManageBilling(membership: OrganizationMember | null): boolean {
  return hasRole(membership, 'owner');
}

/**
 * Check if user can manage organization settings
 */
export function canManageOrganization(membership: OrganizationMember | null): boolean {
  return hasMinimumRole(membership, 'admin');
}

/**
 * Check if user can invite other users
 */
export function canInviteUsers(membership: OrganizationMember | null): boolean {
  return hasMinimumRole(membership, 'admin');
}

/**
 * Get available roles that current user can assign
 */
export function getAssignableRoles(currentUserRole: OrganizationRole): OrganizationRole[] {
  switch (currentUserRole) {
    case 'owner':
      return ['owner', 'admin', 'member'];
    case 'admin':
      return ['admin', 'member'];
    case 'member':
      return [];
    default:
      return [];
  }
}