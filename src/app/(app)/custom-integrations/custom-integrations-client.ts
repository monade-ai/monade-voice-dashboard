import { MONADE_API_BASE } from '@/config';
import { ApiError, fetchJson, type FetchJsonOptions } from '@/lib/http';

export type IntegrationBucket = 'ready' | 'scheduled' | 'deferred' | 'analytics_pending';

export type IntegrationStatus = {
  service?: string;
  user_id?: string;
  dispatch_enabled?: boolean;
  max_concurrent_calls?: number;
  calling_window?: {
    timezone?: string;
    start?: string;
    end?: string;
  };
  queue_depth?: number;
  scheduled_retry_count?: number;
  deferred_outside_window_count?: number;
  analytics_pending_count?: number;
  calls_in_progress?: number;
  launching_count?: number;
};

export type IntegrationRoutes = {
  status: string;
  queue: string;
  queue_jobs: string;
  job?: string;
  delete_job?: string;
  reschedule_job?: string;
  update_job?: string;
  retry_now?: string;
};

export type CustomIntegration = {
  slug: string;
  label: string;
  service: string;
  base_path: string;
  status?: IntegrationStatus;
  routes: IntegrationRoutes;
};

export type QueueJob = {
  job_id: string;
  user_id?: string;
  phone_number?: string;
  lead_id?: string;
  bucket?: IntegrationBucket;
  status?: string;
  queue_status?: string;
  attempt?: number;
  retry_count?: number;
  retry_day?: number;
  max_retries?: number;
  scheduled_for?: string | null;
  next_attempt_after?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_call_id?: string | null;
  last_room_name?: string | null;
  last_failure_reason?: string | null;
  expires_at?: string | null;
  payload?: unknown;
};

export type QueueJobsResponse = Partial<Record<IntegrationBucket, QueueJob[]>>;

type DiscoveryResponse = {
  integrations?: CustomIntegration[];
};

const CUSTOM_INTEGRATION_DISCOVERY_ROUTES = [
  '/custom-integrations/collegevidya/internal/users/{user_id}/custom-integrations',
];

function getServiceBaseUrl() {
  try {
    return new URL(MONADE_API_BASE).origin;
  } catch {
    return 'https://service.monade.ai';
  }
}

function integrationUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  return `${getServiceBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function fetchIntegrationJson<T>(path: string, options?: FetchJsonOptions) {
  return fetchJson<T>(integrationUrl(path), {
    ...options,
    credentials: 'include',
    retry: options?.retry ?? { retries: 1 },
  });
}

function fillUserRoute(route: string, userUid: string) {
  return route.replaceAll('{user_id}', encodeURIComponent(userUid));
}

export async function discoverCustomIntegrations(userUid: string) {
  const discovered = await Promise.all(CUSTOM_INTEGRATION_DISCOVERY_ROUTES.map(async (route) => {
    try {
      const response = await fetchIntegrationJson<DiscoveryResponse>(fillUserRoute(route, userUid));

      return response.integrations ?? [];
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return [];
      throw err;
    }
  }));

  return discovered.flat();
}

export async function fetchIntegrationStatus(integration: CustomIntegration) {
  return fetchIntegrationJson<IntegrationStatus>(integration.routes.status);
}

export async function fetchIntegrationQueueJobs(integration: CustomIntegration) {
  return fetchIntegrationJson<QueueJobsResponse>(
    `${integration.routes.queue_jobs}?limit=100&bucket=all&include_payload=false`,
  );
}

function resolveRouteTemplate(template: string, jobId: string) {
  return template.replaceAll('{job_id}', encodeURIComponent(jobId));
}

export function getIntegrationJobRoute(integration: CustomIntegration, jobId: string) {
  if (integration.routes.job) {
    return resolveRouteTemplate(integration.routes.job, jobId);
  }

  return `${integration.routes.queue_jobs.split('/queue/jobs')[0]}/jobs/${encodeURIComponent(jobId)}`;
}

export function getIntegrationDeleteJobRoute(integration: CustomIntegration, jobId: string) {
  if (integration.routes.delete_job) {
    return resolveRouteTemplate(integration.routes.delete_job, jobId);
  }

  return getIntegrationJobRoute(integration, jobId);
}

export function getIntegrationRetryNowRoute(integration: CustomIntegration, jobId: string) {
  if (integration.routes.retry_now) {
    return resolveRouteTemplate(integration.routes.retry_now, jobId);
  }

  return `${getIntegrationJobRoute(integration, jobId)}/retry-now`;
}

export async function fetchIntegrationJobDetail(integration: CustomIntegration, jobId: string) {
  return fetchIntegrationJson<QueueJob>(getIntegrationJobRoute(integration, jobId));
}

export async function deleteIntegrationJob(integration: CustomIntegration, jobId: string) {
  return fetchIntegrationJson(getIntegrationDeleteJobRoute(integration, jobId), {
    method: 'DELETE',
    retry: { retries: 0 },
  });
}

export async function retryIntegrationJobNow(integration: CustomIntegration, jobId: string) {
  return fetchIntegrationJson(getIntegrationRetryNowRoute(integration, jobId), {
    method: 'POST',
    retry: { retries: 0 },
  });
}
