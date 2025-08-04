/**
 * LogoutService - Handles atomic logout operations with comprehensive error handling
 * 
 * This service implements a sequential logout process that ensures complete session termination
 * even if individual steps fail. It provides detailed logging and graceful degradation.
 */

import { authClientManager } from './AuthClientManager';

// Logout step types for tracking progress
export enum LogoutStepType {
  CLEAR_LOCAL_STORAGE = 'clear_local_storage',
  CLEAR_SUPABASE_SESSION = 'clear_supabase_session',
  CLEAR_AUTH_STATE = 'clear_auth_state',
  REDIRECT_TO_LOGIN = 'redirect_to_login'
}

// Logout step interface
export interface LogoutStep {
  type: LogoutStepType;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  error?: LogoutError;
}

// Logout error interface
export interface LogoutError {
  step: LogoutStepType;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Logout result interface
export interface LogoutResult {
  success: boolean;
  steps: LogoutStep[];
  errors: LogoutError[];
  startTime: string;
  endTime: string;
}

/**
 * LogoutService class implementing atomic logout operations
 */
export class LogoutService {
  private steps: LogoutStep[] = [];
  private errors: LogoutError[] = [];
  private startTime: string = '';

  /**
   * Execute the complete logout sequence
   * Returns a promise that resolves with the logout result
   */
  public async executeLogout(): Promise<LogoutResult> {
    this.startTime = new Date().toISOString();
    this.steps = [];
    this.errors = [];

    console.log('[LogoutService] Starting logout process at', this.startTime);

    // Initialize all steps as pending
    this.initializeSteps();

    // Execute each step sequentially, continuing even if individual steps fail
    await this.executeStep(LogoutStepType.CLEAR_LOCAL_STORAGE, () => this.clearLocalStorage());
    await this.executeStep(LogoutStepType.CLEAR_SUPABASE_SESSION, async () => { await this.clearSupabaseSession(); });
    await this.executeStep(LogoutStepType.CLEAR_AUTH_STATE, () => this.clearAuthState());
    await this.executeStep(LogoutStepType.REDIRECT_TO_LOGIN, () => this.redirectToLogin());

    const endTime = new Date().toISOString();
    const success = this.errors.length === 0;

    console.log(`[LogoutService] Logout process completed at ${endTime}. Success: ${success}`);
    console.log(`[LogoutService] Steps completed: ${this.steps.filter(s => s.status === 'completed').length}/${this.steps.length}`);
    console.log(`[LogoutService] Errors encountered: ${this.errors.length}`);

    return {
      success,
      steps: this.steps,
      errors: this.errors,
      startTime: this.startTime,
      endTime
    };
  }

  /**
   * Initialize all logout steps as pending
   */
  private initializeSteps(): void {
    const stepDefinitions = [
      { type: LogoutStepType.CLEAR_LOCAL_STORAGE, name: 'Clear Local Storage' },
      { type: LogoutStepType.CLEAR_SUPABASE_SESSION, name: 'Clear Supabase Session' },
      { type: LogoutStepType.CLEAR_AUTH_STATE, name: 'Clear Authentication State' },
      { type: LogoutStepType.REDIRECT_TO_LOGIN, name: 'Redirect to Login' }
    ];

    this.steps = stepDefinitions.map(def => ({
      type: def.type,
      name: def.name,
      status: 'pending' as const,
      startTime: new Date().toISOString()
    }));
  }

  /**
   * Execute a single logout step with error handling
   */
  private async executeStep(stepType: LogoutStepType, stepFunction: () => Promise<void> | void): Promise<void> {
    const step = this.steps.find(s => s.type === stepType);
    if (!step) return;

    step.status = 'in_progress';
    step.startTime = new Date().toISOString();

    console.log(`[LogoutService] Executing step: ${step.name}`);

    try {
      await stepFunction();
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      console.log(`[LogoutService] Step completed: ${step.name}`);
    } catch (error) {
      const logoutError: LogoutError = {
        step: stepType,
        code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
        timestamp: new Date().toISOString()
      };

      step.status = 'failed';
      step.endTime = new Date().toISOString();
      step.error = logoutError;
      this.errors.push(logoutError);

      console.error(`[LogoutService] Step failed: ${step.name}`, logoutError);
    }
  }

