/**
 * Tests for ConfigManager utility
 */

import { configManager, getSupabaseConfig, validateSupabaseConfig } from '../ConfigManager';

// Mock environment variables for testing
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QtcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.test-signature',
  NODE_ENV: 'test',
};

describe('ConfigManager', () => {
  beforeEach(() => {
    // Reset config before each test
    configManager.resetConfig();
    
    // Mock environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('getSupabaseConfig', () => {
    it('should return valid configuration when environment variables are set', () => {
      const config = getSupabaseConfig();
      
      expect(config.url).toBe(mockEnv.NEXT_PUBLIC_SUPABASE_URL);
      expect(config.anonKey).toBe(mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      expect(config.isValid).toBe(true);
    });

    it('should return invalid configuration when URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      const config = getSupabaseConfig();
      
      expect(config.url).toBe('');
      expect(config.isValid).toBe(false);
    });

    it('should return invalid configuration when anon key is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      const config = getSupabaseConfig();
      
      expect(config.anonKey).toBe('');
      expect(config.isValid).toBe(false);
    });
  });

  describe('validateSupabaseConfig', () => {
    it('should validate correct configuration', () => {
      const validation = validateSupabaseConfig();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing URL', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      const validation = validateSupabaseConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('NEXT_PUBLIC_SUPABASE_URL is not defined');
    });

    it('should detect missing anon key', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      const validation = validateSupabaseConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
    });

    it('should detect invalid URL format', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
      
      const validation = validateSupabaseConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
    });

    it('should detect invalid JWT format', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'not-a-jwt';
      
      const validation = validateSupabaseConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT token');
    });
  });

  describe('configuration caching', () => {
    it('should cache configuration after first access', () => {
      const config1 = getSupabaseConfig();
      const config2 = getSupabaseConfig();
      
      expect(config1).toBe(config2); // Should be the same object reference
    });

    it('should reset cache when resetConfig is called', () => {
      const config1 = getSupabaseConfig();
      configManager.resetConfig();
      const config2 = getSupabaseConfig();
      
      expect(config1).not.toBe(config2); // Should be different object references
    });
  });
});