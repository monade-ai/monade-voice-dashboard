/**
 * Permission system type definitions and role-based access control
 */

import { OrganizationRole } from './organization';

// Granular permission types
export type Permission = 
  // Organization management
  | 'org.view'
  | 'org.edit' 
  | 'org.delete'
  | 'org.billing'
  | 'org.settings'
  
  // User management
  | 'users.invite'
  | 'users.remove'
  | 'users.edit_roles'
  | 'users.view_list'
  
  // Assistant permissions
  | 'assistants.view'
  | 'assistants.create'
  | 'assistants.edit'
  | 'assistants.delete'
  | 'assistants.assign_workflow'
  
  // Contact permissions
  | 'contacts.view'
  | 'contacts.create'
  | 'contacts.edit'
  | 'contacts.delete'
  | 'contacts.bulk_upload'
  | 'contacts.export'
  | 'contacts.create_bucket'
  | 'contacts.delete_bucket'
  | 'contacts.add_contact'
  | 'contacts.delete_contact'
  
  // Knowledge base permissions
  | 'knowledge.view'
  | 'knowledge.create'
  | 'knowledge.edit'
  | 'knowledge.delete'
  | 'knowledge.upload'
  | 'knowledge.download'
  
  // Call and analytics permissions
  | 'calls.view'
  | 'calls.analytics'
  | 'calls.export'
  | 'calls.history'
  
  // Workflow permissions
  | 'workflows.view'
  | 'workflows.create'
  | 'workflows.edit'
  | 'workflows.delete'
  | 'workflows.assign'
  | 'workflows.run'
  
  // Dashboard permissions
  | 'dashboard.view'
  | 'dashboard.export'
  | 'dashboard.configure';

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  owner: [
    // Organization management - full access
    'org.view',
    'org.edit',
    'org.delete',
    'org.billing',
    'org.settings',
    
    // User management - full access
    'users.invite',
    'users.remove',
    'users.edit_roles',
    'users.view_list',
    
    // Assistant management - full access
    'assistants.view',
    'assistants.create',
    'assistants.edit',
    'assistants.delete',
    'assistants.assign_workflow',
    
    // Contact management - full access
    'contacts.view',
    'contacts.create',
    'contacts.edit',
    'contacts.delete',
    'contacts.bulk_upload',
    'contacts.export',
    'contacts.create_bucket',
    'contacts.delete_bucket',
    'contacts.add_contact',
    'contacts.delete_contact',
    
    // Knowledge base - full access
    'knowledge.view',
    'knowledge.create',
    'knowledge.edit',
    'knowledge.delete',
    'knowledge.upload',
    'knowledge.download',
    
    // Call analytics - full access
    'calls.view',
    'calls.analytics',
    'calls.export',
    'calls.history',
    
    // Workflow management - full access
    'workflows.view',
    'workflows.create',
    'workflows.edit',
    'workflows.delete',
    'workflows.assign',
    'workflows.run',
    
    // Dashboard - full access
    'dashboard.view',
    'dashboard.export',
    'dashboard.configure',
  ],
  
  admin: [
    // Organization management - view and edit only
    'org.view',
    'org.edit',
    'org.settings',
    
    // User management - full access except role editing
    'users.invite',
    'users.remove',
    'users.view_list',
    
    // Assistant management - full access
    'assistants.view',
    'assistants.create',
    'assistants.edit',
    'assistants.delete',
    'assistants.assign_workflow',
    
    // Contact management - full access
    'contacts.view',
    'contacts.create',
    'contacts.edit',
    'contacts.delete',
    'contacts.bulk_upload',
    'contacts.export',
    'contacts.create_bucket',
    'contacts.delete_bucket',
    'contacts.add_contact',
    'contacts.delete_contact',
    
    // Knowledge base - full access
    'knowledge.view',
    'knowledge.create',
    'knowledge.edit',
    'knowledge.delete',
    'knowledge.upload',
    'knowledge.download',
    
    // Call analytics - full access
    'calls.view',
    'calls.analytics',
    'calls.export',
    'calls.history',
    
    // Workflow management - full access
    'workflows.view',
    'workflows.create',
    'workflows.edit',
    'workflows.delete',
    'workflows.assign',
    'workflows.run',
    
    // Dashboard - view and export
    'dashboard.view',
    'dashboard.export',
  ],
  
  member: [
    // Organization management - view only
    'org.view',
    
    // User management - view only
    'users.view_list',
    
    // Assistant management - create, edit, and delete own
    'assistants.view',
    'assistants.create',
    'assistants.edit',
    'assistants.delete',
    
    // Contact management - create and edit
    'contacts.view',
    'contacts.create',
    'contacts.edit',
    'contacts.bulk_upload',
    'contacts.create_bucket',
    'contacts.add_contact',
    
    // Knowledge base - create and edit own
    'knowledge.view',
    'knowledge.create',
    'knowledge.edit',
    'knowledge.upload',
    'knowledge.download',
    
    // Call permissions - view only
    'calls.view',
    
    // Workflow management - create and edit own
    'workflows.view',
    'workflows.create',
    'workflows.edit',
    'workflows.run',
    
    // Dashboard - view only
    'dashboard.view',
  ],
};

// Permission checking utilities
export interface PermissionContext {
  userRole?: OrganizationRole;
  organizationId?: string;
  resourceOwnerId?: string;
  userId?: string;
}

export function hasPermission(
  permission: Permission, 
  context: PermissionContext,
): boolean {
  const { userRole } = context;
  
  if (!userRole) {
    return false;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userRole];

  return rolePermissions.includes(permission);
}

export function hasAnyPermission(
  permissions: Permission[], 
  context: PermissionContext,
): boolean {
  return permissions.some(permission => hasPermission(permission, context));
}

export function hasAllPermissions(
  permissions: Permission[], 
  context: PermissionContext,
): boolean {
  return permissions.every(permission => hasPermission(permission, context));
}

// Resource-specific permission checks
export function canEditResource(
  context: PermissionContext & { resourceOwnerId?: string },
): boolean {
  const { userRole, userId, resourceOwnerId } = context;
  
  // Owners and admins can edit any resource
  if (userRole === 'owner' || userRole === 'admin') {
    return true;
  }
  
  // Members can edit their own resources
  if (userRole === 'member' && userId === resourceOwnerId) {
    return true;
  }
  
  return false;
}

export function canDeleteResource(
  context: PermissionContext,
): boolean {
  const { userRole } = context;
  
  // Only owners and admins can delete resources
  return userRole === 'owner' || userRole === 'admin';
}

// Permission groups for UI components
export const PERMISSION_GROUPS = {
  ORGANIZATION_ADMIN: [
    'org.edit',
    'org.settings',
    'users.invite',
    'users.remove',
  ] as Permission[],
  
  BILLING_ACCESS: [
    'org.billing',
  ] as Permission[],
  
  ANALYTICS_ACCESS: [
    'calls.analytics',
    'calls.export',
    'dashboard.export',
  ] as Permission[],
  
  CONTENT_CREATOR: [
    'assistants.create',
    'contacts.create',
    'knowledge.create',
    'workflows.create',
  ] as Permission[],
  
  CONTENT_MANAGER: [
    'assistants.delete',
    'contacts.delete',
    'knowledge.delete',
    'workflows.delete',
  ] as Permission[],
} as const;

export type PermissionGroup = keyof typeof PERMISSION_GROUPS;
