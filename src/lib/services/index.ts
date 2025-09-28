/**
 * Service registry and factory for managing service instances
 */

import { OrganizationService } from './organization.service';
import { CampaignService } from './campaign-service';

// Service registry to ensure singleton instances
class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }

    return ServiceRegistry.instance;
  }

  getService<T>(key: string, factory: () => T): T {
    if (!this.services.has(key)) {
      this.services.set(key, factory());
    }

    return this.services.get(key);
  }

  clearServices(): void {
    this.services.clear();
  }
}

// Service factory functions
export function getOrganizationService(): OrganizationService {
  return ServiceRegistry.getInstance().getService(
    'organization',
    () => new OrganizationService(),
  );
}

export function getCampaignService(): CampaignService {
  return ServiceRegistry.getInstance().getService(
    'campaign',
    () => new CampaignService(),
  );
}

// Export service classes for direct instantiation if needed
export { OrganizationService, CampaignService };

// Export types that services might need
export type {
  Organization,
  OrganizationMember,
  UserProfile,
  InvitationToken,
  CreateOrganizationData,
  UpdateOrganizationData,
  InviteUserData,
  AcceptInvitationData,
  OrganizationRole,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

// Service configuration
export interface ServiceConfig {
  apiBaseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Default service configuration
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

// Service error handling utilities
export function isServiceError(error: any): boolean {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

export function createServiceError(code: string, message: string, details?: any): any {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

// Service health check utilities
export interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

export async function checkServiceHealth(): Promise<ServiceHealthStatus[]> {
  const results: ServiceHealthStatus[] = [];
  
  // Check organization service
  try {
    const orgService = getOrganizationService();
    const startTime = Date.now();
    
    // Simple health check - try to get user organizations
    await orgService.getUserOrganizations();
    
    const responseTime = Date.now() - startTime;
    
    results.push({
      service: 'organization',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime,
    });
  } catch (error) {
    results.push({
      service: 'organization',
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return results;
}

// Service cleanup for testing
export function clearServiceRegistry(): void {
  ServiceRegistry.getInstance().clearServices();
}