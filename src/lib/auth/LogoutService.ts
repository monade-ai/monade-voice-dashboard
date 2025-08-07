/**
 * Logout Service
 * Provides atomic, reliable logout operations with comprehensive error handling
 * and detailed logging for debugging logout issues
 */

import { authClientManager, type SessionCleanupOptions } from './AuthClientManager';

export enum LogoutStepType {
  CLEAR_LOCAL_STORAGE = 'clear_local_storage',
  CLEAR_SUPABASE_SESSION = 'clear_supabase_session',
  CLEAR_AUTH_STATE = 'clear_auth_state',
  REDIRECT_TO_LOGIN = 'redirect_to_login'
}

export interface LogoutStep {
  type: LogoutStepType;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  error?: LogoutError;
  details?: any;
}

export interface LogoutError {
  step: LogoutStepType;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface LogoutResult {
  success: boolean;
  steps: LogoutStep[];
  errors: LogoutError[];
  totalTime: number;
  completedSteps: number;
  failedSteps: number;
}

export interface LogoutOptions {
  /** Whether to clear localStorage data */
  clearLocalStorage?: boolean;
  /** Whether to clear organization-scoped data */
  clearOrganizationData?: boolean;
  /** Whether to attempt Supabase signOut */
  signOutFromSupabase?: boolean;
  /** Timeout for each step in milliseconds */
  stepTimeout?: number;
  /** Whether to force redirect even on errors */
  forceRedirect?: boolean;
  /** Custom redirect URL */
  redirectUrl?: string;
  /** Whether to add signedOut parameter to redirect */
  addSignedOutParam?: boolean;
  /** Callback for state clearing (from AuthProvider) */
  clearAuthState?: () => void;
  /** Number of retry attempts for network operations */
  retryAttempts?: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;
  /** Whether to enable fallback recovery strategies */
  enableFallbacks?: boolean;
  /** Callback for error notifications to user */
  onError?: (error: LogoutError) => void;
  /** Callback for step progress updates */
  onStepProgress?: (step: LogoutStep) => void;
}

export interface LogoutState {
  isLoggingOut: boolean;
  currentStep: LogoutStep | null;
  completedSteps: LogoutStep[];
  errors: LogoutError[];
  startTime: string;
  endTime?: string;
}

/**
 * Centralized logout service that handles all logout operations atomically
 * with comprehensive error handling and recovery strategies
 */
export class LogoutService {
  private static instance: LogoutService;
  private currentLogoutState: LogoutState | null = null;

  private constructor() {}

  public static getInstance(): LogoutService {
    if (!LogoutService.instance) {
      LogoutService.instance = new LogoutService();
    }

    return LogoutService.instance;
  }

