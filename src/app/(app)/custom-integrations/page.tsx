'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Clock,
  Database,
  Eye,
  Loader2,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/http';

import {
  deleteIntegrationJob,
  discoverCustomIntegrations,
  fetchIntegrationJobDetail,
  fetchIntegrationQueueJobs,
  fetchIntegrationStatus,
  retryIntegrationJobNow,
  type CustomIntegration,
  type IntegrationBucket,
  type IntegrationStatus,
  type QueueJob,
  type QueueJobsResponse,
} from './custom-integrations-client';

type IntegrationState = {
  integration: CustomIntegration;
  status: IntegrationStatus | null;
  jobs: QueueJobsResponse;
  error: string | null;
  loading: boolean;
};

const BUCKETS: IntegrationBucket[] = ['ready', 'scheduled', 'deferred', 'analytics_pending'];
const SECRET_KEY_PATTERN = /api[_-]?key|authorization|token|secret/i;

const bucketLabels: Record<IntegrationBucket, string> = {
  ready: 'Ready',
  scheduled: 'Scheduled',
  deferred: 'Deferred',
  analytics_pending: 'Analytics',
};

function formatNumber(value?: number) {
  return typeof value === 'number' ? value.toLocaleString() : '0';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizeJobs(jobs: QueueJobsResponse) {
  return BUCKETS.flatMap((bucket) => (jobs[bucket] ?? []).map((job) => ({
    ...job,
    bucket: job.bucket ?? bucket,
  })));
}

function sanitizePayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : sanitizePayload(item),
    ]),
  );
}

function EmptyState() {
  return (
    <PaperCard variant="default" className="border-dashed">
      <PaperCardContent className="p-10 text-center space-y-3">
        <div className="mx-auto h-11 w-11 rounded-full border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground">
          <PlugIcon />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">No custom integrations are active for this account.</h2>
        <p className="text-sm text-muted-foreground">
          Contact the Monade team to connect a custom CRM or calling workflow.
        </p>
      </PaperCardContent>
    </PaperCard>
  );
}

function PlugIcon() {
  return <Zap size={18} />;
}

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'good' | 'warn';
}) {
  return (
    <PaperCard variant="default" className="min-h-[104px]">
      <PaperCardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
          <span className={cn(
            'h-8 w-8 rounded-[4px] border flex items-center justify-center',
            tone === 'good' && 'border-green-500/20 bg-green-500/10 text-green-600',
            tone === 'warn' && 'border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
            tone === 'default' && 'border-border/40 bg-muted/20 text-muted-foreground',
          )}>
            {icon}
          </span>
        </div>
        <div className="mt-5 text-2xl font-semibold tracking-tight">{value}</div>
      </PaperCardContent>
    </PaperCard>
  );
}

