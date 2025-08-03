import { useAuth } from './AuthProvider';
import { Permission } from '@/types';

/**
 * Hook to check if the current user has permission for a given action.
 * Usage: const canCreate = useHasPermission('contacts.create');
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Hook to check if the current user has any of the given permissions.
 * Usage: const canManage = useHasAnyPermission(['contacts.create', 'contacts.edit']);
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useAuth();
  return hasAnyPermission(permissions);
}

/**
 * Hook to check if the current user has all of the given permissions.
 * Usage: const canFullyManage = useHasAllPermissions(['contacts.create', 'contacts.edit', 'contacts.delete']);
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = useAuth();
  return hasAllPermissions(permissions);
}

/**
 * Hook to get all current user permissions
 */
export function usePermissions(): Permission[] {
  const { permissions } = useAuth();
  return permissions;
}

/**
 * Hook to get current user's role in the organization
 */
export function useUserRole() {
  const { userRole } = useAuth();
  return userRole;
}

/**
 * Hook to check if user is organization owner
 */
export function useIsOwner(): boolean {
  const { userRole } = useAuth();
  return userRole === 'owner';
}

/**
 * Hook to check if user is organization admin or owner
 */
export function useIsAdmin(): boolean {
  const { userRole } = useAuth();
  return userRole === 'owner' || userRole === 'admin';
}