  /**
   * Execute the complete logout process with atomic operations
   */
  public async executeLogout(options: LogoutOptions = {}): Promise<LogoutResult> {
    const startTime = new Date().toISOString();
    console.log('[LogoutService] Starting logout process at:', startTime);

    // Set default options
    const opts: Required<LogoutOptions> = {
      clearLocalStorage: true,
      clearOrganizationData: true,
      signOutFromSupabase: true,
      stepTimeout: 5000, // 5 seconds per step
      forceRedirect: true,
      redirectUrl: '/auth/login',
      addSignedOutParam: true,
      clearAuthState: () => {}, // Default no-op
      retryAttempts: 2,
      retryDelay: 1000, // 1 second between retries
      enableFallbacks: true,
      onError: () => {}, // Default no-op
      onStepProgress: () => {}, // Default no-op
      ...options,
    };

    // Initialize logout state
    this.currentLogoutState = {
      isLoggingOut: true,
      currentStep: null,
      completedSteps: [],
      errors: [],
      startTime,
    };

    const steps: LogoutStep[] = [
      {
        type: LogoutStepType.CLEAR_LOCAL_STORAGE,
        name: 'Clear Local Storage',
        status: 'pending',
        startTime: '',
      },
      {
        type: LogoutStepType.CLEAR_SUPABASE_SESSION,
        name: 'Sign Out from Supabase',
        status: 'pending',
        startTime: '',
      },
      {
        type: LogoutStepType.CLEAR_AUTH_STATE,
        name: 'Clear Authentication State',
        status: 'pending',
        startTime: '',
      },
      {
        type: LogoutStepType.REDIRECT_TO_LOGIN,
        name: 'Redirect to Login',
        status: 'pending',
        startTime: '',
      },
    ];

    const errors: LogoutError[] = [];
    let completedSteps = 0;
    let failedSteps = 0;

    // Execute each step sequentially
    for (const step of steps) {
      this.currentLogoutState.currentStep = step;
      step.status = 'in_progress';
      step.startTime = new Date().toISOString();

      console.log(`[LogoutService] Executing step: ${step.name}`);

      try {
        await this.executeStepWithRetry(step, opts);
        step.status = 'completed';
        step.endTime = new Date().toISOString();
        completedSteps++;
        this.currentLogoutState.completedSteps.push(step);
        console.log(`[LogoutService] Step completed: ${step.name}`);
        
        // Notify progress callback
        opts.onStepProgress(step);
      } catch (error) {
        const logoutError = this.createLogoutError(step.type, error);
        step.status = 'failed';
        step.endTime = new Date().toISOString();
        step.error = logoutError;
        errors.push(logoutError);
        failedSteps++;
        this.currentLogoutState.errors.push(logoutError);
        
        console.error(`[LogoutService] Step failed: ${step.name}`, error);
        
        // Notify error callback
        opts.onError(logoutError);
        
        // Notify progress callback
        opts.onStepProgress(step);

        // Continue with next steps even if current step fails
        // This ensures we don't get stuck in partial logout states
      }
    }

    const endTime = new Date().toISOString();
    this.currentLogoutState.endTime = endTime;
    this.currentLogoutState.isLoggingOut = false;

    const result: LogoutResult = {
      success: failedSteps === 0,
      steps,
      errors,
      totalTime: new Date(endTime).getTime() - new Date(startTime).getTime(),
      completedSteps,
      failedSteps,
    };

    console.log('[LogoutService] Logout process completed:', {
      success: result.success,
      completedSteps,
      failedSteps,
      totalTime: result.totalTime + 'ms',
    });

    // Clear logout state
    this.currentLogoutState = null;

    return result;
  }

