/**
 * Authentication configuration and rate limiting settings
 */

export const AUTH_CONFIG = {
  // Retry configuration for session establishment
  SESSION_RETRY: {
    MAX_ATTEMPTS: 15, // Increased from 10 to handle slower organization creation
    RETRY_DELAY: 500, // 500ms between retries
    BACKOFF_MULTIPLIER: 1.2, // Exponential backoff
  },
  
  // Email verification settings
  EMAIL_VERIFICATION: {
    RESEND_COOLDOWN: 30000, // 30 seconds between resend attempts
    MAX_RESEND_ATTEMPTS: 5, // Max resends per hour
  },
  
  // Organization signup specific settings
  ORGANIZATION_SIGNUP: {
    CREATION_TIMEOUT: 30000, // 30 seconds timeout for org creation
    RETRY_ATTEMPTS: 3,
  },
  
  // Rate limiting thresholds (for client-side throttling)
  RATE_LIMITS: {
    SIGNUP_ATTEMPTS: 5, // Per 10 minutes
    LOGIN_ATTEMPTS: 10, // Per 5 minutes
    PASSWORD_RESET: 3, // Per hour
  }
};

/**
 * Enhanced retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = AUTH_CONFIG.SESSION_RETRY.MAX_ATTEMPTS,
  baseDelay: number = AUTH_CONFIG.SESSION_RETRY.RETRY_DELAY,
  backoffMultiplier: number = AUTH_CONFIG.SESSION_RETRY.BACKOFF_MULTIPLIER
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is rate limit related
 */
export function isRateLimitError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code || '';
  
  return (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('rate_limit_exceeded') ||
    code === 'rate_limit_exceeded' ||
    code === '429'
  );
}

/**
 * Get user-friendly rate limit message
 */
export function getRateLimitMessage(error: any): string {
  if (isRateLimitError(error)) {
    return 'Too many signup attempts. Please wait a few minutes before trying again.';
  }
  return error?.message || 'An unexpected error occurred';
}

/**
 * Client-side rate limiting for signup attempts
 */
export class ClientRateLimiter {
  private static attempts: Map<string, number[]> = new Map();
  
  static canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    this.attempts.set(key, validAttempts);
    
    return validAttempts.length < maxAttempts;
  }
  
  static recordAttempt(key: string): void {
    const attempts = this.attempts.get(key) || [];
    attempts.push(Date.now());
    this.attempts.set(key, attempts);
  }
  
  static getRemainingTime(key: string, windowMs: number): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const remainingTime = windowMs - (Date.now() - oldestAttempt);
    
    return Math.max(0, remainingTime);
  }
}