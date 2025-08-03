/**
 * Permission-based component rendering helpers
 */

import React from 'react';
import { useAuth } from './AuthProvider';
import { Permission, PERMISSION_GROUPS, PermissionGroup } from '@/types';

interface PermissionGuardProps {
  permission?: Permission;
  permissions?: Permission[];
  permissionGroup?: PermissionGroup;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({
  permission,
  permissions,
  permissionGroup,
  requireAll = false,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else if (permissionGroup) {
    const groupPermissions = PERMISSION_GROUPS[permissionGroup];
    hasAccess = requireAll
      ? hasAllPermissions(groupPermissions)
      : hasAnyPermission(groupPermissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface RoleGuardProps {
  roles: ('owner' | 'admin' | 'member')[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 */
export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const { userRole } = useAuth();

  const hasAccess = userRole && roles.includes(userRole);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface OrganizationGuardProps {
  requireOrganization?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on organization context
 */
export function OrganizationGuard({ 
  requireOrganization = true, 
  fallback = null, 
  children 
}: OrganizationGuardProps) {
  const { currentOrganization } = useAuth();

  const hasAccess = requireOrganization ? !!currentOrganization : true;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ComponentType<P>
) {
  return function PermissionWrappedComponent(props: P) {
    const { hasPermission } = useAuth();

    if (hasPermission(permission)) {
      return <Component {...props} />;
    }

    if (fallback) {
      const FallbackComponent = fallback;
      return <FallbackComponent {...props} />;
    }

    return null;
  };
}

// Higher-order component for role-based rendering
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: ('owner' | 'admin' | 'member')[],
  fallback?: React.ComponentType<P>
) {
  return function RoleWrappedComponent(props: P) {
    const { userRole } = useAuth();

    if (userRole && roles.includes(userRole)) {
      return <Component {...props} />;
    }

    if (fallback) {
      const FallbackComponent = fallback;
      return <FallbackComponent {...props} />;
    }

    return null;
  };
}

// Utility components for common permission checks
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGuard roles={['owner', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function OwnerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGuard roles={['owner']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function BillingAccess({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permission="org.billing" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function AnalyticsAccess({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permissionGroup="ANALYTICS_ACCESS" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function ContentManager({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permissionGroup="CONTENT_MANAGER" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}