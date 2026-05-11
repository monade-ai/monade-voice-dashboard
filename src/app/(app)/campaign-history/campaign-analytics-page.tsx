'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { usePostProcessingTemplates } from '@/app/hooks/use-post-processing-templates';
import { campaignApi } from '@/lib/services/campaign-api.service';
import { cn } from '@/lib/utils';
import { parseApiTimestamp } from '@/lib/utils/date';
import {
  Campaign,
  CampaignAnalytics,
  CampaignAnalyticsCallEntry,
  CampaignAnalyticsJobStatus,
  CampaignEnhanceTranscriptsResponse,
  CampaignReanalyzeResponse,
} from '@/types/campaign.types';

type AnalyticsAction = 'reanalyze' | 'enhance' | 'enhance_only';
type Segment = 'all' | 'hot' | 'qualified' | 'connected' | 'not_connected';
type WorkflowStatus = 'idle' | 'running' | 'cancel_requested' | 'success' | 'failed' | 'cancelled';
type WorkflowPhase = 'reanalyze' | 'enhance';

interface WorkflowState {
  status: WorkflowStatus;
  action: AnalyticsAction | null;
  phase?: WorkflowPhase;
  jobId?: string;
  step: string;
  detail: string;
  startedAt: number | null;
  updatedAt: number | null;
  total?: number;
  processed?: number;
  succeeded?: number;
  completed?: number;
  failed?: number;
  skipped?: number;
  progressPercent?: number | null;
  etaSeconds?: number | null;
  cancelable?: boolean;
}

const COLORS = ['#0f766e', '#2563eb', '#65a30d', '#ca8a04', '#b91c1c', '#475569', '#7c3aed', '#0891b2'];
const BLOCKED_STATUSES = new Set(['active', 'pending']);
const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'success', 'completed', 'complete', 'failed', 'error', 'cancelled', 'canceled']);
const CANCELLED_JOB_STATUSES = new Set(['cancelled', 'canceled']);
const FAILED_JOB_STATUSES = new Set(['failed', 'error']);
const POSITIVE_VERDICTS = ['interested', 'likely_to_book', 'qualified', 'success', 'callback', 'booked', 'hot'];
const CALL_RECORDS_PAGE_SIZE = 12;
const JOB_POLL_INTERVAL_MS = 2000;
const ENHANCE_TRANSCRIPT_CONCURRENCY = 4;

const humanize = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const num = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const compact = (value: unknown, digits = 0) => num(value).toLocaleString(undefined, { maximumFractionDigits: digits });
const credits = (value: unknown) => `${compact(value, 2)} cr`;
const secondsElapsed = (startedAt: number | null, now: number) => {
  if (!startedAt) return '0s';
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
};
const etaLabel = (seconds: number | null | undefined) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return 'ETA pending';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  return minutes > 0 ? `~${minutes}m ${remainder}s left` : `~${remainder}s left`;
};
const actionLabel = (action: AnalyticsAction | null) => {
  if (action === 'reanalyze') return 'Reanalyze';
  if (action === 'enhance') return 'Reanalyze + Enhance';
  if (action === 'enhance_only') return 'Enhance Only';

  return 'Workflow';
};
const phaseLabel = (phase?: WorkflowPhase) => {
  if (phase === 'reanalyze') return 'Reanalysis';
  if (phase === 'enhance') return 'Transcript enhancement';

  return 'Workflow';
};
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const pct = (value: unknown) => {
  const n = num(value);
  if (n > 0 && n <= 1) return `${Math.round(n * 100)}%`;

  return `${Math.round(n)}%`;
};
const duration = (value: unknown) => {
  const seconds = num(value);
  if (!seconds) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
};
const dateTime = (value: string | null | undefined) => {
  const timestamp = parseApiTimestamp(value);
  if (timestamp === null) return '--';

  return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
};

const normalizeAnalytics = (payload: CampaignAnalytics | { analytics?: CampaignAnalytics } | null): CampaignAnalytics | null => {
  if (!payload) return null;
  if ('analytics' in payload && payload.analytics && typeof payload.analytics === 'object') {
    return payload.analytics as CampaignAnalytics;
  }

  return payload as CampaignAnalytics;
};

const distribution = (input: unknown) => {
  if (!input) return [] as Array<{ name: string; value: number }>;
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        const name = String(record.name ?? record.label ?? record.key ?? record.status ?? record.verdict ?? record.bucket ?? 'Unknown');
        const value = num(record.value ?? record.count ?? record.calls ?? record.total ?? record.total_calls);

        return { name: humanize(name), value };
      })
      .filter((item) => item.value > 0);
  }
  if (typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>)
      .map(([name, value]) => ({ name: humanize(name), value: num(value) }))
      .filter((item) => item.value > 0);
  }

  return [];
};

const timeline = (input: unknown) => Array.isArray(input)
  ? input.map((item) => {
    const record = item as Record<string, unknown>;
    const date = String(record.date ?? record.day ?? record.campaign_analytics_date ?? '');

    return {
      date: date ? date.slice(5) : 'Day',
      calls: num(record.calls ?? record.total_calls),
      connected: num(record.connected ?? record.connected_calls),
      qualified: num(record.qualified ?? record.qualified_calls),
    };
  })
  : [];

const hourOfDay = (input: unknown) => Array.isArray(input)
  ? input.map((item) => {
    const record = item as Record<string, unknown>;
    const hour = num(record.hour);

    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      calls: num(record.calls),
      connected: num(record.connected),
      qualified: num(record.qualified),
    };
  })
  : [];

