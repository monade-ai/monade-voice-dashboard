'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  AuthContextType, 
  AuthUser, 
  Organization, 
  OrganizationMember, 
  OrganizationRole,
  Permission,
  ROLE_PERMISSIONS
} from '@/types';
import { getUserPermissions, getPermissionsForRole } from '@/lib/auth/permissionUtils';
import { getOrganizationService } from '@/lib/services';
import { getRoleFromJWT } from './decodeJWT';
import { configManager } from './ConfigManager';
import { authClientManager } from './AuthClientManager';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Initialize and validate configuration
  configManager.resolveConflicts();
  
  const supabase = authClientManager.getComponentClient();
  const organizationService = getOrganizationService();

  // Load user profile and organization data
  const loadUserData = useCallback(async (userId: string) => {
    try {
      console.log('[AuthProvider] Starting loadUserData for:', userId);
      
      // Get user profile
      console.log('[AuthProvider] Fetching user profile...');
const { data: initialProfile, error: profileError } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();
let profile = initialProfile;

      if (profileError) {
        console.error('[AuthProvider] Error loading user profile:', profileError);
        
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          console.log('[AuthProvider] User profile not found, creating it...');
          
          // Get user data from Supabase auth
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (!supabaseUser) {
            console.error('[AuthProvider] No authenticated user found');
            return;
          }
          
          // Create user profile
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: supabaseUser.email || '',
              full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
              avatar_url: supabaseUser.user_metadata?.avatar_url || '',
              account_type: 'personal'
            })
            .select()
            .single();
            
          if (createError) {
            console.error('[AuthProvider] Error creating user profile:', createError);
            return;
          }
          
          console.log('[AuthProvider] User profile created:', newProfile);
          profile = newProfile;
        } else {
          return;
        }
      } else {
        console.log('[AuthProvider] User profile loaded:', profile);
      }

      // Get user's organizations
      const orgsResponse = await organizationService.getUserOrganizations();
      const userOrgs = orgsResponse.success ? orgsResponse.data || [] : [];

      // Get current organization if set
      let currentOrg: Organization | null = null;
      let currentRole: OrganizationRole | null = null;
      let currentMembership: OrganizationMember | null = null;

      if (profile.current_organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.current_organization_id)
          .single();

        if (!orgError && org) {
          currentOrg = org;

          // Get user's membership in current organization
          const { data: membership, error: memberError } = await supabase
            .from('organization_members')
            .select('*')
            .eq('organization_id', profile.current_organization_id)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

          if (!memberError && membership) {
            currentRole = membership.role;
            currentMembership = membership;
          }
        }
      }

      // Get user's Supabase auth data
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      // Create enhanced user object
      const enhancedUser: AuthUser = {
        id: userId,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        current_organization_id: profile.current_organization_id,
        account_type: profile.account_type,
        preferences: profile.preferences || {},
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        supabase_user: supabaseUser!,
        organizations: userOrgs.map(org => ({
          id: org.id,
          organization_id: org.id,
          user_id: userId,
          role: 'member' as OrganizationRole, // This would come from the membership data
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          joined_at: new Date().toISOString()
        })),
        current_organization: currentOrg,
        role: currentRole,
        permissions: currentMembership ? getUserPermissions(currentMembership) : [],
        is_verified: !!supabaseUser?.email_confirmed_at,
        last_sign_in: supabaseUser?.last_sign_in_at || new Date().toISOString()
      };

      setUser(enhancedUser);
      setCurrentOrganization(currentOrg);
      setOrganizations(userOrgs);
      setUserRole(currentRole);
      
      // Set permissions: organization members get their role permissions, 
      // personal accounts get default user permissions
      if (currentMembership) {
        const memberPermissions = getUserPermissions(currentMembership);
        console.log('[AuthProvider] Organization member permissions:', memberPermissions);
        setPermissions(memberPermissions);
      } else {
        // For personal accounts, give them default user permissions
        const defaultPermissions = getPermissionsForRole('member');
        console.log('[AuthProvider] Personal account permissions:', defaultPermissions);
        console.log('[AuthProvider] Does it include assistants.create?', defaultPermissions.includes('assistants.create'));
        setPermissions(defaultPermissions);
      }

    } catch (error) {
      console.error('[AuthProvider] Error loading user data:', error);
    }
  }, [supabase, organizationService]);

  // Permission checking functions
  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((perms: Permission[]): boolean => {
    return perms.some(permission => permissions.includes(permission));
  }, [permissions]);

  const hasAllPermissions = useCallback((perms: Permission[]): boolean => {
    return perms.every(permission => permissions.includes(permission));
  }, [permissions]);

  // Organization switching
  const switchOrganization = useCallback(async (organizationId: string) => {
    if (!user) return;

    try {
      const response = await organizationService.switchOrganization(organizationId);
      
      if (response.success) {
        // Reload user data to get updated organization context
        await loadUserData(user.id);
      } else {
        throw new Error(response.error?.message || 'Failed to switch organization');
      }
    } catch (error) {
      console.error('[AuthProvider] Error switching organization:', error);
      throw error;
    }
  }, [user, organizationService, loadUserData]);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (user) {
      await loadUserData(user.id);
    }
  }, [user, loadUserData]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('[AuthProvider] Starting sign out process...');
      
      // Clear all localStorage data
      if (typeof window !== 'undefined') {
        // Remove auth-related items
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_organization_id');
        
        // Remove organization-scoped data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('_') && (
            key.includes('draftAssistants') ||
            key.includes('contact_lists') ||
            key.includes('contacts_') ||
            key.includes('monade_documents')
          )) {
            localStorage.removeItem(key);
          }
        });
        
        console.log('[AuthProvider] Cleared localStorage data');
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthProvider] Supabase sign out error:', error);
        throw error;
      }
      
      // Clear all state
      setUser(null);
      setCurrentOrganization(null);
      setOrganizations([]);
      setUserRole(null);
      setPermissions([]);
      
      console.log('[AuthProvider] Sign out completed successfully');
      
      // Add delay to ensure auth state propagates before redirect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Redirect to login page with sign out parameter
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?signedOut=true';
      }
      
    } catch (error) {
      console.error('[AuthProvider] Sign out failed:', error);
      
      // Even if sign out fails, clear local state to prevent stuck sessions
      setUser(null);
      setCurrentOrganization(null);
      setOrganizations([]);
      setUserRole(null);
      setPermissions([]);
      
      // Force clear localStorage anyway
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      
      // Still redirect to login even on error
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 100);
      }
      
      throw error;
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthProvider] Initializing auth...');
      setLoading(true);
      
      try {
        const { data } = await supabase.auth.getSession();
        console.log('[AuthProvider] Initial session check:', data.session?.user?.id);
        
        if (data.session?.user) {
          console.log('[AuthProvider] Loading user data for:', data.session.user.id);
          await loadUserData(data.session.user.id);
        } else {
          console.log('[AuthProvider] No session found during initialization');
        }
      } catch (error) {
        console.error('[AuthProvider] Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        if (session.access_token) {
          localStorage.setItem('access_token', session.access_token);
        }
        console.log('[AuthProvider] SIGNED_IN event - loading user data for:', session.user.id);
        await loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthProvider] SIGNED_OUT event received, clearing all state...');
        setUser(null);
        setCurrentOrganization(null);
        setOrganizations([]);
        setUserRole(null);
        setPermissions([]);
        
        // Clear all localStorage data on sign out event
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('current_organization_id');
          
          // Remove organization-scoped data
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.includes('_') && (
              key.includes('draftAssistants') ||
              key.includes('contact_lists') ||
              key.includes('contacts_') ||
              key.includes('monade_documents')
            )) {
              localStorage.removeItem(key);
            }
          });
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update permissions in case role changed
        if (user && user.id === session.user.id) {
          await refreshUserData();
        }
      }
      
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadUserData, user, refreshUserData]);

  const contextValue: AuthContextType = {
    user,
    loading,
    currentOrganization,
    organizations,
    userRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    signOut,
    switchOrganization,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
