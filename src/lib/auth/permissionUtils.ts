/**
 * Permission validation utilities and helpers
 */

import { 
  Permission, 
  OrganizationRole, 
  OrganizationMember,
  ROLE_PERMISSIONS,
  hasPermission as checkPermission,
  PermissionContext,
} from '@/types';

/**
 * Get permissions for a given role
 */
export function getPermissionsForRole(role: OrganizationRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get user permissions from organization membership
 */
export function getUserPermissions(membership: OrganizationMember | null): Permission[] {
  if (!membership || membership.status !== 'active') {
    return [];
  }
  
  return getPermissionsForRole(membership.role);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: OrganizationRole, permission: Permission): boolean {
  const rolePermissions = getPermissionsForRole(role);

  return rolePermissions.includes(permission);
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(
  userRole: OrganizationRole | null,
  permission: Permission,
  context?: {
    resourceOwnerId?: string;
    userId?: string;
    organizationId?: string;
  },
): boolean {
  if (!userRole) return false;

  const permissionContext: PermissionContext = {
    userRole,
    organizationId: context?.organizationId,
    resourceOwnerId: context?.resourceOwnerId,
    userId: context?.userId,
  };

  return checkPermission(permission, permissionContext);
}

/**
 * Get missing permissions for a role to perform an action
 */
export function getMissingPermissions(
  userRole: OrganizationRole | null,
  requiredPermissions: Permission[],
): Permission[] {
  if (!userRole) return requiredPermissions;

  const userPermissions = getPermissionsForRole(userRole);

  return requiredPermissions.filter(permission => !userPermissions.includes(permission));
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(
  userRole: OrganizationRole | null,
  feature: 'billing' | 'analytics' | 'user_management' | 'org_settings',
): boolean {
  if (!userRole) return false;

  const featurePermissions: Record<string, Permission[]> = {
    billing: ['org.billing'],
    analytics: ['calls.analytics', 'dashboard.export'],
    user_management: ['users.invite', 'users.remove'],
    org_settings: ['org.edit', 'org.settings'],
  };

  const requiredPermissions = featurePermissions[feature] || [];
  const userPermissions = getPermissionsForRole(userRole);

  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

/**
 * Get user's effective permissions in organization context
 */
export function getEffectivePermissions(
  membership: OrganizationMember | null,
  organizationId?: string,
): {
  permissions: Permission[];
  role: OrganizationRole | null;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageBilling: boolean;
} {
  const permissions = getUserPermissions(membership);
  const role = membership?.role || null;

  return {
    permissions,
    role,
    canEdit: permissions.includes('org.edit'),
    canDelete: permissions.includes('org.delete'),
    canInvite: permissions.includes('users.invite'),
    canManageBilling: permissions.includes('org.billing'),
  };
}

/**
 * Permission hierarchy utilities
 */
export const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

/**
 * Check if role A has higher or equal hierarchy than role B
 */
export function hasHigherOrEqualRole(roleA: OrganizationRole, roleB: OrganizationRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: OrganizationRole[]): OrganizationRole | null {
  if (roles.length === 0) return null;

  return roles.reduce((highest, current) => 
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest,
  );
}

/**
 * Permission validation for API endpoints
 */
export interface PermissionValidationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
}

export function validateApiPermission(
  userRole: OrganizationRole | null,
  requiredPermission: Permission,
  context?: PermissionContext,
): PermissionValidationResult {
  if (!userRole) {
    return {
      allowed: false,
      reason: 'User not authenticated',
      requiredPermissions: [requiredPermission],
    };
  }

  const hasPermission = checkPermission(requiredPermission, { 
    userRole, 
    ...context, 
  });

  if (!hasPermission) {
    return {
      allowed: false,
      reason: 'Insufficient permissions',
      requiredPermissions: [requiredPermission],
    };
  }

  return { allowed: true };
}

/**
 * Batch permission validation
 */
export function validateMultiplePermissions(
  userRole: OrganizationRole | null,
  requiredPermissions: Permission[],
  requireAll: boolean = false,
  context?: PermissionContext,
): PermissionValidationResult {
  if (!userRole) {
    return {
      allowed: false,
      reason: 'User not authenticated',
      requiredPermissions,
    };
  }

  const userPermissions = getPermissionsForRole(userRole);
  const hasPermissions = requiredPermissions.filter(permission => 
    userPermissions.includes(permission),
  );

  const allowed = requireAll 
    ? hasPermissions.length === requiredPermissions.length
    : hasPermissions.length > 0;

  if (!allowed) {
    const missing = requiredPermissions.filter(permission => 
      !userPermissions.includes(permission),
    );

    return {
      allowed: false,
      reason: requireAll 
        ? 'Missing required permissions' 
        : 'No matching permissions found',
      requiredPermissions: missing,
    };
  }

  return { allowed: true };
}

/**
 * Resource-specific permission checks
 */
export function canEditResource(
  userRole: OrganizationRole | null,
  resourceOwnerId: string,
  userId: string,
): boolean {
  if (!userRole) return false;

  // Owners and admins can edit any resource
  if (userRole === 'owner' || userRole === 'admin') {
    return true;
  }

  // Members can only edit their own resources
  return userRole === 'member' && resourceOwnerId === userId;
}

export function canDeleteResource(
  userRole: OrganizationRole | null,
  resourceOwnerId?: string,
  userId?: string,
): boolean {
  if (!userRole) return false;

  // Only owners and admins can delete resources
  return userRole === 'owner' || userRole === 'admin';
}

export function canShareResource(
  userRole: OrganizationRole | null,
  resourceOwnerId: string,
  userId: string,
): boolean {
  if (!userRole) return false;

  // Owners and admins can share any resource
  if (userRole === 'owner' || userRole === 'admin') {
    return true;
  }

  // Members can share their own resources
  return userRole === 'member' && resourceOwnerId === userId;
}

/**
 * Organization-specific permission utilities
 */
export function canManageOrganization(userRole: OrganizationRole | null): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

export function canManageBilling(userRole: OrganizationRole | null): boolean {
  return userRole === 'owner';
}

export function canInviteUsers(userRole: OrganizationRole | null): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

export function canRemoveUsers(userRole: OrganizationRole | null): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

export function canViewAnalytics(userRole: OrganizationRole | null): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

/**
 * Permission error messages
 */
export const PERMISSION_ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'You must be logged in to perform this action',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  OWNER_ONLY: 'Only organization owners can perform this action',
  ADMIN_ONLY: 'Only organization owners and admins can perform this action',
  RESOURCE_OWNER_ONLY: 'You can only modify resources you own',
  ORGANIZATION_REQUIRED: 'You must be part of an organization to perform this action',
} as const;

export function getPermissionErrorMessage(
  validation: PermissionValidationResult,
): string {
  if (validation.allowed) return '';

  switch (validation.reason) {
  case 'User not authenticated':
    return PERMISSION_ERROR_MESSAGES.NOT_AUTHENTICATED;
  case 'Insufficient permissions':
    return PERMISSION_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
  default:
    return validation.reason || PERMISSION_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
  }
}