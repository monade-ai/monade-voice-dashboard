'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';

import { 
  AuthContextType, 
  AuthUser, 
  Organization, 
  OrganizationMember, 
  OrganizationRole,
  Permission,
  LogoutResult,
} from '@/types';
import { getUserPermissions, getPermissionsForRole } from '@/lib/auth/permissionUtils';
import { getOrganizationService } from '@/lib/services';

import { configManager } from './ConfigManager';
import { authClientManager } from './AuthClientManager';
// Removed LogoutService import - using simplified logout

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  // Logout state management
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutProgress, setLogoutProgress] = useState<string | null>(null);

  // Loading state tracking to prevent concurrent loads
  const isLoadingUserDataRef = useRef(false);
  const isRefreshingPermissionsRef = useRef(false);

  // Initialize and validate configuration
  configManager.resolveConflicts();
  
  const supabase = authClientManager.getComponentClient();
  const organizationService = getOrganizationService();

  // Load user profile and organization data
  const loadUserData = useCallback(async (userId: string) => {
    // Prevent concurrent loads
    if (isLoadingUserDataRef.current) {
      console.log('[AuthProvider] loadUserData already in progress, skipping');

      return;
    }

    isLoadingUserDataRef.current = true;
    
    try {
      console.log('[AuthProvider] Starting loadUserData for:', userId);
      
      // Get user profile
      console.log('[AuthProvider] Fetching user profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[AuthProvider] Error loading user profile:', profileError);

        return;
      }

      let profile = profileData;

      if (!profile) {
        console.log('[AuthProvider] User profile not found, creating it...');
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (!supabaseUser) {
          console.error('[AuthProvider] No authenticated user found');

          return;
        }

        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: supabaseUser.email || '',
            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
            avatar_url: supabaseUser.user_metadata?.avatar_url || '',
            account_type: 'personal',
          })
          .select()
          .single();

        if (createError) {
          console.error('[AuthProvider] Error creating user profile:', createError);

          return;
        }
        profile = newProfile;
      }

      if (profile && profile.account_type === 'organization' && !profile.has_completed_onboarding) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/onboarding';
        }

        return;
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
        has_completed_onboarding: profile.has_completed_onboarding,
        supabase_user: supabaseUser!,
        organizations: userOrgs.map(org => ({
          id: org.id,
          organization_id: org.id,
          user_id: userId,
          role: 'member' as OrganizationRole, // This would come from the membership data
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        })),
        current_organization: currentOrg,
        role: currentRole,
        permissions: currentMembership ? getUserPermissions(currentMembership) : [],
        is_verified: !!supabaseUser?.email_confirmed_at,
        last_sign_in: supabaseUser?.last_sign_in_at || new Date().toISOString(),
      };

      // Batch state updates to minimize re-renders
      const userPermissions = currentMembership 
        ? getUserPermissions(currentMembership)
        : getPermissionsForRole('member');

      console.log('[AuthProvider] Setting permissions:', userPermissions);
      if (!currentMembership) {
        console.log('[AuthProvider] Personal account permissions include assistants.create:', userPermissions.includes('assistants.create'));
      }

      // Update all auth state in sequence to minimize re-renders
      setUser(enhancedUser);
      setCurrentOrganization(currentOrg);
      setOrganizations(userOrgs);
      setUserRole(currentRole);
      setPermissions(userPermissions);

    } catch (error) {
      console.error('[AuthProvider] Error loading user data:', error);
    } finally {
      isLoadingUserDataRef.current = false;
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
    if (user && !isLoadingUserDataRef.current) {
      try {
        await loadUserData(user.id);
      } catch (error) {
        console.error('[AuthProvider] Error refreshing user data:', error);
        // Don't throw the error, just log it to prevent breaking the UI
      }
    }
  }, [loadUserData]); // Removed 'user' dependency to prevent loops

  // Simple, reliable sign out function
  const signOut = useCallback(async (): Promise<LogoutResult> => {
    console.log('[AuthProvider] Starting logout process...');
    
    // Set logout state
    setIsLoggingOut(true);
    setLogoutError(null);
    setLogoutProgress('Signing out...');
    
    try {
      // Step 1: Clear auth state immediately
      console.log('[AuthProvider] Clearing auth state...');
      setUser(null);
      setCurrentOrganization(null);
      setOrganizations([]);
      setUserRole(null);
      setPermissions([]);
      
      // Step 2: Sign out from Supabase
      console.log('[AuthProvider] Signing out from Supabase...');
      setLogoutProgress('Clearing session...');
      
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('[AuthProvider] Supabase signOut warning:', error);
          // Continue with logout even if Supabase signOut has issues
        }
      } catch (supabaseError) {
        console.warn('[AuthProvider] Supabase signOut error:', supabaseError);
        // Continue with logout even if Supabase signOut fails
      }
      
      // Step 3: Clear localStorage
      console.log('[AuthProvider] Clearing local storage...');
      setLogoutProgress('Clearing local data...');
      
      if (typeof window !== 'undefined') {
        try {
          // Clear auth-related items
          localStorage.removeItem('access_token');
          localStorage.removeItem('current_organization_id');
          
          // Clear Supabase keys
          const allKeys = Object.keys(localStorage);
          const supabaseKeys = allKeys.filter(key => key.startsWith('sb-'));
          supabaseKeys.forEach(key => {
            localStorage.removeItem(key);
          });
          
          // Clear organization-scoped data
          const orgKeys = allKeys.filter(key => 
            key.includes('_') && (
              key.includes('draftAssistants') ||
              key.includes('contact_lists') ||
              key.includes('contacts_') ||
              key.includes('monade_documents')
            ),
          );
          orgKeys.forEach(key => {
            localStorage.removeItem(key);
          });
          
          console.log('[AuthProvider] Local storage cleared successfully');
        } catch (storageError) {
          console.warn('[AuthProvider] Local storage clear error:', storageError);
          // Continue with logout even if storage clear fails
        }
      }
      
      // Step 4: Redirect to login
      console.log('[AuthProvider] Redirecting to login...');
      setLogoutProgress('Redirecting...');
      setLogoutError(null);
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?signedOut=true';
      }
      
      console.log('[AuthProvider] Logout completed successfully');

      return { success: true };
      
    } catch (error) {
      console.error('[AuthProvider] Logout error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      setLogoutError(errorMessage);
      setLogoutProgress('Logout failed, trying emergency logout...');
      
      // Emergency fallback
      try {
        console.log('[AuthProvider] Attempting emergency logout...');
        
        // Force clear everything
        setUser(null);
        setCurrentOrganization(null);
        setOrganizations([]);
        setUserRole(null);
        setPermissions([]);
        
        if (typeof window !== 'undefined') {
          // Clear all storage
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (clearError) {
            console.warn('[AuthProvider] Emergency storage clear failed:', clearError);
          }
          
          // Force redirect
          window.location.href = '/auth/login?emergency=true';
        }
        
        console.log('[AuthProvider] Emergency logout completed');

        return { success: true };
        
      } catch (emergencyError) {
        console.error('[AuthProvider] Emergency logout failed:', emergencyError);
        setLogoutError('Logout failed completely. Please close your browser and try again.');
        
        // Ultimate fallback: reload the page
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        
        return { success: false, error: 'Emergency logout failed' };
      }
      
      return { success: false, error: errorMessage };
    } finally {
      // Clear logout state after a delay
      setTimeout(() => {
        setIsLoggingOut(false);
        setLogoutProgress(null);
      }, 1000);
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthProvider] Initializing auth...');
      setLoading(true);
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthProvider] Session fetch error:', error);
          // Don't throw, just log and continue
        }
        
        console.log('[AuthProvider] Initial session check:', data.session?.user?.id);
        
        if (data.session?.user) {
          console.log('[AuthProvider] Loading user data for:', data.session.user.id);
          await loadUserData(data.session.user.id);
        } else {
          console.log('[AuthProvider] No session found during initialization');
        }
      } catch (error) {
        console.error('[AuthProvider] Error initializing auth:', error);
        // Clear any partial state on initialization error
        setUser(null);
        setCurrentOrganization(null);
        setOrganizations([]);
        setUserRole(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          if (session.access_token) {
            localStorage.setItem('access_token', session.access_token);
          }
          const accountTypeIntent = localStorage.getItem('account_type_intent') || 'personal';
          localStorage.removeItem('account_type_intent');

          console.log('[AuthProvider] SIGNED_IN event - ensuring user profile for:', session.user.id, 'with account type:', accountTypeIntent);
          await supabase.rpc('ensure_user_profile', { account_type: accountTypeIntent });
          console.log('[AuthProvider] SIGNED_IN event - loading user data for:', session.user.id);
          await loadUserData(session.user.id);
        } catch (error) {
          console.error('[AuthProvider] Error handling SIGNED_IN event:', error);
          // Don't break the auth flow, just log the error
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthProvider] SIGNED_OUT event received, clearing all state...');
        setUser(null);
        setCurrentOrganization(null);
        setOrganizations([]);
        setUserRole(null);
        setPermissions([]);
        
        // Clear all localStorage data on sign out event
        if (typeof window !== 'undefined') {
          try {
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
          } catch (storageError) {
            console.warn('[AuthProvider] Error clearing storage on SIGNED_OUT:', storageError);
          }
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Only refresh permissions when token refreshes, avoid full user data reload
        if (user && user.id === session.user.id && !isRefreshingPermissionsRef.current) {
          console.log('[AuthProvider] Token refreshed, checking if permissions need update');
          // For now, we'll skip automatic refresh on token refresh to prevent loops
          // Permissions will be updated when user actively switches organizations or roles change
        }
      }
      
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadUserData, refreshUserData]); // Removed 'user' to prevent circular dependency

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
    isLoggingOut,
    logoutError,
    logoutProgress,
    signOut,
    switchOrganization,
    refreshUserData,
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
