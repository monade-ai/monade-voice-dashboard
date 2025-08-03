/**
 * Authentication Client Manager
 * Provides unified Supabase client access with configuration validation and session cleanup utilities
 */

import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { configManager, type SupabaseConfig } from './ConfigManager';
import type { Database } from '@/types/database';

export type ClientType = 'component' | 'server' | 'admin';

export interface SessionCleanupOptions {
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
  clearSupabaseSession?: boolean;
  organizationScoped?: boolean;
}

export interface ClientValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  clientType: ClientType;
  configSource: string;
}

/**
 * Centralized authentication client manager
 * Handles all Supabase client creation and session management
 */
export class AuthClientManager {
  private static instance: AuthClientManager;
  private componentClient: SupabaseClient<Database> | null = null;
  private adminClient: SupabaseClient<Database> | null = null;
  private config: SupabaseConfig | null = null;

  private constructor() {
    // Initialize configuration
    this.config = configManager.getSupabaseConfig();
  }

  public static getInstance(): AuthClientManager {
    if (!AuthClientManager.instance) {
      AuthClientManager.instance = new AuthClientManager();
    }
    return AuthClientManager.instance;
  }

  /**
   * Get a client component client (for use in React components)
   * This is the recommended client for most authentication operations
   */
  public getComponentClient(): SupabaseClient<Database> {
    if (!this.componentClient) {
      this.validateConfiguration();
      this.componentClient = createClientComponentClient<Database>();
    }
    return this.componentClient;
  }

  /**
   * Get a server component client (for use in server components)
   * Requires cookies to be passed from the server context
   */
  public getServerClient(cookies: any): SupabaseClient<Database> {
    this.validateConfiguration();
    return createServerComponentClient<Database>({ cookies });
  }

  /**
   * Get an admin client with service role key (for admin operations)
   * Should only be used server-side with proper security measures
   */
  public getAdminClient(): SupabaseClient<Database> {
    if (!this.adminClient) {
      this.validateConfiguration();
      
      if (!this.config) {
        throw new Error('Configuration not initialized');
      }

      // For admin client, we need the service role key
      // This should be stored in a separate environment variable
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
      }

      this.adminClient = createClient<Database>(
        this.config.url,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }
    return this.adminClient;
  }

