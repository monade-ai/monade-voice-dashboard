/**
 * Service index exports
 */

export { campaignApi, default as campaignApiService } from './campaign-api.service';
export * from './campaign-api.service';

export interface ServiceConfig {
  apiBaseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  timeout: 30000,
  retryAttempts: 3,
};

export function isServiceError(error: any): boolean {
  return Boolean(error && typeof error.code === 'string' && typeof error.message === 'string');
}

export function createServiceError(code: string, message: string, details?: any): any {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}
