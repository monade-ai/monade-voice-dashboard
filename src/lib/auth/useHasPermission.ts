import { useAuth } from './AuthProvider';
import { permissionsMatrix, Role, Action } from './permissionsMatrix';

/**
 * Hook to check if the current user has permission for a given action.
 * Usage: const canCreate = useHasPermission('contacts.create_bucket');
 */
export function useHasPermission(action: Action): boolean {
  const { role } = useAuth();
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as Role;
  if (!permissionsMatrix[normalizedRole]) return false;
  return !!permissionsMatrix[normalizedRole][action];
}