  /**
   * Execute a specific logout step with retry logic and fallback strategies
   */
  private async executeStepWithRetry(step: LogoutStep, options: Required<LogoutOptions>): Promise<void> {
    let lastError: any;
    let attempt = 0;
    const maxAttempts = options.retryAttempts + 1; // +1 for initial attempt

    while (attempt < maxAttempts) {
      try {
        await this.executeStep(step, options);

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        attempt++;
        
        console.warn(`[LogoutService] Step ${step.name} failed (attempt ${attempt}/${maxAttempts}):`, error);
        
        // Handle common network errors gracefully
        if (error.message && error.message.includes('Network error')) {
          console.log('[LogoutService] Detected network error, will retry with backoff');
        }
        
        // If this was the last attempt, try fallback strategies
        if (attempt >= maxAttempts) {
          if (options.enableFallbacks) {
            console.log(`[LogoutService] Attempting fallback recovery for step: ${step.name}`);
            
            try {
              await this.executeFallbackStrategy(step, options, error);

              return; // Fallback succeeded
            } catch (fallbackError) {
              console.error(`[LogoutService] Fallback strategy failed for step ${step.name}:`, fallbackError);
              // Continue to throw the original error
            }
          }
          break; // Exit retry loop
        }
        
        // Wait before retrying (exponential backoff)
        const delay = options.retryDelay * Math.pow(2, attempt - 1);
        console.log(`[LogoutService] Retrying step ${step.name} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All attempts failed, throw the last error
    throw lastError;
  }

  /**
   * Execute a specific logout step with timeout handling
   */
  private async executeStep(step: LogoutStep, options: Required<LogoutOptions>): Promise<void> {
    const stepPromise = this.executeStepInternal(step, options);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step timeout after ${options.stepTimeout}ms`));
      }, options.stepTimeout);
    });

    return Promise.race([stepPromise, timeoutPromise]);
  }

  /**
   * Internal step execution logic
   */
  private async executeStepInternal(step: LogoutStep, options: Required<LogoutOptions>): Promise<void> {
    switch (step.type) {
    case LogoutStepType.CLEAR_LOCAL_STORAGE:
      await this.clearLocalStorageStep(options);
      break;

    case LogoutStepType.CLEAR_SUPABASE_SESSION:
      await this.clearSupabaseSessionStep(options);
      break;

    case LogoutStepType.CLEAR_AUTH_STATE:
      await this.clearAuthStateStep(options);
      break;

    case LogoutStepType.REDIRECT_TO_LOGIN:
      await this.redirectToLoginStep(options);
      break;

    default:
      throw new Error(`Unknown logout step type: ${step.type}`);
    }
  }

  /**
   * Clear localStorage data
   */
  private async clearLocalStorageStep(options: Required<LogoutOptions>): Promise<void> {
    if (!options.clearLocalStorage || typeof window === 'undefined') {
      console.log('[LogoutService] Skipping localStorage clear (disabled or not in browser)');

      return;
    }

    try {
      const cleanupOptions: SessionCleanupOptions = {
        clearLocalStorage: true,
        clearSessionStorage: true,
        clearSupabaseSession: false, // We'll handle this in the next step
        organizationScoped: options.clearOrganizationData,
      };

      await authClientManager.cleanupSession(cleanupOptions);
      console.log('[LogoutService] localStorage cleared successfully');
    } catch (error) {
      console.error('[LogoutService] localStorage clear failed:', error);
      
      // Fallback: try to clear critical items manually
      try {
        const criticalKeys = [
          'access_token',
          'refresh_token',
          'current_organization_id',
          'user_preferences',
        ];

        criticalKeys.forEach(key => {
          localStorage.removeItem(key);
        });

        // Clear Supabase keys
        const allKeys = Object.keys(localStorage);
        const supabaseKeys = allKeys.filter(key => key.startsWith('sb-'));
        supabaseKeys.forEach(key => {
          localStorage.removeItem(key);
        });

        console.log('[LogoutService] Fallback localStorage clear completed');
      } catch (fallbackError) {
        console.error('[LogoutService] Fallback localStorage clear failed:', fallbackError);
        throw new Error(`localStorage clear failed: ${error.message}`);
      }
    }
  }

  /**
   * Clear Supabase session
   */
  private async clearSupabaseSessionStep(options: Required<LogoutOptions>): Promise<void> {
    if (!options.signOutFromSupabase) {
      console.log('[LogoutService] Skipping Supabase signOut (disabled)');

      return;
    }

    try {
      const client = authClientManager.getComponentClient();
      const { error } = await client.auth.signOut();
      
      if (error) {
        console.warn('[LogoutService] Supabase signOut returned error:', error);
        // Don't throw here - we want to continue with other cleanup steps
        // The error will be logged but won't stop the logout process
      } else {
        console.log('[LogoutService] Supabase session cleared successfully');
      }
    } catch (error) {
      console.error('[LogoutService] Supabase signOut failed:', error);
      // Continue with logout process even if Supabase signOut fails
      // This prevents users from getting stuck in broken auth states
    }
  }

  /**
   * Clear authentication state (via callback from AuthProvider)
   */
  private async clearAuthStateStep(options: Required<LogoutOptions>): Promise<void> {
    try {
      if (options.clearAuthState) {
        options.clearAuthState();
        console.log('[LogoutService] Authentication state cleared successfully');
      }

      // Also clear the auth client manager's session
      await authClientManager.clearSession();
      console.log('[LogoutService] Auth client session cleared successfully');
    } catch (error) {
      console.error('[LogoutService] Auth state clear failed:', error);
      throw new Error(`Auth state clear failed: ${error.message}`);
    }
  }

  /**
   * Redirect to login page
   */
  private async redirectToLoginStep(options: Required<LogoutOptions>): Promise<void> {
    if (typeof window === 'undefined') {
      console.log('[LogoutService] Skipping redirect (not in browser)');

      return;
    }

    try {
      let redirectUrl = options.redirectUrl;
      
      if (options.addSignedOutParam) {
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl += `${separator}signedOut=true`;
      }

      console.log('[LogoutService] Redirecting to:', redirectUrl);

      // Add a small delay to ensure all cleanup operations complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Use window.location.href for reliable redirect
      window.location.href = redirectUrl;
      
      console.log('[LogoutService] Redirect initiated successfully');
    } catch (error) {
      console.error('[LogoutService] Redirect failed:', error);
      
      if (options.forceRedirect) {
        // Force redirect as fallback
        try {
          window.location.href = '/auth/login';
          console.log('[LogoutService] Force redirect completed');
        } catch (forceError) {
          console.error('[LogoutService] Force redirect failed:', forceError);
          throw new Error(`Redirect failed: ${error.message}`);
        }
      } else {
        throw new Error(`Redirect failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute fallback recovery strategies for failed logout steps
   */
  private async executeFallbackStrategy(step: LogoutStep, options: Required<LogoutOptions>, originalError: any): Promise<void> {
    console.log(`[LogoutService] Executing fallback strategy for step: ${step.type}`);
    
    switch (step.type) {
    case LogoutStepType.CLEAR_LOCAL_STORAGE:
      await this.fallbackClearLocalStorage(originalError);
      break;
        
    case LogoutStepType.CLEAR_SUPABASE_SESSION:
      await this.fallbackClearSupabaseSession(originalError);
      break;
        
    case LogoutStepType.CLEAR_AUTH_STATE:
      await this.fallbackClearAuthState(options, originalError);
      break;
        
    case LogoutStepType.REDIRECT_TO_LOGIN:
      await this.fallbackRedirect(options, originalError);
      break;
        
    default:
      throw new Error(`No fallback strategy available for step: ${step.type}`);
    }
  }

  /**
   * Fallback strategy for localStorage clearing
   */
  private async fallbackClearLocalStorage(originalError: any): Promise<void> {
    console.log('[LogoutService] Attempting localStorage fallback strategy...');
    
    if (typeof window === 'undefined') {
      throw new Error('Cannot clear localStorage in non-browser environment');
    }

    try {
      // Strategy 1: Try to clear localStorage completely
      localStorage.clear();
      console.log('[LogoutService] Fallback: localStorage.clear() succeeded');

      return;
    } catch (clearError) {
      console.warn('[LogoutService] Fallback: localStorage.clear() failed:', clearError);
    }

    try {
      // Strategy 2: Try to remove specific authentication-related keys
      const authKeys = [
        'access_token',
        'refresh_token',
        'current_organization_id',
        'user_preferences',
        'sb-localhost-auth-token',
        'sb-auth-token',
      ];

      // Get all keys and filter for Supabase keys
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => key.startsWith('sb-'));
      const organizationKeys = allKeys.filter(key => key.includes('_') && (
        key.includes('draftAssistants') ||
        key.includes('contact_lists') ||
        key.includes('contacts_') ||
        key.includes('monade_documents')
      ));

      const keysToRemove = [...authKeys, ...supabaseKeys, ...organizationKeys];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (removeError) {
          console.warn(`[LogoutService] Failed to remove key ${key}:`, removeError);
        }
      });

      console.log(`[LogoutService] Fallback: Removed ${keysToRemove.length} authentication keys`);

      return;
    } catch (selectiveError) {
      console.error('[LogoutService] Fallback: Selective key removal failed:', selectiveError);
      throw new Error(`All localStorage fallback strategies failed. Original error: ${originalError.message}`);
    }
  }

  /**
   * Fallback strategy for Supabase session clearing
   */
  private async fallbackClearSupabaseSession(originalError: any): Promise<void> {
    console.log('[LogoutService] Attempting Supabase session fallback strategy...');
    
    try {
      // Strategy 1: Try with a fresh client instance
      const freshClient = authClientManager.getComponentClient();
      const { error } = await freshClient.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.warn('[LogoutService] Fallback: Fresh client signOut returned error:', error);
      } else {
        console.log('[LogoutService] Fallback: Fresh client signOut succeeded');

        return;
      }
    } catch (freshClientError) {
      console.warn('[LogoutService] Fallback: Fresh client signOut failed:', freshClientError);
    }

    try {
      // Strategy 2: Clear Supabase tokens from localStorage manually
      if (typeof window !== 'undefined') {
        const allKeys = Object.keys(localStorage);
        const supabaseKeys = allKeys.filter(key => key.startsWith('sb-'));
        
        supabaseKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`[LogoutService] Fallback: Manually cleared ${supabaseKeys.length} Supabase tokens`);

        return;
      }
    } catch (manualClearError) {
      console.error('[LogoutService] Fallback: Manual token clearing failed:', manualClearError);
    }

    // If we reach here, all fallback strategies failed, but we don't throw
    // because we want the logout process to continue
    console.warn('[LogoutService] All Supabase session fallback strategies failed, continuing logout process');
  }

  /**
   * Fallback strategy for authentication state clearing
   */
  private async fallbackClearAuthState(options: Required<LogoutOptions>, originalError: any): Promise<void> {
    console.log('[LogoutService] Attempting auth state fallback strategy...');
    
    try {
      // Strategy 1: Force call the clearAuthState callback
      if (options.clearAuthState) {
        options.clearAuthState();
        console.log('[LogoutService] Fallback: Auth state callback executed');
      }
    } catch (callbackError) {
      console.warn('[LogoutService] Fallback: Auth state callback failed:', callbackError);
    }

    try {
      // Strategy 2: Try to clear auth client manager session with force
      await authClientManager.clearSession();
      console.log('[LogoutService] Fallback: Auth client manager session cleared');

      return;
    } catch (managerError) {
      console.error('[LogoutService] Fallback: Auth client manager clear failed:', managerError);
      throw new Error(`Auth state fallback failed. Original error: ${originalError.message}`);
    }
  }

  /**
   * Fallback strategy for redirect
   */
  private async fallbackRedirect(options: Required<LogoutOptions>, originalError: any): Promise<void> {
    console.log('[LogoutService] Attempting redirect fallback strategy...');
    
    if (typeof window === 'undefined') {
      throw new Error('Cannot redirect in non-browser environment');
    }

    try {
      // Strategy 1: Try window.location.replace instead of href
      window.location.replace('/auth/login?fallback=true');
      console.log('[LogoutService] Fallback: window.location.replace succeeded');

      return;
    } catch (replaceError) {
      console.warn('[LogoutService] Fallback: window.location.replace failed:', replaceError);
    }

    try {
      // Strategy 2: Try window.location.assign
      window.location.assign('/auth/login?fallback=true');
      console.log('[LogoutService] Fallback: window.location.assign succeeded');

      return;
    } catch (assignError) {
      console.warn('[LogoutService] Fallback: window.location.assign failed:', assignError);
    }

    try {
      // Strategy 3: Force page reload to root, which should redirect to login
      window.location.href = '/';
      console.log('[LogoutService] Fallback: Redirect to root initiated');

      return;
    } catch (rootError) {
      console.error('[LogoutService] Fallback: Root redirect failed:', rootError);
    }

    // Ultimate fallback: reload the page
    try {
      window.location.reload();
      console.log('[LogoutService] Fallback: Page reload initiated');
    } catch (reloadError) {
      console.error('[LogoutService] Fallback: Page reload failed:', reloadError);
      throw new Error(`All redirect fallback strategies failed. Original error: ${originalError.message}`);
    }
  }

  /**
   * Create a standardized logout error
   */
  private createLogoutError(step: LogoutStepType, error: any): LogoutError {
    return {
      step,
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current logout state (useful for UI feedback)
   */
  public getCurrentLogoutState(): LogoutState | null {
    return this.currentLogoutState;
  }

  /**
   * Check if logout is currently in progress
   */
  public isLoggingOut(): boolean {
    return this.currentLogoutState?.isLoggingOut || false;
  }

  /**
   * Force cleanup and redirect (emergency logout)
   * This is a last resort method for when normal logout fails
   */
  public async forceLogout(): Promise<void> {
    console.warn('[LogoutService] Executing force logout...');
    
    try {
      // Clear everything we can
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Try to sign out from Supabase
      try {
        const client = authClientManager.getComponentClient();
        await client.auth.signOut();
      } catch (error) {
        console.warn('[LogoutService] Force logout: Supabase signOut failed:', error);
      }

      // Force redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?forced=true';
      }
    } catch (error) {
      console.error('[LogoutService] Force logout failed:', error);
      
      // Ultimate fallback: reload the page to login
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }

  /**
   * Reset the logout service state (useful for testing)
   */
  public reset(): void {
    this.currentLogoutState = null;
    console.log('[LogoutService] Service state reset');
  }
}

// Export singleton instance
export const logoutService = LogoutService.getInstance();

// Export utility functions for direct use
export const executeLogout = (options?: LogoutOptions) => logoutService.executeLogout(options);
export const forceLogout = () => logoutService.forceLogout();
export const isLoggingOut = () => logoutService.isLoggingOut();
export const getCurrentLogoutState = () => logoutService.getCurrentLogoutState();