  /**
   * Validate the current configuration
   */
  public validateConfiguration(): ClientValidationResult {
    const validation = configManager.validateConfig();
    
    const result: ClientValidationResult = {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      clientType: 'component',
      configSource: validation.config.source
    };

    if (!validation.isValid) {
      console.error('[AuthClientManager] Configuration validation failed:', validation.errors);
      throw new Error(`Invalid Supabase configuration: ${validation.errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Comprehensive session cleanup utility
   */
  public async cleanupSession(options: SessionCleanupOptions = {}): Promise<void> {
    const {
      clearLocalStorage = true,
      clearSessionStorage = true,
      clearSupabaseSession = true,
      organizationScoped = true
    } = options;

    console.log('[AuthClientManager] Starting session cleanup...', options);

    try {
      // Clear Supabase session first
      if (clearSupabaseSession) {
        const client = this.getComponentClient();
        const { error } = await client.auth.signOut();
        if (error) {
          console.warn('[AuthClientManager] Supabase signOut error:', error);
          // Continue with cleanup even if signOut fails
        } else {
          console.log('[AuthClientManager] Supabase session cleared successfully');
        }
      }

      // Clear browser storage
      if (typeof window !== 'undefined') {
        if (clearLocalStorage) {
          this.clearLocalStorageData(organizationScoped);
        }

        if (clearSessionStorage) {
          this.clearSessionStorageData();
        }
      }

      console.log('[AuthClientManager] Session cleanup completed successfully');
    } catch (error) {
      console.error('[AuthClientManager] Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clear localStorage data with optional organization scoping
   */
  private clearLocalStorageData(organizationScoped: boolean = true): void {
    if (typeof window === 'undefined') return;

    try {
      // Always clear auth-related items
      const authKeys = [
        'access_token',
        'refresh_token',
        'current_organization_id',
        'user_preferences'
      ];

      authKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear Supabase-specific keys
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => key.startsWith('sb-'));
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear organization-scoped data if requested
      if (organizationScoped) {
        const orgScopedKeys = allKeys.filter(key => 
          key.includes('_') && (
            key.includes('draftAssistants') ||
            key.includes('contact_lists') ||
            key.includes('contacts_') ||
            key.includes('monade_documents') ||
            key.includes('workflow_') ||
            key.includes('knowledge_base_') ||
            key.includes('assistant_')
          )
        );

        orgScopedKeys.forEach(key => {
          localStorage.removeItem(key);
        });

        console.log(`[AuthClientManager] Cleared ${orgScopedKeys.length} organization-scoped localStorage items`);
      }

      console.log(`[AuthClientManager] Cleared ${authKeys.length + supabaseKeys.length} localStorage items`);
    } catch (error) {
      console.error('[AuthClientManager] Error clearing localStorage:', error);
      // Try to clear everything as fallback
      try {
        localStorage.clear();
        console.log('[AuthClientManager] Fallback: cleared all localStorage');
      } catch (fallbackError) {
        console.error('[AuthClientManager] Fallback localStorage clear failed:', fallbackError);
      }
    }
  }

  /**
   * Clear sessionStorage data
   */
  private clearSessionStorageData(): void {
    if (typeof window === 'undefined') return;

    try {
      // Clear all session storage (it's typically safe to clear everything)
      const sessionKeys = Object.keys(sessionStorage);
      sessionStorage.clear();
      console.log(`[AuthClientManager] Cleared ${sessionKeys.length} sessionStorage items`);
    } catch (error) {
      console.error('[AuthClientManager] Error clearing sessionStorage:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const client = this.getComponentClient();
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        console.warn('[AuthClientManager] Session check error:', error);
        return false;
      }

      return !!session?.user;
    } catch (error) {
      console.error('[AuthClientManager] Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Get current user session
   */
  public async getCurrentSession() {
    try {
      const client = this.getComponentClient();
      const { data, error } = await client.auth.getSession();
      
      if (error) {
        console.warn('[AuthClientManager] Get session error:', error);
        return null;
      }

      return data.session;
    } catch (error) {
      console.error('[AuthClientManager] Get session failed:', error);
      return null;
    }
  }

  /**
   * Refresh the current session
   */
  public async refreshSession() {
    try {
      const client = this.getComponentClient();
      const { data, error } = await client.auth.refreshSession();
      
      if (error) {
        console.warn('[AuthClientManager] Session refresh error:', error);
        throw error;
      }

      return data.session;
    } catch (error) {
      console.error('[AuthClientManager] Session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Reset the client manager (useful for testing or configuration changes)
   */
  public reset(): void {
    this.componentClient = null;
    this.adminClient = null;
    this.config = configManager.getSupabaseConfig();
    console.log('[AuthClientManager] Client manager reset');
  }

  /**
   * Get configuration information for debugging
   */
  public getConfigInfo() {
    return {
      config: this.config,
      hasComponentClient: !!this.componentClient,
      hasAdminClient: !!this.adminClient,
      validation: this.validateConfiguration()
    };
  }
}

// Export singleton instance
export const authClientManager = AuthClientManager.getInstance();

// Export utility functions for direct use
export const getAuthClient = () => authClientManager.getComponentClient();
export const getServerAuthClient = (cookies: any) => authClientManager.getServerClient(cookies);
export const getAdminAuthClient = () => authClientManager.getAdminClient();
export const cleanupAuthSession = (options?: SessionCleanupOptions) => authClientManager.cleanupSession(options);
export const isUserAuthenticated = () => authClientManager.isAuthenticated();
export const getCurrentAuthSession = () => authClientManager.getCurrentSession();
export const refreshAuthSession = () => authClientManager.refreshSession();