const durationVsQualification = (input: unknown) => Array.isArray(input)
  ? input.map((item) => {
    const record = item as Record<string, unknown>;

    return {
      name: humanize(String(record.bucket ?? record.duration_bucket ?? record.label ?? 'Bucket')),
      calls: num(record.calls ?? record.total),
      qualified: num(record.qualified ?? record.qualified_calls),
    };
  })
  : distribution(input).map((item) => ({ name: item.name, calls: item.value, qualified: 0 }));

const callTime = (entry: CampaignAnalyticsCallEntry) => entry.call_started_at || entry.created_at || null;
const connected = (entry: CampaignAnalyticsCallEntry) => {
  if (typeof entry.connected === 'boolean') return entry.connected;
  const status = String(entry.provider_status ?? '').toLowerCase();

  return ['answered', 'completed', 'connected', 'picked_up'].some((token) => status.includes(token));
};
const hotLead = (entry: CampaignAnalyticsCallEntry) => {
  const verdict = String(entry.verdict ?? '').toLowerCase();

  return POSITIVE_VERDICTS.some((token) => verdict.includes(token)) && num(entry.confidence_score) >= 55;
};
const enhanceErrors = (response: CampaignEnhanceTranscriptsResponse | null) => {
  if (!response) return [];
  const direct = Array.isArray(response.errors) ? response.errors : [];
  const fromResults = Array.isArray(response.results)
    ? response.results.filter((item) => item.error).map((item) => ({ call_id: item.call_id, error: item.error }))
    : [];

  return [...direct, ...fromResults];
};
const jobStatus = (job: CampaignAnalyticsJobStatus | null | undefined) => String(job?.status ?? '').toLowerCase();
const jobProcessed = (job: CampaignAnalyticsJobStatus | null | undefined) => num(job?.processed_calls ?? job?.completed_calls ?? job?.calls_kicked_off);
const jobFailed = (job: CampaignAnalyticsJobStatus | null | undefined) => num(job?.failed_calls ?? job?.calls_failed);
const jobTotal = (job: CampaignAnalyticsJobStatus | null | undefined) => num(job?.total_calls);
const jobProgressPercent = (job: CampaignAnalyticsJobStatus | null | undefined) => {
  const explicit = job?.progress_percent ?? job?.progress;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit > 0 && explicit <= 1 ? Math.round(explicit * 100) : Math.round(explicit);
  }
  const total = jobTotal(job);
  if (total > 0) return Math.round((jobProcessed(job) / total) * 100);

  return null;
};
const jobToWorkflow = (
  action: AnalyticsAction,
  phase: WorkflowPhase,
  job: CampaignAnalyticsJobStatus,
  startedAt: number | null,
): WorkflowState => {
  const status = jobStatus(job);
  const failed = jobFailed(job);
  const isCancelled = CANCELLED_JOB_STATUSES.has(status);
  const isFailed = FAILED_JOB_STATUSES.has(status);
  const isTerminal = TERMINAL_JOB_STATUSES.has(status);

  return {
    status: isCancelled ? 'cancelled' : isFailed ? 'failed' : isTerminal ? 'success' : status === 'cancel_requested' ? 'cancel_requested' : 'running',
    action,
    phase,
    jobId: job.job_id,
    step: String(job.current_step ?? job.step ?? phaseLabel(phase)),
    detail: String(job.message ?? `${phaseLabel(phase)} ${status || 'is running'}.`),
    startedAt,
    updatedAt: Date.now(),
    total: jobTotal(job),
    processed: jobProcessed(job),
    succeeded: num(job.succeeded_calls),
    completed: jobProcessed(job),
    failed,
    skipped: num(job.skipped_calls),
    progressPercent: jobProgressPercent(job),
    etaSeconds: typeof job.eta_seconds === 'number' ? job.eta_seconds : null,
    cancelable: job.cancelable !== false && !isTerminal,
  };
};

function MiniStat({
  label,
  value,
  subtext,
  accent = 'border-border/40',
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: string;
}) {
  return (
    <PaperCard className={cn('bg-muted/5', accent)}>
      <PaperCardContent className="p-4">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="mt-2 text-2xl font-mono font-bold tracking-tight text-foreground">{value}</p>
        {subtext && <p className="mt-1 text-[11px] text-muted-foreground">{subtext}</p>}
      </PaperCardContent>
    </PaperCard>
  );
}

function ChartPanel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <PaperCard className={cn('bg-muted/5 border-border/40', className)}>
      <PaperCardHeader className="p-5 pb-2">
        <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">{title}</PaperCardTitle>
      </PaperCardHeader>
      <PaperCardContent className="p-5 pt-2 h-[260px]">{children}</PaperCardContent>
    </PaperCard>
  );
}

function WorkflowStep({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-md border border-border/30 bg-background p-3">
      <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-md">
      No data returned for this chart yet.
    </div>
  );
}