  /**
   * Clear all localStorage data related to user session
   */
  public clearLocalStorage(): void {
    if (typeof window === 'undefined') {
      console.warn('[LogoutService] localStorage not available (server-side)');
      return;
    }

    try {
      // Get all localStorage keys before clearing
      const keys = Object.keys(window.localStorage);
      console.log(`[LogoutService] Found ${keys.length} localStorage keys before clearing`);

      // Clear Supabase-related keys
      const supabaseKeys = keys.filter(key => key.startsWith('sb-'));
      supabaseKeys.forEach(key => {
        window.localStorage.removeItem(key);
        console.log(`[LogoutService] Removed localStorage key: ${key}`);
      });

      // Clear other auth-related keys
      const authKeys = ['auth-token', 'user-data', 'session-data', 'organization-data'];
      authKeys.forEach(key => {
        if (window.localStorage.getItem(key)) {
          window.localStorage.removeItem(key);
          console.log(`[LogoutService] Removed localStorage key: ${key}`);
        }
      });

      console.log('[LogoutService] localStorage cleared successfully');
    } catch (error) {
      console.error('[LogoutService] Failed to clear localStorage:', error);
      throw error;
    }
  }

  /**
   * Clear Supabase session
   */
  public async clearSupabaseSession(): Promise<boolean> {
    try {
      const supabase = authClientManager.getComponentClient();
      console.log('[LogoutService] Attempting to sign out from Supabase');

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[LogoutService] Supabase signOut error:', error);
        throw new Error(`Supabase signOut failed: ${error.message}`);
      }

      console.log('[LogoutService] Supabase session cleared successfully');
      return true;
    } catch (error) {
      console.error('[LogoutService] Failed to clear Supabase session:', error);
      throw error;
    }
  }

  /**
   * Clear authentication state (placeholder for AuthProvider integration)
   */
  private async clearAuthState(): Promise<void> {
    try {
      // This will be integrated with AuthProvider in the next task
      // For now, we just log the step
      console.log('[LogoutService] Authentication state clearing (placeholder)');
      
      // Clear any cached session data
      await authClientManager.clearSession();
      
      console.log('[LogoutService] Authentication state cleared successfully');
    } catch (error) {
      console.error('[LogoutService] Failed to clear authentication state:', error);
      throw error;
    }
  }

  /**
   * Redirect user to login page
   */
  public redirectToLogin(): void {
    try {
      if (typeof window === 'undefined') {
        console.warn('[LogoutService] Window not available (server-side)');
        return;
      }

      console.log('[LogoutService] Redirecting to login page');
      
      // Use window.location.href for a hard redirect that clears any remaining state
      window.location.href = '/auth/login?signedOut=true';
      
      console.log('[LogoutService] Redirect initiated');
    } catch (error) {
      console.error('[LogoutService] Failed to redirect to login:', error);
      
      // Fallback: try to reload the page to clear state
      try {
        window.location.reload();
      } catch (reloadError) {
        console.error('[LogoutService] Failed to reload page as fallback:', reloadError);
        throw error;
      }
    }
  }

  /**
   * Force cleanup for stuck logout states
   * This is a last resort method that attempts to clear everything
   */
  public async forceCleanup(): Promise<void> {
    console.log('[LogoutService] Executing force cleanup');

    try {
      // Clear localStorage aggressively
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        console.log('[LogoutService] Force cleared all localStorage');
      }

      // Attempt Supabase signOut without error handling
      try {
        const supabase = authClientManager.getComponentClient();
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('[LogoutService] Force cleanup: Supabase signOut failed, continuing...', error);
      }

      // Force page reload to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?signedOut=true&forced=true';
      }

      console.log('[LogoutService] Force cleanup completed');
    } catch (error) {
      console.error('[LogoutService] Force cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get current logout state information
   */
  public getLogoutState(): {
    isLoggingOut: boolean;
    currentStep: LogoutStep | null;
    completedSteps: LogoutStep[];
    errors: LogoutError[];
  } {
    const inProgressStep = this.steps.find(s => s.status === 'in_progress') || null;
    const completedSteps = this.steps.filter(s => s.status === 'completed');
    const isLoggingOut = inProgressStep !== null;

    return {
      isLoggingOut,
      currentStep: inProgressStep,
      completedSteps,
      errors: this.errors
    };
  }
}

// Export singleton instance
export const logoutService = new LogoutService();