/**
 * Configuration verification utility
 * Run this to verify that environment configuration is working correctly
 */

import { configManager, validateSupabaseConfig } from './ConfigManager';

export function verifyConfiguration() {
  console.log('=== Supabase Configuration Verification ===');
  
  // Get configuration
  const config = configManager.getSupabaseConfig();
  console.log('Configuration Source:', config.source);
  console.log('Supabase URL:', config.url);
  console.log('Anon Key (first 20 chars):', config.anonKey.substring(0, 20) + '...');
  console.log('Is Valid:', config.isValid);
  
  // Validate configuration
  const validation = validateSupabaseConfig();
  console.log('\n=== Validation Results ===');
  console.log('Valid:', validation.isValid);
  
  if (validation.errors.length > 0) {
    console.log('Errors:');
    validation.errors.forEach(error => console.log('  -', error));
  }
  
  if (validation.warnings.length > 0) {
    console.log('Warnings:');
    validation.warnings.forEach(warning => console.log('  -', warning));
  }
  
  // Get full auth configuration
  const authConfig = configManager.getAuthConfiguration();
  console.log('\n=== Full Configuration ===');
  console.log('Environment:', authConfig.environment);
  console.log('Debug Mode:', authConfig.debugMode);
  
  return validation.isValid;
}

// Export for use in other files
export { configManager, validateSupabaseConfig };