function IntegrationStatusCards({ state }: { state: IntegrationState }) {
  const status = state.status;
  const maxConcurrent = status?.max_concurrent_calls ?? 0;
  const inProgress = status?.calls_in_progress ?? 0;
  const capacity = maxConcurrent > 0 ? Math.round((inProgress / maxConcurrent) * 100) : 0;
  const callingWindow = status?.calling_window;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{state.integration.label}</h2>
            <Badge
              variant="outline"
              className={cn(
                'rounded-[4px] text-[10px] uppercase tracking-widest',
                status?.dispatch_enabled
                  ? 'border-green-500/30 bg-green-500/5 text-green-600'
                  : 'border-border/50 text-muted-foreground',
              )}
            >
              {status?.dispatch_enabled ? 'Dispatch Enabled' : 'Dispatch Disabled'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {callingWindow?.start && callingWindow?.end
              ? `${callingWindow.start}-${callingWindow.end} ${callingWindow.timezone ?? ''}`
              : 'Calling window unavailable'}
          </p>
        </div>
        {state.error && (
          <div className="flex items-center gap-2 rounded-[4px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle size={14} />
            {state.error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <StatCard label="Ready Now" value={formatNumber(status?.queue_depth)} icon={<Database size={15} />} />
        <StatCard label="In Progress" value={formatNumber(inProgress)} icon={<PhoneCall size={15} />} tone="good" />
        <StatCard label="Scheduled" value={formatNumber(status?.scheduled_retry_count)} icon={<Timer size={15} />} />
        <StatCard label="Deferred" value={formatNumber(status?.deferred_outside_window_count)} icon={<Clock size={15} />} tone="warn" />
        <StatCard label="Analytics" value={formatNumber(status?.analytics_pending_count)} icon={<Activity size={15} />} />
        <StatCard label="Capacity" value={`${capacity}%`} icon={<ShieldCheck size={15} />} />
      </div>
    </section>
  );
}

function IntegrationQueueTable({
  state,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  onRetryNow,
}: {
  state: IntegrationState;
  selectedJobId?: string;
  onSelectJob: (integration: CustomIntegration, job: QueueJob) => void;
  onDeleteJob: (integration: CustomIntegration, job: QueueJob) => void;
  onRetryNow: (integration: CustomIntegration, job: QueueJob) => void;
}) {
  const jobs = normalizeJobs(state.jobs);

  return (
    <PaperCard variant="default">
      <PaperCardHeader className="border-b border-border/30">
        <div className="flex items-center justify-between gap-4">
          <PaperCardTitle>Queue Jobs</PaperCardTitle>
          <Badge variant="outline" className="rounded-[4px] font-mono text-[10px]">
            {jobs.length} rows
          </Badge>
        </div>
      </PaperCardHeader>
      <PaperCardContent className="p-0">
        {state.loading ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading queue
          </div>
        ) : jobs.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
            No queued jobs for this integration.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left font-bold">Job</th>
                  <th className="px-4 py-3 text-left font-bold">Phone</th>
                  <th className="px-4 py-3 text-left font-bold">Prospect</th>
                  <th className="px-4 py-3 text-left font-bold">Bucket</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-left font-bold">Retries</th>
                  <th className="px-4 py-3 text-left font-bold">Scheduled</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const isActive = job.status === 'in_progress'
                    || job.status === 'ended_waiting_for_analytics'
                    || job.status === 'analytics_pending'
                    || job.queue_status === 'in_progress'
                    || job.queue_status === 'analytics_pending';

                  return (
                    <tr
                      key={`${state.integration.slug}-${job.job_id}`}
                      className={cn(
                        'border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors',
                        selectedJobId === job.job_id && 'bg-primary/5',
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs max-w-[180px] truncate">{job.job_id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{job.phone_number || 'Unknown'}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate">{job.prospect_id || 'None'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="rounded-[4px] text-[10px]">
                          {bucketLabels[job.bucket ?? 'ready']}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{job.status || job.queue_status || 'queued'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {job.retry_count ?? 0}/{job.max_retries ?? 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {job.bucket === 'ready' ? 'Ready now' : formatDate(job.next_attempt_after || job.scheduled_for)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[4px]"
                            title="Inspect payload"
                            onClick={() => onSelectJob(state.integration, job)}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[4px]"
                            title="Retry now"
                            disabled={isActive}
                            onClick={() => onRetryNow(state.integration, job)}
                          >
                            <RefreshCw size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[4px] hover:text-destructive"
                            title="Delete job"
                            disabled={isActive}
                            onClick={() => onDeleteJob(state.integration, job)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PaperCardContent>
    </PaperCard>
  );
}

function IntegrationJobDrawer({
  job,
  loading,
  onClose,
}: {
  job: QueueJob | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!job && !loading) return null;

  return (
    <PaperCard variant="default" className="xl:sticky xl:top-20">
      <PaperCardHeader className="border-b border-border/30">
        <div className="flex items-center justify-between gap-3">
          <PaperCardTitle>Job Detail</PaperCardTitle>
          <Button variant="ghost" size="sm" className="h-7 rounded-[4px] text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </PaperCardHeader>
      <PaperCardContent className="p-5">
        {loading ? (
          <div className="h-52 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading detail
          </div>
        ) : job ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <DetailItem label="Status" value={job.status || 'Unknown'} />
              <DetailItem label="Queue" value={job.queue_status || job.bucket || 'Unknown'} />
              <DetailItem label="Assistant" value={(job.payload as any)?.assistant_id || 'Not set'} />
              <DetailItem label="Trunk" value={(job.payload as any)?.telephony?.trunk_name || 'Not set'} />
              <DetailItem label="Last Call" value={job.last_call_id || 'None'} />
              <DetailItem label="Last Room" value={job.last_room_name || 'None'} />
            </div>
            {job.last_failure_reason && (
              <div className="rounded-[4px] border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                {job.last_failure_reason}
              </div>
            )}
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Original Payload</div>
              <pre className="max-h-[420px] overflow-auto rounded-[4px] border border-border/40 bg-muted/20 p-3 text-[11px] leading-relaxed">
                {JSON.stringify(sanitizePayload(job.payload ?? {}), null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </PaperCardContent>
    </PaperCard>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-border/30 bg-muted/10 p-3 min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function IntegrationCard({
  state,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  onRetryNow,
}: {
  state: IntegrationState;
  selectedJobId?: string;
  onSelectJob: (integration: CustomIntegration, job: QueueJob) => void;
  onDeleteJob: (integration: CustomIntegration, job: QueueJob) => void;
  onRetryNow: (integration: CustomIntegration, job: QueueJob) => void;
}) {
  return (
    <div className="space-y-5">
      <IntegrationStatusCards state={state} />
      <IntegrationQueueTable
        state={state}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        onRetryNow={onRetryNow}
        onDeleteJob={onDeleteJob}
      />
    </div>
  );
}

export default function CustomIntegrationsPage() {
  const { userUid, loading: userLoading } = useMonadeUser();
  const [states, setStates] = useState<IntegrationState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<CustomIntegration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadIntegrationData = useCallback(async (integration: CustomIntegration): Promise<IntegrationState | null> => {
    if (!integration.routes.status || !integration.routes.queue_jobs) {
      return {
        integration,
        status: integration.status ?? null,
        jobs: {},
        error: 'Integration routes are incomplete.',
        loading: false,
      };
    }

    try {
      const [status, jobs] = await Promise.all([
        fetchIntegrationStatus(integration),
        fetchIntegrationQueueJobs(integration),
      ]);

      return { integration, status, jobs, error: null, loading: false };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;

      return {
        integration,
        status: null,
        jobs: {},
        error: err instanceof Error ? err.message : 'Failed to load integration.',
        loading: false,
      };
    }
  }, []);

  const refresh = useCallback(async (showSpinner = false) => {
    if (!userUid) return;
    if (showSpinner) setRefreshing(true);
    setLoading((previous) => previous || showSpinner);

    try {
      const integrations = await discoverCustomIntegrations(userUid);
      const loaded = await Promise.all(integrations.map(loadIntegrationData));
      setStates(loaded.filter((item): item is IntegrationState => Boolean(item)));
    } catch (err) {
      console.error('[CustomIntegrations] load error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load custom integrations');
      setStates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadIntegrationData, userUid]);

  useEffect(() => {
    if (userLoading) return;
    if (!userUid) {
      setLoading(false);

      return;
    }

    refresh();
    const interval = window.setInterval(() => refresh(), 15000);

    return () => window.clearInterval(interval);
  }, [refresh, userLoading, userUid]);

  const handleSelectJob = async (integration: CustomIntegration, job: QueueJob) => {
    if (!userUid) return;
    setSelectedIntegration(integration);
    setSelectedJob(job);
    setDetailLoading(true);

    try {
      const detail = await fetchIntegrationJobDetail(integration, job.job_id);
      setSelectedJob(detail);
    } catch (err) {
      console.error('[CustomIntegrations] detail error:', err);
      toast.error('Could not load job payload');
    } finally {
      setDetailLoading(false);
    }
  };

  const mutateJob = async (integration: CustomIntegration, job: QueueJob, action: 'delete' | 'retry') => {
    if (!userUid) return;

    try {
      if (action === 'retry') {
        await retryIntegrationJobNow(integration, job.job_id);
      } else {
        await deleteIntegrationJob(integration, job.job_id);
      }
      toast.success(action === 'retry' ? 'Job moved for retry' : 'Job deleted');
      if (selectedJob?.job_id === job.job_id) setSelectedJob(null);
      await refresh(true);
    } catch (err) {
      console.error(`[CustomIntegrations] ${action} error:`, err);
      toast.error(err instanceof Error ? err.message : 'Job update failed');
    }
  };

  const totalIntegrations = states.length;
  const totalJobs = useMemo(() => states.reduce((sum, state) => sum + normalizeJobs(state.jobs).length, 0), [states]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-4 border-b border-border/40">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-foreground">Custom Integrations</h1>
              <Badge variant="outline" className="rounded-[4px] text-[10px] uppercase tracking-widest">
                {totalIntegrations} Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Monitor client-specific CRM and calling workflows, queue health, scheduled retries, and pending analytics.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-[4px] border-border/50"
            onClick={() => refresh(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading custom integrations
          </div>
        ) : states.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="space-y-8 min-w-0">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-[4px] font-mono">{totalJobs} queued jobs</Badge>
                <Badge variant="outline" className="rounded-[4px] font-mono">Polls every 15s</Badge>
              </div>
              {states.map((state) => (
                <IntegrationCard
                  key={state.integration.slug}
                  state={state}
                  selectedJobId={selectedJob?.job_id}
                  onSelectJob={handleSelectJob}
                  onRetryNow={(integration, job) => mutateJob(integration, job, 'retry')}
                  onDeleteJob={(integration, job) => mutateJob(integration, job, 'delete')}
                />
              ))}
            </div>
            <div className="min-w-0">
              <IntegrationJobDrawer
                job={selectedJob}
                loading={detailLoading}
                onClose={() => {
                  setSelectedIntegration(null);
                  setSelectedJob(null);
                }}
              />
              {!selectedIntegration && (
                <PaperCard variant="default" className="hidden xl:block border-dashed">
                  <PaperCardContent className="p-6 text-sm text-muted-foreground">
                    Select a queue row to inspect the original request payload.
                  </PaperCardContent>
                </PaperCard>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