function DistributionBar({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis dataKey="name" type="category" width={98} tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
          {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DistributionPie({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={2}>
          {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function CampaignAnalyticsPage() {
  const { userUid, loading: userLoading } = useMonadeUser();
  const { templates, activeTemplateId, fetchTemplates } = usePostProcessingTemplates();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [action, setAction] = useState<AnalyticsAction | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [runningAction, setRunningAction] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowState>({
    status: 'idle',
    action: null,
    step: 'Idle',
    detail: 'No analytics workflow is running.',
    startedAt: null,
    updatedAt: null,
  });
  const [clockNow, setClockNow] = useState(Date.now());
  const activeJobRef = useRef<{ campaignId: string; jobId: string } | null>(null);
  const cancelRequestedRef = useRef(false);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [reanalyzeResult, setReanalyzeResult] = useState<CampaignReanalyzeResponse | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<CampaignEnhanceTranscriptsResponse | null>(null);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const loadCampaigns = useCallback(async () => {
    if (!userUid) return;
    setLoadingCampaigns(true);
    try {
      const list = await campaignApi.list(userUid);
      const ordered = [...list].sort((a, b) => (parseApiTimestamp(b.created_at) ?? 0) - (parseApiTimestamp(a.created_at) ?? 0));
      setCampaigns(ordered);
      setSelectedCampaignId((current) => current || ordered[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  }, [userUid]);

  const loadAnalytics = useCallback(async (campaignId: string, showToast = false) => {
    if (!userUid || !campaignId) return;
    setLoadingAnalytics(true);
    try {
      const payload = await campaignApi.getAnalytics(campaignId, userUid, {
        includeCalls: true,
        callLimit: 100,
        callOffset: 0,
      });
      setAnalytics(normalizeAnalytics(payload));
      if (showToast) toast.success('Campaign analytics refreshed');
    } catch (error) {
      setAnalytics(null);
      toast.error(error instanceof Error ? error.message : 'Could not load campaign analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [userUid]);

  useEffect(() => {
    if (userLoading) return;
    void loadCampaigns();
    void fetchTemplates().catch(() => undefined);
  }, [fetchTemplates, loadCampaigns, userLoading]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    void loadAnalytics(selectedCampaignId);
  }, [loadAnalytics, selectedCampaignId]);

  useEffect(() => {
    setTemplateId(activeTemplateId || templates[0]?.id || '');
  }, [activeTemplateId, templates]);

  useEffect(() => {
    if (!runningAction) return undefined;
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [runningAction]);

  const overview = analytics?.overview ?? {};
  const diagrams = analytics?.diagrams ?? {};
  const entries = useMemo(() => analytics?.call_entries?.entries ?? [], [analytics]);
  const blocked = selectedCampaign ? BLOCKED_STATUSES.has(selectedCampaign.status) : true;
  const hotLeads = useMemo(() => entries.filter(hotLead), [entries]);
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (segment === 'hot' && !hotLead(entry)) return false;
      if (segment === 'qualified' && !POSITIVE_VERDICTS.some((token) => String(entry.verdict ?? '').toLowerCase().includes(token))) return false;
      if (segment === 'connected' && !connected(entry)) return false;
      if (segment === 'not_connected' && connected(entry)) return false;
      if (!q) return true;

      return [entry.phone_number, entry.call_id, entry.verdict, entry.provider_status, entry.template_name, entry.use_case]
        .some((value) => String(value ?? '').toLowerCase().includes(q));
    });
  }, [entries, search, segment]);
  const totalRecordPages = Math.max(1, Math.ceil(filteredEntries.length / CALL_RECORDS_PAGE_SIZE));
  const effectiveRecordsPage = Math.min(recordsPage, totalRecordPages);
  const workflowProgress = workflow.progressPercent ?? (workflow.total ? Math.round((num(workflow.processed) / workflow.total) * 100) : null);
  const workflowProgressWidth = `${Math.min(100, Math.max(0, workflowProgress ?? (runningAction ? 18 : 0)))}%`;
  const paginatedEntries = useMemo(() => {
    const start = (effectiveRecordsPage - 1) * CALL_RECORDS_PAGE_SIZE;

    return filteredEntries.slice(start, start + CALL_RECORDS_PAGE_SIZE);
  }, [effectiveRecordsPage, filteredEntries]);

  const openAction = (nextAction: AnalyticsAction) => {
    if (!selectedCampaign) return;
    if (BLOCKED_STATUSES.has(selectedCampaign.status)) {
      toast.error('Analytics actions are disabled while a campaign is active or pending.');

      return;
    }
    setAction(nextAction);
    setReanalyzeResult(null);
    setEnhanceResult(null);
  };

  const pollJobUntilTerminal = useCallback(async (
    campaignId: string,
    jobId: string,
    currentAction: AnalyticsAction,
    phase: WorkflowPhase,
    startedAt: number,
  ) => {
    activeJobRef.current = { campaignId, jobId };

    while (true) {
      const job = await campaignApi.getAnalyticsJob(campaignId, userUid!, jobId);
      const nextWorkflow = jobToWorkflow(currentAction, phase, job, startedAt);
      setWorkflow(nextWorkflow);

      const status = jobStatus(job);
      if (TERMINAL_JOB_STATUSES.has(status)) {
        activeJobRef.current = null;
        if (CANCELLED_JOB_STATUSES.has(status)) {
          throw new Error(`${phaseLabel(phase)} was cancelled.`);
        }
        if (FAILED_JOB_STATUSES.has(status)) {
          throw new Error(String(job.message ?? `${phaseLabel(phase)} failed.`));
        }

        return job;
      }

      await sleep(JOB_POLL_INTERVAL_MS);
    }
  }, [userUid]);

  const startJob = async (
    campaignId: string,
    currentAction: AnalyticsAction,
    phase: WorkflowPhase,
    jobId: string | undefined,
    fallback: CampaignReanalyzeResponse | CampaignEnhanceTranscriptsResponse,
    startedAt: number,
  ) => {
    if (!jobId) {
      const fallbackRecord = fallback as Record<string, unknown>;
      setWorkflow((current) => ({
        ...current,
        status: 'success',
        phase,
        step: `${phaseLabel(phase)} finished`,
        detail: String(fallback.message ?? 'Backend returned a synchronous summary.'),
        completed: num(fallbackRecord.processed_calls ?? fallbackRecord.calls_kicked_off ?? fallbackRecord.kicked_off ?? fallbackRecord.total_calls),
        failed: num(fallbackRecord.failed_calls ?? fallbackRecord.calls_failed),
        updatedAt: Date.now(),
      }));

      return fallback as CampaignAnalyticsJobStatus;
    }

    setWorkflow((current) => ({
      ...current,
      phase,
      jobId,
      step: `${phaseLabel(phase)} queued`,
      detail: `Job ${jobId} accepted. Polling backend progress every ${JOB_POLL_INTERVAL_MS / 1000}s.`,
      updatedAt: Date.now(),
    }));

    return pollJobUntilTerminal(campaignId, jobId, currentAction, phase, startedAt);
  };

  const cancelWorkflow = async () => {
    if (!userUid || !activeJobRef.current) return;
    cancelRequestedRef.current = true;
    const { campaignId, jobId } = activeJobRef.current;
    setWorkflow((current) => ({
      ...current,
      status: 'cancel_requested',
      step: 'Cancel requested',
      detail: 'Asking the backend to stop this job. In-flight calls may finish before it settles.',
      cancelable: false,
      updatedAt: Date.now(),
    }));

    try {
      const job = await campaignApi.cancelAnalyticsJob(campaignId, userUid, jobId);
      setWorkflow((current) => ({
        ...jobToWorkflow(current.action ?? 'reanalyze', current.phase ?? 'reanalyze', job, current.startedAt),
        action: current.action,
        phase: current.phase,
        status: jobStatus(job) === 'cancel_requested'
          ? 'cancel_requested'
          : jobToWorkflow(current.action ?? 'reanalyze', current.phase ?? 'reanalyze', job, current.startedAt).status,
        detail: String(job.message ?? 'Cancel request sent. Waiting for the backend to finish settling the job.'),
        cancelable: false,
      }));
      toast.info('Cancel request sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel job');
    }
  };

  const runAction = async () => {
    if (!selectedCampaign || !userUid || !action) return;
    if (action !== 'enhance_only' && !templateId) {
      toast.error('Select a post-processing template first.');

      return;
    }

    const startedAt = Date.now();
    cancelRequestedRef.current = false;
    setRunningAction(true);
    setClockNow(Date.now());
    setWorkflow({
      status: 'running',
      action,
      step: action === 'enhance_only' ? 'Starting transcript enhancement' : 'Starting reanalysis',
      detail: 'Starting a backend analytics job with real progress tracking.',
      startedAt,
      updatedAt: startedAt,
    });
    try {
      if (action === 'enhance_only') {
        setWorkflow((current) => ({
          ...current,
          step: 'Enhancing transcripts',
          detail: 'Backfilling enhanced transcripts. Returned counts will appear when the backend responds.',
          updatedAt: Date.now(),
        }));
        const enhanced = await campaignApi.enhanceTranscripts(
          selectedCampaign.id,
          userUid,
          { concurrency: ENHANCE_TRANSCRIPT_CONCURRENCY, async_job: true },
        );
        setEnhanceResult(enhanced);
        const finalJob = await startJob(selectedCampaign.id, action, 'enhance', enhanced.job_id, enhanced, startedAt);
        setEnhanceResult({ ...enhanced, ...finalJob });
        await loadAnalytics(selectedCampaign.id, true);
      } else {
        setWorkflow((current) => ({
          ...current,
          step: 'Reanalyzing call entries',
          detail: 'Updating stored analytics for existing campaign calls. Returned counts will appear when the backend responds.',
          updatedAt: Date.now(),
        }));
        const reanalyze = await campaignApi.reanalyze(
          selectedCampaign.id,
          userUid,
          {
            template_id: templateId,
            commit: true,
            concurrency: 5,
            async_job: true,
          },
        );
        setReanalyzeResult(reanalyze);
        const finalReanalysis = await startJob(selectedCampaign.id, action, 'reanalyze', reanalyze.job_id, reanalyze, startedAt);
        setReanalyzeResult({ ...reanalyze, ...finalReanalysis });
        await loadAnalytics(selectedCampaign.id, true);

        if (action === 'enhance') {
          setWorkflow((current) => ({
            ...current,
            step: 'Enhancing transcripts',
            detail: 'Reanalysis is done. Now backfilling enhanced transcripts from recordings.',
            updatedAt: Date.now(),
          }));
          const enhanced = await campaignApi.enhanceTranscripts(
            selectedCampaign.id,
            userUid,
            { concurrency: ENHANCE_TRANSCRIPT_CONCURRENCY, async_job: true },
          );
          setEnhanceResult(enhanced);
          const finalEnhancement = await startJob(selectedCampaign.id, action, 'enhance', enhanced.job_id, enhanced, startedAt);
          setEnhanceResult({ ...enhanced, ...finalEnhancement });
          await loadAnalytics(selectedCampaign.id, true);
        } else {
          setWorkflow((current) => ({
            ...current,
            status: 'success',
            updatedAt: Date.now(),
          }));
        }
      }

      toast.success('Campaign analytics workflow completed');
      setAction(null);
    } catch (error) {
      if (cancelRequestedRef.current) {
        setWorkflow((current) => ({
          ...current,
          status: 'cancelled',
          step: 'Workflow cancelled',
          detail: error instanceof Error ? error.message : 'The backend cancelled this workflow.',
          updatedAt: Date.now(),
        }));
        toast.info('Workflow cancelled');
      } else {
        setWorkflow((current) => ({
          ...current,
          status: 'failed',
          step: 'Workflow failed',
          detail: error instanceof Error ? error.message : 'Campaign analytics workflow failed.',
          updatedAt: Date.now(),
        }));
        toast.error(error instanceof Error ? error.message : 'Campaign analytics workflow failed');
      }
    } finally {
      activeJobRef.current = null;
      setRunningAction(false);
    }
  };

  const cards = [
    { label: 'Calls', value: compact(overview.total_call_attempts ?? analytics?.total_calls), subtext: `${compact(overview.attempted_contacts)} attempted contacts`, accent: 'border-slate-500/20' },
    { label: 'Pickup Rate', value: pct(overview.pickup_rate), subtext: `${compact(overview.connected_contacts)} connected`, accent: 'border-teal-600/25' },
    { label: 'Qualification', value: pct(overview.qualification_rate), subtext: `${hotLeads.length} hot leads`, accent: 'border-emerald-600/25' },
    { label: 'Credits Used', value: credits(overview.total_credits_used), subtext: `${credits(overview.credits_per_connected_call)} / connected`, accent: 'border-amber-600/25' },
  ];
  const chartData = {
    funnel: distribution(diagrams.connectivity_funnel),
    qualification: distribution(diagrams.qualification_distribution),
    quality: distribution(diagrams.call_quality_distribution),
    provider: distribution(diagrams.provider_status_distribution),
    confidence: distribution(diagrams.confidence_score_distribution),
    timeline: timeline(diagrams.timeline),
    hours: hourOfDay(diagrams.hour_of_day),
    duration: durationVsQualification(diagrams.duration_vs_qualification),
    dropOff: distribution(diagrams.drop_off_pattern),
    outcome: distribution(diagrams.outcome_flowchart),
  };
  const errors = enhanceErrors(enhanceResult);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-5 border-b border-border/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 size={18} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Campaign Analytics</span>
            </div>
            <h1 className="text-4xl font-medium tracking-tighter text-foreground">Campaign Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Analyze completed campaign performance, optionally reprocess stored call analytics, and review hot leads.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[420px]">
            <select
              value={selectedCampaignId}
              onChange={(event) => {
                setSelectedCampaignId(event.target.value);
                setRecordsPage(1);
                setRecordsOpen(false);
              }}
              className="h-10 w-full rounded-md border border-border/40 bg-background px-3 text-sm"
              disabled={loadingCampaigns}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedCampaignId && loadAnalytics(selectedCampaignId, true)}
                disabled={!selectedCampaignId || loadingAnalytics}
                className="h-9 gap-2 text-[10px] uppercase tracking-widest"
              >
                {loadingAnalytics ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Analyze
              </Button>
              <Button variant="outline" size="sm" onClick={() => openAction('reanalyze')} disabled={blocked} className="h-9 gap-2 text-[10px] uppercase tracking-widest">
                <Brain size={14} />
                Reanalyze
              </Button>
              <Button variant="outline" size="sm" onClick={() => openAction('enhance_only')} disabled={blocked} className="h-9 gap-2 text-[10px] uppercase tracking-widest">
                <Zap size={14} />
                Enhance Only
              </Button>
              <Button size="sm" onClick={() => openAction('enhance')} disabled={blocked} className="h-9 gap-2 text-[10px] uppercase tracking-widest">
                <Sparkles size={14} />
                Reanalyze + Enhance
              </Button>
            </div>
            <div className="grid gap-2 rounded-md border border-border/30 bg-muted/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <p><span className="font-semibold text-foreground">Analyze:</span> refreshes this dashboard only. No stored call analytics are changed.</p>
              <p><span className="font-semibold text-foreground">Reanalyze:</span> asks for a template, then updates stored analytics for existing campaign calls.</p>
              <p><span className="font-semibold text-foreground">Enhance Only:</span> backfills enhanced transcripts from recordings at concurrency {ENHANCE_TRANSCRIPT_CONCURRENCY}. It does not reprocess qualification analytics.</p>
              <p><span className="font-semibold text-foreground">Reanalyze + Enhance:</span> updates analytics first, then starts enhanced transcript backfill.</p>
            </div>
            {selectedCampaign && blocked && <p className="text-[11px] text-muted-foreground">Analytics actions are unavailable while this campaign is {selectedCampaign.status}.</p>}
          </div>
        </div>

        {loadingCampaigns || userLoading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin text-primary" />
            <p className="text-[10px] uppercase tracking-widest font-bold">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <PaperCard className="border-border/40">
            <PaperCardContent className="p-16 text-center">
              <p className="font-medium">No campaigns found.</p>
              <p className="mt-1 text-sm text-muted-foreground">Run a campaign first, then analyze it here.</p>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <>
            {workflow.status !== 'idle' && (
              <PaperCard className={cn(
                'border-border/40 bg-muted/5',
                workflow.status === 'failed' && 'border-destructive/25 bg-destructive/5',
                workflow.status === 'cancelled' && 'border-amber-600/25 bg-amber-500/[0.03]',
                workflow.status === 'success' && 'border-emerald-600/25 bg-emerald-500/[0.03]',
              )}>
                <PaperCardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                          {actionLabel(workflow.action)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] uppercase tracking-widest',
                            workflow.status === 'running' && 'border-primary/25 text-primary',
                            workflow.status === 'cancel_requested' && 'border-amber-600/25 text-amber-700',
                            workflow.status === 'success' && 'border-emerald-600/25 text-emerald-700',
                            workflow.status === 'failed' && 'border-destructive/25 text-destructive',
                          )}
                        >
                          {humanize(workflow.status)}
                        </Badge>
                        {workflow.jobId && <span className="text-[10px] font-mono text-muted-foreground">job {workflow.jobId}</span>}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold tracking-tight">{workflow.step}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{workflow.detail}</p>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            workflow.status === 'failed' ? 'bg-destructive' : workflow.status === 'success' ? 'bg-emerald-600' : 'bg-primary',
                            workflowProgress === null && runningAction && 'animate-pulse',
                          )}
                          style={{ width: workflowProgressWidth }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                      <div className="rounded-md border border-border/30 bg-background p-3">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Progress</p>
                        <p className="mt-1 text-sm font-mono font-bold">
                          {workflowProgress === null ? '--' : `${workflowProgress}%`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {compact(workflow.processed)} / {workflow.total ? compact(workflow.total) : '--'}
                        </p>
                      </div>
                      <div className="rounded-md border border-border/30 bg-background p-3">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Failed</p>
                        <p className="mt-1 text-sm font-mono font-bold">{compact(workflow.failed)}</p>
                        <p className="text-[10px] text-muted-foreground">{compact(workflow.skipped)} skipped</p>
                      </div>
                      <div className="rounded-md border border-border/30 bg-background p-3">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Elapsed</p>
                        <p className="mt-1 text-sm font-mono font-bold">{secondsElapsed(workflow.startedAt, clockNow)}</p>
                        <p className="text-[10px] text-muted-foreground">{etaLabel(workflow.etaSeconds)}</p>
                      </div>
                      <div className="rounded-md border border-border/30 bg-background p-3">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Control</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelWorkflow}
                          disabled={!runningAction || !workflow.jobId || workflow.cancelable === false || workflow.status === 'cancel_requested'}
                          className="mt-2 h-8 w-full text-[10px] uppercase tracking-widest"
                        >
                          {workflow.status === 'cancel_requested' ? 'Stopping' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </PaperCardContent>
              </PaperCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
              <PaperCard className="border-border/40 bg-muted/5">
                <PaperCardHeader className="p-5 pb-2">
                  <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Operator Flow</PaperCardTitle>
                </PaperCardHeader>
                <PaperCardContent className="p-5 pt-2 grid gap-3 md:grid-cols-3">
                  <WorkflowStep
                    label="Step 1"
                    title="Analyze"
                    detail="Read-only refresh of campaign overview, charts, billing, and lead segments."
                  />
                  <WorkflowStep
                    label="Step 2"
                    title="Optional reanalysis"
                    detail="Pick a template and update stored analytics for existing calls."
                  />
                  <WorkflowStep
                    label="Step 3"
                    title="Optional enhancement"
                    detail="Heavier transcript enhancement pass using recordings and Gemini."
                  />
                </PaperCardContent>
              </PaperCard>

              <PaperCard className="border-amber-600/25 bg-amber-500/[0.03]">
                <PaperCardHeader className="p-5 pb-2">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign size={16} className="text-amber-600" />
                    <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Billing Credits</PaperCardTitle>
                  </div>
                </PaperCardHeader>
                <PaperCardContent className="p-5 pt-2 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Total</p>
                    <p className="mt-2 text-2xl font-mono font-bold">{credits(overview.total_credits_used)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Connected</p>
                    <p className="mt-2 text-2xl font-mono font-bold">{credits(overview.credits_per_connected_call)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Qualified</p>
                    <p className="mt-2 text-2xl font-mono font-bold">{credits(overview.credits_per_qualified_lead)}</p>
                  </div>
                </PaperCardContent>
              </PaperCard>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card) => <MiniStat key={card.label} {...card} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
              <ChartPanel title="Connectivity Funnel"><DistributionBar data={chartData.funnel} /></ChartPanel>
              <PaperCard className="bg-muted/5 border-border/40">
                <PaperCardHeader className="p-5 pb-2">
                  <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Run Summary</PaperCardTitle>
                </PaperCardHeader>
                <PaperCardContent className="p-5 pt-2 space-y-4">
                  <div className="rounded-md border border-border/30 bg-background p-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Analytics Run Time</p>
                    <p className="mt-1 text-sm font-medium">{dateTime(analytics?.summary?.generated_at)}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Call dates use call_started_at first, then created_at. Reanalysis update times are not shown as call times.
                    </p>
                  </div>
                  <div className="rounded-md border border-border/30 bg-background p-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Hot Leads Segment</p>
                    <p className="mt-1 text-3xl font-mono font-bold">{hotLeads.length}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Positive verdicts with usable confidence from this campaign.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-muted/20 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Avg Duration</p>
                      <p className="mt-1 text-sm font-mono font-bold">{duration(overview.avg_call_duration_seconds)}</p>
                    </div>
                    <div className="rounded-md bg-muted/20 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Confidence</p>
                      <p className="mt-1 text-sm font-mono font-bold">{pct(overview.avg_confidence_score)}</p>
                    </div>
                    <div className="rounded-md bg-muted/20 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Enhanced</p>
                      <p className="mt-1 text-sm font-mono font-bold">{pct(overview.enhanced_transcript_coverage)}</p>
                    </div>
                  </div>
                </PaperCardContent>
              </PaperCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartPanel title="Qualification"><DistributionPie data={chartData.qualification} /></ChartPanel>
              <ChartPanel title="Call Quality"><DistributionBar data={chartData.quality} /></ChartPanel>
              <ChartPanel title="Provider Status"><DistributionBar data={chartData.provider} /></ChartPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartPanel title="Confidence Buckets"><DistributionBar data={chartData.confidence} /></ChartPanel>
              <ChartPanel title="Daily Timeline">
                {chartData.timeline.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip />
                      <Area type="monotone" dataKey="calls" stroke="#475569" fill="#475569" fillOpacity={0.10} />
                      <Area type="monotone" dataKey="connected" stroke="#0f766e" fill="#0f766e" fillOpacity={0.12} />
                      <Area type="monotone" dataKey="qualified" stroke="#65a30d" fill="#65a30d" fillOpacity={0.12} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartPanel title="Hour Of Day">
                {chartData.hours.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.hours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#475569" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="connected" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="qualified" fill="#65a30d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
              <ChartPanel title="Duration Vs Qualification">
                {chartData.duration.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.duration}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#475569" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="qualified" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartPanel title="Drop-Off Pattern"><DistributionBar data={chartData.dropOff} /></ChartPanel>
              <ChartPanel title="Outcome Flow"><DistributionBar data={chartData.outcome} /></ChartPanel>
            </div>

            {(reanalyzeResult || enhanceResult) && (
              <PaperCard className="bg-muted/5 border-border/40">
                <PaperCardHeader className="p-5 pb-2">
                  <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Last Workflow Result</PaperCardTitle>
                </PaperCardHeader>
                <PaperCardContent className="p-5 pt-2 grid gap-4 md:grid-cols-4">
                  {reanalyzeResult && <MiniStat label="Reprocessed" value={compact(reanalyzeResult.processed_calls ?? reanalyzeResult.total_calls)} />}
                  {reanalyzeResult && <MiniStat label="Reanalysis Failed" value={compact(reanalyzeResult.failed_calls)} />}
                  {enhanceResult && <MiniStat label="Enhance Kicked Off" value={compact(enhanceResult.calls_kicked_off ?? enhanceResult.kicked_off)} />}
                  {enhanceResult && <MiniStat label="Enhance Failed" value={compact(enhanceResult.calls_failed ?? enhanceResult.failed_calls)} />}
                  {errors.length > 0 && (
                    <div className="md:col-span-4 rounded-md border border-destructive/20 bg-destructive/5 p-4">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-destructive">Per-call enhancement errors</p>
                      <div className="mt-3 grid gap-2">
                        {errors.slice(0, 8).map((error, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            <span className="font-mono text-foreground">{error.call_id || 'call'}</span>: {error.error || 'Unknown error'}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </PaperCardContent>
              </PaperCard>
            )}

            <PaperCard className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Lead Segment</PaperCardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">A short preview of qualified or high-intent leads from this campaign.</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-emerald-600/25 text-emerald-600">
                    {hotLeads.length} hot
                  </Badge>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="px-5 pb-5">
                {hotLeads.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/40 p-8 text-center">
                    <Target className="mx-auto mb-3 text-muted-foreground" size={18} />
                    <p className="text-sm font-medium">No hot leads detected in this campaign.</p>
                    <p className="mt-1 text-xs text-muted-foreground">You can still inspect all call records when needed.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {hotLeads.slice(0, 6).map((lead, index) => (
                      <div key={lead.call_id || index} className="rounded-md border border-border/30 bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-semibold">{lead.phone_number || '--'}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{dateTime(callTime(lead))}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-emerald-600/25">
                            {lead.confidence_score ?? '--'}%
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs font-medium">{humanize(String(lead.verdict || 'Qualified'))}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {lead.template_name || lead.use_case || lead.call_quality || 'Review call details for next action.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>

            <PaperCard className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-5 pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Call Entries</PaperCardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Kept collapsed by default. Open this only when you need row-level investigation.
                    </p>
                  </div>
                  <Button
                    variant={recordsOpen ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRecordsOpen((open) => !open)}
                    className="h-9 gap-2 text-[10px] uppercase tracking-widest"
                  >
                    <Eye size={14} />
                    {recordsOpen ? 'Hide Records' : `Show Records (${entries.length})`}
                  </Button>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="px-5 pb-5">
                {entries.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-border/40 rounded-md">
                    <Phone className="mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium">No call entries returned.</p>
                    <p className="mt-1 text-xs text-muted-foreground">The headline analytics can still render without call_entries.</p>
                  </div>
                ) : !recordsOpen ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-md border border-border/30 bg-background p-4">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Returned</p>
                      <p className="mt-2 text-2xl font-mono font-bold">{entries.length}</p>
                    </div>
                    <div className="rounded-md border border-border/30 bg-background p-4">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Connected</p>
                      <p className="mt-2 text-2xl font-mono font-bold">{entries.filter(connected).length}</p>
                    </div>
                    <div className="rounded-md border border-border/30 bg-background p-4">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Qualified</p>
                      <p className="mt-2 text-2xl font-mono font-bold">{entries.filter((entry) => POSITIVE_VERDICTS.some((token) => String(entry.verdict ?? '').toLowerCase().includes(token))).length}</p>
                    </div>
                    <div className="rounded-md border border-border/30 bg-background p-4">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Hot Leads</p>
                      <p className="mt-2 text-2xl font-mono font-bold">{hotLeads.length}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={search}
                            onChange={(event) => {
                              setSearch(event.target.value);
                              setRecordsPage(1);
                            }}
                            placeholder="Search calls..."
                            className="h-9 pl-9 text-xs"
                          />
                        </div>
                        <select
                          value={segment}
                          onChange={(event) => {
                            setSegment(event.target.value as Segment);
                            setRecordsPage(1);
                          }}
                          className="h-9 rounded-md border border-border/40 bg-background px-3 text-xs"
                        >
                          <option value="all">All calls</option>
                          <option value="hot">Hot leads</option>
                          <option value="qualified">Qualified</option>
                          <option value="connected">Connected</option>
                          <option value="not_connected">Not connected</option>
                        </select>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {filteredEntries.length} matching records
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-md border border-border/20">
                      <table className="w-full min-w-[980px] text-left">
                        <thead className="bg-muted/10">
                          <tr className="border-b border-border/30">
                            {['Lead', 'Call Time', 'Status', 'Verdict', 'Confidence', 'Quality', 'Duration', 'Template', 'Credits'].map((heading) => (
                              <th key={heading} className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedEntries.map((entry, index) => (
                            <tr key={entry.call_id || index} className="border-b border-border/10 hover:bg-muted/10">
                              <td className="py-3 pr-3 pl-3">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-mono font-semibold">{entry.phone_number || '--'}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{entry.call_id || '--'}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">{dateTime(callTime(entry))}</td>
                              <td className="py-3 pr-3">
                                <Badge variant="outline" className="text-[9px] uppercase tracking-widest">{entry.provider_status || (connected(entry) ? 'connected' : 'unknown')}</Badge>
                              </td>
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-2">
                                  {hotLead(entry) ? <Target size={13} className="text-emerald-600" /> : null}
                                  <span className="text-xs font-medium">{humanize(String(entry.verdict || 'unknown'))}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-xs font-mono">{entry.confidence_score ?? '--'}%</td>
                              <td className="py-3 pr-3 text-xs">{humanize(String(entry.call_quality || '--'))}</td>
                              <td className="py-3 pr-3 text-xs font-mono">{duration(entry.duration_seconds)}</td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{entry.template_name || entry.use_case || '--'}</td>
                              <td className="py-3 pr-3 text-xs font-mono">{entry.billing_data?.credits_used ?? '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Page {effectiveRecordsPage} of {totalRecordPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordsPage((page) => Math.max(1, page - 1))}
                          disabled={effectiveRecordsPage === 1}
                          className="h-8 w-8 p-0"
                          aria-label="Previous call records page"
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordsPage((page) => Math.min(totalRecordPages, page + 1))}
                          disabled={effectiveRecordsPage === totalRecordPages}
                          className="h-8 w-8 p-0"
                          aria-label="Next call records page"
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>
          </>
        )}
      </main>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && !runningAction && setAction(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {action === 'enhance_only'
                ? 'Enhance transcripts only'
                : action === 'enhance'
                  ? 'Re-analyze and enhance transcripts'
                  : 'Re-analyze campaign entries'}
            </DialogTitle>
            <DialogDescription>
              {action === 'enhance_only'
                ? 'Starts enhanced transcript generation for campaign calls that still need it. Stored analytics are not reprocessed.'
                : 'Reanalysis updates stored analytics for existing calls while preserving original call dates. Transcript enhancement is heavier and uses recordings with Gemini.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border/40 bg-muted/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {action === 'enhance_only' ? 'Recording-backed transcript workflow' : 'Optional mutating workflow'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {action === 'enhance_only'
                      ? 'This does not change qualification analytics. It asks the backend to backfill enhanced transcripts and reports per-call failures.'
                      : 'The backend will commit analytics changes for processed calls. Existing call dates stay unchanged.'}
                  </p>
                </div>
              </div>
            </div>
            {action !== 'enhance_only' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Post-processing template</label>
                <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="h-10 w-full rounded-md border border-border/40 bg-background px-3 text-sm">
                  <option value="">Select template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}{template.id === activeTemplateId ? ' · active' : ''}</option>
                  ))}
                </select>
              </div>
            )}
            {(action === 'enhance' || action === 'enhance_only') && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Zap size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Enhanced transcript backfill</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {action === 'enhance_only'
                        ? `This starts transcript enhancement at concurrency ${ENHANCE_TRANSCRIPT_CONCURRENCY} and reports kicked-off, failed, and per-call errors.`
                        : `After reanalysis, this starts transcript enhancement at concurrency ${ENHANCE_TRANSCRIPT_CONCURRENCY} and reports kicked-off, failed, and per-call errors.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={runningAction} onClick={() => setAction(null)}>Close</Button>
            <Button disabled={runningAction} onClick={runAction} className="gap-2">
              {runningAction ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {runningAction ? 'Running job' : 'Run workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
