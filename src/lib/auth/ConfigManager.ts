/**
 * Configuration Manager for handling Supabase environment variables
 * Resolves conflicts between .env and .env.local files
 * Provides validation and debugging utilities
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'env.local' | 'runtime';
  isValid: boolean;
}

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: SupabaseConfig;
}

export interface AuthConfiguration {
  supabase: SupabaseConfig;
  environment: 'development' | 'production' | 'test';
  debugMode: boolean;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AuthConfiguration | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }

    return ConfigManager.instance;
  }

  /**
   * Get the resolved Supabase configuration
   * Prioritizes .env.local over .env as per Next.js convention
   */
  public getSupabaseConfig(): SupabaseConfig {
    if (this.config?.supabase) {
      return this.config.supabase;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Determine source based on environment variable precedence
    // Next.js loads .env.local with higher priority than .env
    const source = this.determineConfigSource();

    const config: SupabaseConfig = {
      url,
      anonKey,
      source,
      isValid: this.isValidSupabaseConfig(url, anonKey),
    };

    // Cache the config
    if (!this.config) {
      this.config = {
        supabase: config,
        environment: this.getEnvironment(),
        debugMode: process.env.NODE_ENV === 'development',
      };
    }

    return config;
  }

  /**
   * Validate the current Supabase configuration
   */
  public validateConfig(): ConfigValidation {
    const config = this.getSupabaseConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if URL is provided
    if (!config.url) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not defined');
    } else if (!this.isValidUrl(config.url)) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
    } else if (!config.url.includes('supabase.co')) {
      warnings.push('Supabase URL does not appear to be a standard Supabase URL');
    }

    // Check if anon key is provided
    if (!config.anonKey) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
    } else if (!this.isValidJWT(config.anonKey)) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT token');
    }

    // Check for URL/key mismatch
    if (config.url && config.anonKey && this.isValidJWT(config.anonKey)) {
      const urlMatch = this.extractProjectIdFromUrl(config.url);
      const keyMatch = this.extractProjectIdFromJWT(config.anonKey);
      
      if (urlMatch && keyMatch && urlMatch !== keyMatch) {
        errors.push('Supabase URL and anon key appear to be from different projects');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config,
    };
  }

  /**
   * Get the full authentication configuration
   */
  public getAuthConfiguration(): AuthConfiguration {
    if (!this.config) {
      this.getSupabaseConfig(); // This will initialize the config
    }

    return this.config!;
  }

  /**
   * Resolve any configuration conflicts and provide debugging info
   */
  public resolveConflicts(): void {
    const validation = this.validateConfig();
    
    if (process.env.NODE_ENV === 'development') {
      console.group('[ConfigManager] Configuration Status');
      console.log('Environment:', this.getEnvironment());
      console.log('Config Source:', validation.config.source);
      console.log('Supabase URL:', validation.config.url);
      console.log('Anon Key (first 20 chars):', validation.config.anonKey.substring(0, 20) + '...');
      console.log('Is Valid:', validation.isValid);
      
      if (validation.errors.length > 0) {
        console.error('Configuration Errors:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Configuration Warnings:', validation.warnings);
      }
      
      console.groupEnd();
    }

    // Log critical errors in production too
    if (!validation.isValid) {
      console.error('[ConfigManager] Critical configuration errors detected:', validation.errors);
    }
  }

  /**
   * Reset cached configuration (useful for testing)
   */
  public resetConfig(): void {
    this.config = null;
  }

  // Private helper methods

  private determineConfigSource(): 'env' | 'env.local' | 'runtime' {
    // In Next.js, we can't directly determine which file the env var came from
    // But we can make educated guesses based on the environment
    if (typeof window !== 'undefined') {
      return 'runtime';
    }
    
    // In development, assume .env.local if it exists, otherwise .env
    return process.env.NODE_ENV === 'development' ? 'env.local' : 'env';
  }

  private getEnvironment(): 'development' | 'production' | 'test' {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'test') return 'test';
    if (nodeEnv === 'production') return 'production';

    return 'development';
  }

  private isValidSupabaseConfig(url: string, anonKey: string): boolean {
    return !!(url && anonKey && this.isValidUrl(url) && this.isValidJWT(anonKey));
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);

      return true;
    } catch {
      return false;
    }
  }

  private isValidJWT(token: string): boolean {
    // Basic JWT format check (header.payload.signature)
    const parts = token.split('.');

    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  private extractProjectIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Extract project ID from Supabase URL format: https://PROJECT_ID.supabase.co
      const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);

      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  private extractProjectIdFromJWT(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      
      // Extract project ID from the 'ref' field
      return payload.ref || null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export utility functions for direct use
export const getSupabaseConfig = () => configManager.getSupabaseConfig();
export const validateSupabaseConfig = () => configManager.validateConfig();
export const resolveConfigConflicts = () => configManager.resolveConflicts();