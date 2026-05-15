'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Download,
  Bot,
  Brain,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import { campaignApi } from '@/lib/services/campaign-api.service';
import { downloadCSV, generateCSV, loadCSVPreview } from '@/lib/utils/csv-preview';
import {
  buildClientCampaignExport,
  CampaignAnalyticsExportRecord,
  CampaignCallAttemptExportRow,
} from '@/lib/utils/campaign-client-export';
import { fetchJson } from '@/lib/http';
import {
  Campaign,
  CampaignStatus,
  CampaignContact,
  CampaignContactStatus,
  CampaignRecordingStatus,
  CSVPreviewCache,
  CAMPAIGN_API_CONFIG,
  canStartCampaign,
  canPauseCampaign,
  canStopCampaign,
  getCampaignProgress,
} from '@/types/campaign.types';
import { cn } from '@/lib/utils';
import { formatInTimeZone, getNextOccurrenceUtcIso, parseApiTimestamp } from '@/lib/utils/date';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useLibrary } from '@/app/hooks/use-knowledge-base';
import { resolveCallDirection } from '@/lib/utils/call-outcome';

import { CSVUpload } from '../components/csv-upload';

const CONTACT_STATUS_ORDER: CampaignContactStatus[] = ['pending', 'in-progress', 'completed', 'failed'];
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
];

interface CampaignParamsEditDraft {
  assistantId: string;
  dailyStartTime: string;
  dailyEndTime: string;
  timezone: string;
  description: string;
}

type ActivityEventType = 'campaign' | 'call' | 'contact';

interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityEventType;
  title: string;
  detail: string;
  phone: string | null;
  callId: string | null;
}

type CampaignCallLogRow = CampaignCallAttemptExportRow;

interface CsvDownloadProgress {
  phase: 'contacts' | 'analytics' | 'transcripts' | 'csv';
  done: number;
  total: number;
  message: string;
}

const toUtcIso = (value: string | null | undefined): string => {
  const timestamp = parseDate(value);
  if (timestamp === null) return '';

  return new Date(timestamp).toISOString();
};

const toLocalTimestamp = (value: string | null | undefined): string => {
  const timestamp = parseDate(value);
  if (timestamp === null) return '';

  return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
};

const getStatusConfig = (status: CampaignStatus) => {
  switch (status) {
    case 'active': return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Activity, label: 'Running' };
    case 'paused': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Pause, label: 'Paused' };
    case 'completed': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2, label: 'Complete' };
    case 'stopped': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle, label: 'Stopped' };
    default: return { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border/40', icon: Clock, label: 'Queued' };
  }
};

const getContactStatusBadgeClass = (status: CampaignContactStatus) => {
  switch (status) {
    case 'completed':
      return 'text-green-500 bg-green-500/10 border-green-500/20';
    case 'failed':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'in-progress':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'text-muted-foreground bg-muted border-border/40';
  }
};

const parseDate = (value: string | null | undefined): number | null => {
  return parseApiTimestamp(value);
};

const formatAbsoluteTime = (value: string | null | undefined): string => {
  const timestamp = parseDate(value);
  if (timestamp === null) return '—';

  return format(new Date(timestamp), 'PP p');
};

const formatRelativeTime = (value: string | number | null | undefined): string => {
  const timestamp = typeof value === 'number' ? value : parseDate(value);
  if (timestamp === null) return '—';

  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const getLastAttempt = (contact: CampaignContact) => {
  if (!contact.call_attempts.length) return null;

  return [...contact.call_attempts]
    .sort((a, b) => (parseDate(b.timestamp) ?? 0) - (parseDate(a.timestamp) ?? 0))[0];
};

const getAttemptCallId = (contact: CampaignContact): string | null => {
  const lastAttempt = getLastAttempt(contact);
  const callId = lastAttempt?.provider_response?.call_id;

  return typeof callId === 'string' ? callId : null;
};

const getAttemptMessage = (contact: CampaignContact): string => {
  const lastAttempt = getLastAttempt(contact);
  const message = lastAttempt?.provider_response?.message;
  if (typeof message === 'string' && message.trim()) return message;

  if (lastAttempt?.status) return `Last attempt status: ${lastAttempt.status}`;

  if (contact.status === 'failed') return 'Failed without recorded call attempt telemetry';

  return 'No call attempts yet';
};

/**
 * Normalise a CSV column header key for comparison.
 * Strips leading/trailing whitespace, collapses separators (space, _, -, .)
 * into a single space, then lowercases.
 */
const normalizeKey = (k: string): string =>
  k.trim().replace(/[\s_\-\.]+/g, ' ').toLowerCase();

/**
 * Exhaustive set of normalised name-column aliases.
 * Includes common typos, regional variants, CRM exports, and space/separator variants.
 */
const NAME_KEY_ALIASES = new Set([
  // canonical
  'name', 'full name', 'fullname',
  // contact variants
  'contact name', 'contactname', 'contact', 'contacts',
  // first / last splits
  'first name', 'firstname', 'fname', 'f name',
  'last name', 'lastname', 'lname', 'l name',
  'first last', 'first and last',
  // person / person name
  'person', 'person name', 'personname',
  // customer
  'customer name', 'customername', 'customer',
  // client
  'client name', 'clientname', 'client',
  // lead
  'lead name', 'leadname', 'lead',
  // prospect / subscriber
  'prospect name', 'prospectname', 'prospect',
  'subscriber name', 'subscribername', 'subscriber',
  'member name', 'membername', 'member',
  // common CRM fields
  'display name', 'displayname',
  'user name', 'username', 'user',
  'account name', 'accountname',
  'company contact', 'employee name', 'employeename',
  // common typos / fat-finger variants
  'nme', 'naem', 'nmae', 'nam', 'nme', 'naame', 'namee',
  'flname', 'fl name', 'f l name',
  'fullnme', 'ful name', 'fullnm',
  // Hindi / regional transliterations often used in India
  'naam', 'nama', 'nombree', 'nombre',
  // misformatted from Excel exports
  'name ', ' name', ' name ', '  name',   // handled by normalizeKey anyway, included for clarity
  'col name', 'column name',
]);

/**
 * Given a metadata record and an optional manual column override,
 * return the best contact display name string or null.
 *
 * Resolution order:
 *  1. Manual override key (set by user in the UI)
 *  2. Exact match against the alias set (after normalisation)
 *  3. Key contains the word "name" anywhere (after normalisation)
 *  4. Key contains "first" or "person" (weaker heuristic, last resort)
 */
const getContactDisplayName = (
  metadata: Record<string, unknown>,
  nameColumnOverride?: string | null,
): string | null => {
  const readValue = (key: string): string | null => {
    const v = metadata[key];
    if (typeof v === 'string') {
      const t = v.trim();
      return t.length ? t : null;
    }
    return null;
  };

  // 1. Manual override: trust it completely
  if (nameColumnOverride) {
    const v = readValue(nameColumnOverride);
    if (v !== null) return v;
  }

  // 2. Alias-set match (normalise each key then check the set)
  for (const key of Object.keys(metadata)) {
    if (NAME_KEY_ALIASES.has(normalizeKey(key))) {
      const v = readValue(key);
      if (v !== null) return v;
    }
  }

  // 3. Key contains "name" anywhere after normalisation
  for (const key of Object.keys(metadata)) {
    if (normalizeKey(key).includes('name')) {
      const v = readValue(key);
      if (v !== null) return v;
    }
  }

  // 4. Weak heuristics: keys containing "first", "person", "contact", "client", "lead"
  const weakWords = ['first', 'person', 'contact', 'client', 'lead', 'user', 'member'];
  for (const key of Object.keys(metadata)) {
    const nk = normalizeKey(key);
    if (weakWords.some((w) => nk.includes(w))) {
      const v = readValue(key);
      if (v !== null) return v;
    }
  }

  return null;
};

const normalizePhoneKey = (phone: string | null | undefined): string => {
  if (!phone) return '';

  return phone.replace(/[^\d+]/g, '');
};

const extractCampaignAnalyticsRecords = (payload: unknown): CampaignAnalyticsExportRecord[] => {
  if (!payload || typeof payload !== 'object') return [];

  const data = payload as {
    analytics?: unknown;
    calls?: unknown;
  };
  const rawRecords = Array.isArray(data.analytics)
    ? data.analytics
    : Array.isArray(data.calls)
      ? data.calls
      : [];

  return rawRecords.filter((record): record is CampaignAnalyticsExportRecord => {
    return !!record && typeof record === 'object';
  });
};

const parseAnalyticsExportPayload = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
};

const resolveTranscriptExportUrl = (record: CampaignAnalyticsExportRecord): string => {
  if (typeof record.enhanced_transcript_url === 'string' && record.enhanced_transcript_url.trim()) {
    return record.enhanced_transcript_url;
  }

  if (typeof record.transcript_url === 'string' && record.transcript_url.trim()) {
    return record.transcript_url;
  }

  return '';
};

const buildCampaignCallLogRows = (
  campaignId: string,
  contacts: CampaignContact[],
  exportedAtUtc: string,
): CampaignCallLogRow[] => {
  const rows: CampaignCallLogRow[] = [];

  contacts.forEach((contact) => {
    const contactName = getContactDisplayName(contact.metadata) ?? '';
    const metadataJson = Object.keys(contact.metadata ?? {}).length
      ? JSON.stringify(contact.metadata)
      : '';
    const attempts = contact.call_attempts.length > 0 ? contact.call_attempts : [null];

    attempts.forEach((attempt, index) => {
      rows.push({
        export_generated_at_utc: exportedAtUtc,
        campaign_id: campaignId,
        contact_id: contact.id,
        phone_number: contact.phone_number,
        contact_name: contactName,
        contact_status: contact.status,
        attempt_number: attempt ? String(index + 1) : '0',
        attempt_status: attempt?.status ?? 'not_started',
        provider_call_id: typeof attempt?.provider_response?.call_id === 'string' ? attempt.provider_response.call_id : '',
        provider_participant_id: typeof attempt?.provider_response?.participant_id === 'string' ? attempt.provider_response.participant_id : '',
        provider_room_name: typeof attempt?.provider_response?.room_name === 'string' ? attempt.provider_response.room_name : '',
        provider_dispatch_id: typeof attempt?.provider_response?.dispatch_id === 'string' ? attempt.provider_response.dispatch_id : '',
        duration_seconds: typeof attempt?.duration === 'number' ? String(attempt.duration) : '',
        attempt_message: typeof attempt?.provider_response?.message === 'string' ? attempt.provider_response.message : '',
        attempt_timestamp_utc: toUtcIso(attempt?.timestamp ?? null),
        attempt_timestamp_local: toLocalTimestamp(attempt?.timestamp ?? null),
        assigned_at_utc: toUtcIso(contact.assigned_at),
        completed_at_utc: toUtcIso(contact.completed_at),
        contact_created_at_utc: toUtcIso(contact.created_at),
        contact_updated_at_utc: toUtcIso(contact.updated_at),
        transcript_call_id: '',
        transcript_url: '',
        transcript_created_at_utc: '',
        analysis_verdict: '',
        analysis_summary: '',
        analysis_confidence_score: '',
        call_status: '',
        call_direction: '',
        voicemail: '',
        uncertain_tag: '',
        uncertain_reason: '',
        uncertain_agent_feedback: '',
        not_interested_tag: '',
        not_interested_reason: '',
        transcript_message_count: '',
        transcript_text: '',
        metadata_json: metadataJson,
        sip_call_id: '',
        recording_url: '',
        analytics_json: null,
      });
    });
  });

  return rows.sort((a, b) => {
    if (!a.attempt_timestamp_utc && !b.attempt_timestamp_utc) return 0;
    if (!a.attempt_timestamp_utc) return 1;
    if (!b.attempt_timestamp_utc) return -1;

    return a.attempt_timestamp_utc > b.attempt_timestamp_utc ? -1 : 1;
  });
};

const buildActivityEvents = (
  campaign: {
    id: string;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    updated_at: string;
  },
  contacts: CampaignContact[],
): ActivityEvent[] => {
  const events: ActivityEvent[] = [];

  const campaignCreatedAt = parseDate(campaign.created_at);
  if (campaignCreatedAt !== null) {
    events.push({
      id: `${campaign.id}-created`,
      timestamp: campaignCreatedAt,
      type: 'campaign',
      title: 'Campaign created',
      detail: 'Configuration was saved and campaign entered queue-ready state.',
      phone: null,
      callId: null,
    });
  }

  const campaignStartedAt = parseDate(campaign.started_at);
  if (campaignStartedAt !== null) {
    events.push({
      id: `${campaign.id}-started`,
      timestamp: campaignStartedAt,
      type: 'campaign',
      title: 'Campaign started',
      detail: 'Queue processor began dispatching contacts.',
      phone: null,
      callId: null,
    });
  }

  const campaignCompletedAt = parseDate(campaign.completed_at);
  if (campaignCompletedAt !== null) {
    events.push({
      id: `${campaign.id}-completed`,
      timestamp: campaignCompletedAt,
      type: 'campaign',
      title: 'Campaign completed',
      detail: 'All contacts were processed for this run.',
      phone: null,
      callId: null,
    });
  }

  const campaignUpdatedAt = parseDate(campaign.updated_at);
  if (campaignUpdatedAt !== null) {
    events.push({
      id: `${campaign.id}-updated`,
      timestamp: campaignUpdatedAt,
      type: 'campaign',
      title: 'Campaign record updated',
      detail: 'Latest campaign state was persisted.',
      phone: null,
      callId: null,
    });
  }

  contacts.forEach((contact) => {
    const assignedAt = parseDate(contact.assigned_at);
    if (assignedAt !== null) {
      events.push({
        id: `${contact.id}-assigned`,
        timestamp: assignedAt,
        type: 'contact',
        title: 'Contact assigned to worker',
        detail: `Contact entered in-progress state (${contact.phone_number}).`,
        phone: contact.phone_number,
        callId: null,
      });
    }

    const completedAt = parseDate(contact.completed_at);
    if (completedAt !== null) {
      events.push({
        id: `${contact.id}-completed`,
        timestamp: completedAt,
        type: 'contact',
        title: 'Contact processing finished',
        detail: `Final status is ${contact.status}.`,
        phone: contact.phone_number,
        callId: null,
      });
    }

    if (contact.status === 'failed' && contact.call_attempts.length === 0) {
      const failedAt = parseDate(contact.updated_at);
      if (failedAt !== null) {
        events.push({
          id: `${contact.id}-failed-no-attempt`,
          timestamp: failedAt,
          type: 'contact',
          title: 'Marked failed',
          detail: 'No call attempt payload was recorded for this contact.',
          phone: contact.phone_number,
          callId: null,
        });
      }
    }

    contact.call_attempts.forEach((attempt, index) => {
      const timestamp = parseDate(attempt.timestamp);
      if (timestamp === null) return;
      const callId = typeof attempt.provider_response?.call_id === 'string'
        ? attempt.provider_response.call_id
        : null;
      const message = typeof attempt.provider_response?.message === 'string'
        ? attempt.provider_response.message
        : null;
      const detail = message
        ? `${attempt.status} • ${message}`
        : `Attempt status: ${attempt.status}`;

      events.push({
        id: `${contact.id}-attempt-${index}-${timestamp}`,
        timestamp,
        type: 'call',
        title: 'Call attempt update',
        detail,
        phone: contact.phone_number,
        callId,
      });
    });
  });

  return events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
};

const StatItem = ({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</span>
    <span className="text-2xl font-mono font-bold tracking-tight text-foreground">{value}</span>
    {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
  </div>
);

const ConfigItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between py-2 border-b border-border/10 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-bold text-foreground">{value}</span>
  </div>
);

const formatCallWindow = (campaign: Campaign): string => (
  campaign.daily_start_time
    ? `${campaign.daily_start_time} - ${campaign.daily_end_time}`
    : `Until ${campaign.daily_end_time}`
);

const toCampaignEditDraft = (campaign: Campaign): CampaignParamsEditDraft => ({
  assistantId: campaign.assistant_id ?? '',
  dailyStartTime: campaign.daily_start_time ?? CAMPAIGN_API_CONFIG.DEFAULTS.DAILY_START_TIME,
  dailyEndTime: campaign.daily_end_time ?? CAMPAIGN_API_CONFIG.DEFAULTS.DAILY_END_TIME,
  timezone: campaign.timezone ?? CAMPAIGN_API_CONFIG.DEFAULTS.TIMEZONE,
  description: campaign.description ?? '',
});

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const {
    currentCampaign: campaign,
    queueStatus,
    campaignStats,
    campaignContacts,
    loading,
    error,
    getCampaign,
    updateCampaign,
    uploadCSV,
    startCampaign: startCampaignApi,
    pauseCampaign: pauseCampaignApi,
    resumeCampaign: resumeCampaignApi,
    stopCampaign: stopCampaignApi,
    refreshQueueStatus,
    refreshCampaignStats,
    refreshCampaignContacts,
  } = useCampaignApi();
  const { assistants } = useAssistants();
  const { items: libraryItems } = useLibrary();

  const [csvPreview, setCsvPreview] = useState<CSVPreviewCache | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<CsvDownloadProgress | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<CampaignRecordingStatus | null>(null);
  const [isRefreshingRecordingStatus, setIsRefreshingRecordingStatus] = useState(false);
  const [retryDraftValue, setRetryDraftValue] = useState<number>(CAMPAIGN_API_CONFIG.DEFAULTS.MAX_RETRIES);
  const [isSavingRetries, setIsSavingRetries] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CampaignContactStatus>('all');
  const [isImportMode, setIsImportMode] = useState(false);
  const [isImportGateOpen, setIsImportGateOpen] = useState(false);
  const [isPreparingImport, setIsPreparingImport] = useState(false);
  const [isImportPausedForUpload, setIsImportPausedForUpload] = useState(false);
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [editDraft, setEditDraft] = useState<CampaignParamsEditDraft | null>(null);
  const [pendingEdit, setPendingEdit] = useState<CampaignParamsEditDraft | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Name-column field mapper ──────────────────────────────────────────
  // Persisted per campaign so the user only has to pick once.
  const nameColumnKey = `monade_campaign_name_col_${campaignId}`;
  const [nameColumnOverride, setNameColumnOverride] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(nameColumnKey) : null),
  );
  const handleNameColumnChange = (col: string) => {
    if (col === '') {
      localStorage.removeItem(nameColumnKey);
      setNameColumnOverride(null);
    } else {
      localStorage.setItem(nameColumnKey, col);
      setNameColumnOverride(col);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await getCampaign(campaignId);
      await Promise.allSettled([
        refreshQueueStatus(),
        refreshCampaignStats(campaignId),
        refreshCampaignContacts(campaignId, { limit: 300 }),
      ]);
    };

    void bootstrap().catch(() => { });
    const preview = loadCSVPreview(campaignId);
    setCsvPreview(preview);
  }, [campaignId, getCampaign, refreshCampaignStats, refreshCampaignContacts, refreshQueueStatus]);

  useEffect(() => {
    setRetryDraftValue(campaign?.max_retries ?? CAMPAIGN_API_CONFIG.DEFAULTS.MAX_RETRIES);
  }, [campaign?.max_retries]);

  useEffect(() => {
    if (!campaign || isEditingParams) return;
    setEditDraft(toCampaignEditDraft(campaign));
  }, [campaign, isEditingParams]);

  const refreshRecordingStatus = useCallback(async (refreshMissing = true) => {
    if (!campaign) return;

    setIsRefreshingRecordingStatus(true);
    try {
      const status = await campaignApi.getCampaignRecordingStatus(
        campaign.user_uid,
        campaign.id,
        { refreshMissing, maxRefresh: 25 },
      );
      setRecordingStatus(status);
    } catch (error) {
      console.warn('Failed to refresh campaign recording readiness:', error);
    } finally {
      setIsRefreshingRecordingStatus(false);
    }
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    void refreshRecordingStatus(true);
  }, [campaign, refreshRecordingStatus]);

  useEffect(() => {
    if (!campaign || !recordingStatus || recordingStatus.pending_recordings <= 0) return;
    const latestActivity = parseDate(campaign.completed_at) ?? parseDate(campaign.updated_at) ?? 0;
    const isInsideRecordingDelayWindow = Date.now() - latestActivity <= 6 * 60 * 1000;
    if (campaign.status !== 'active' && !isInsideRecordingDelayWindow) return;

    const interval = setInterval(() => {
      void refreshRecordingStatus(true);
    }, 30_000);

    return () => clearInterval(interval);
  }, [campaign, recordingStatus, refreshRecordingStatus]);

  useEffect(() => {
    if (!campaign || campaign.status !== 'active') return;
    const interval = setInterval(() => {
      void (async () => {
        await Promise.allSettled([
          getCampaign(campaignId),
          refreshQueueStatus(),
          refreshCampaignStats(campaignId),
          refreshCampaignContacts(campaignId, { limit: 300 }),
        ]);
      })();
    }, CAMPAIGN_API_CONFIG.POLL_INTERVALS.QUEUE_STATUS);

    return () => clearInterval(interval);
  }, [
    campaign,
    campaignId,
    getCampaign,
    refreshCampaignStats,
    refreshCampaignContacts,
    refreshQueueStatus,
  ]);

  const handleCSVUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const response = await uploadCSV(campaignId, file);
      toast.success(`Ingested ${response.totalRows} contacts`);
      if (campaign && isImportPausedForUpload) {
        try {
          await resumeCampaignApi(campaign.id);
          toast.success('Campaign resumed after import');
        } catch (resumeError) {
          console.error('Failed to resume campaign after import:', resumeError);
          toast.error('CSV uploaded, but auto-resume failed. Resume the campaign manually.');
        }
      }
      await Promise.allSettled([
        getCampaign(campaignId),
        refreshQueueStatus(),
        refreshCampaignStats(campaignId),
        refreshCampaignContacts(campaignId, { limit: 300 }),
      ]);
      setIsImportMode(false);
      setIsImportPausedForUpload(false);
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewSaved = (preview: CSVPreviewCache | null) => {
    setCsvPreview(preview);
  };

  const prepareCampaignRun = async () => {
    if (!campaign) return false;
    if (!campaign.assistant_id || !campaign.trunk_name) {
      toast.error('Campaign configuration missing.');

      return false;
    }
    if (campaign.total_contacts <= 0) {
      toast.error('Contact list required.');

      return false;
    }

    return true;
  };

  const handleStart = async () => {
    if (!campaign) return;
    try {
      const ready = await prepareCampaignRun();
      if (!ready) return;
      await startCampaignApi(campaign.id);
      await Promise.allSettled([
        refreshCampaignStats(campaign.id),
        refreshCampaignContacts(campaign.id, { limit: 300 }),
      ]);
      toast.success('Campaign initiated');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async () => {
    if (!campaign) return;
    try {
      const ready = await prepareCampaignRun();
      if (!ready) return;
      await resumeCampaignApi(campaign.id);
      await Promise.allSettled([
        refreshCampaignStats(campaign.id),
        refreshCampaignContacts(campaign.id, { limit: 300 }),
      ]);
      toast.success('Campaign resumed');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePause = async () => {
    if (!campaign) return;
    await pauseCampaignApi(campaign.id);
    await Promise.allSettled([
      refreshCampaignStats(campaign.id),
      refreshCampaignContacts(campaign.id, { limit: 300 }),
    ]);
    toast.success('Campaign paused');
  };

  const handleStop = async () => {
    if (!campaign) return;
    await stopCampaignApi(campaign.id);
    await Promise.allSettled([
      refreshCampaignStats(campaign.id),
      refreshCampaignContacts(campaign.id, { limit: 300 }),
    ]);
    toast.success('Campaign stopped');
  };

  const handleRefresh = async () => {
    await Promise.allSettled([
      getCampaign(campaignId),
      refreshQueueStatus(),
      refreshCampaignStats(campaignId),
      refreshCampaignContacts(campaignId, { limit: 300 }),
      refreshRecordingStatus(true),
    ]);
    toast.success('Telemetry refreshed');
  };

  const handleSaveRetries = async () => {
    if (!campaign) return;
    if (retryDraftValue === campaign.max_retries) return;

    setIsSavingRetries(true);
    try {
      await updateCampaign(campaign.id, { max_retries: retryDraftValue });
      await Promise.allSettled([
        getCampaign(campaign.id),
        refreshCampaignStats(campaign.id),
      ]);
      toast.success(`Retries updated to ${retryDraftValue}`);
    } catch (error) {
      console.error('Failed to update campaign retries:', error);
      toast.error('Failed to update retries.');
    } finally {
      setIsSavingRetries(false);
    }
  };

  const handleStartEditParams = () => {
    if (!campaign) return;
    setEditDraft(toCampaignEditDraft(campaign));
    setPendingEdit(null);
    setIsEditingParams(true);
  };

  const handleCancelEditParams = () => {
    if (!campaign) return;
    setEditDraft(toCampaignEditDraft(campaign));
    setPendingEdit(null);
    setIsEditingParams(false);
  };

  const handleSaveParams = async (draft: CampaignParamsEditDraft) => {
    if (!campaign) return;
    const wasActive = campaign.status === 'active';
    let pausedForUpdate = false;
    let resumed = false;

    setIsSavingEdit(true);
    try {
      if (wasActive) {
        await pauseCampaignApi(campaign.id);
        pausedForUpdate = true;
      }

      await updateCampaign(campaign.id, {
        assistant_id: draft.assistantId,
        daily_start_time: null,
        daily_end_time: draft.dailyEndTime,
        timezone: draft.timezone,
        description: draft.description.trim(),
        scheduled_start_at: campaign.status === 'pending'
          ? getNextOccurrenceUtcIso(draft.dailyStartTime, draft.timezone)
          : campaign.scheduled_start_at ?? null,
      });

      if (pausedForUpdate) {
        await resumeCampaignApi(campaign.id);
        resumed = true;
      }

      await Promise.allSettled([
        getCampaign(campaign.id),
        refreshQueueStatus(),
        refreshCampaignStats(campaign.id),
        refreshCampaignContacts(campaign.id, { limit: 300 }),
      ]);
      setPendingEdit(null);
      setIsEditingParams(false);
      toast.success('Campaign parameters updated');
    } catch (error) {
      console.error('Failed to update campaign parameters:', error);
      if (pausedForUpdate && !resumed) {
        try {
          await resumeCampaignApi(campaign.id);
        } catch (resumeError) {
          console.error('Failed to auto-resume campaign after update error:', resumeError);
        }
      }
      toast.error('Failed to update campaign parameters.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveParamsClick = () => {
    if (!campaign || !editDraft) return;
    if (campaign.status === 'active') {
      setPendingEdit({ ...editDraft });

      return;
    }
    void handleSaveParams(editDraft);
  };

  const handleConfirmPendingEdit = () => {
    if (!pendingEdit) return;
    void handleSaveParams(pendingEdit);
  };

  const handleImportToggle = () => {
    if (!campaign) return;
    if (isImportMode) {
      setIsImportMode(false);

      return;
    }
    if (campaign.status === 'active') {
      setIsImportGateOpen(true);

      return;
    }
    setIsImportMode(true);
  };

  const handleConfirmImportGate = async () => {
    if (!campaign) return;
    setIsPreparingImport(true);
    try {
      await pauseCampaignApi(campaign.id);
      await Promise.allSettled([
        getCampaign(campaign.id),
        refreshQueueStatus(),
        refreshCampaignStats(campaign.id),
        refreshCampaignContacts(campaign.id, { limit: 300 }),
      ]);
      setIsImportPausedForUpload(true);
      setIsImportMode(true);
      setIsImportGateOpen(false);
      toast.success('Campaign paused. Upload CSV to append leads.');
    } catch (error) {
      console.error('Failed to pause campaign for import:', error);
      toast.error('Failed to pause campaign for import.');
    } finally {
      setIsPreparingImport(false);
    }
  };

  const handleDownloadCallLogs = async () => {
    if (!campaign) return;
    setIsDownloadingLogs(true);
    setDownloadProgress({
      phase: 'contacts',
      done: 0,
      total: 1,
      message: 'Collecting campaign contacts...',
    });

    try {
      const pageSize = 300;
      let skip = 0;
      const allContacts: CampaignContact[] = [];

      while (true) {
        const batch = await campaignApi.getCampaignContacts(campaign.id, campaign.user_uid, skip, pageSize);
        if (batch.length === 0) break;
        allContacts.push(...batch);
        if (batch.length < pageSize) break;
        skip += batch.length;
      }
      setDownloadProgress({
        phase: 'contacts',
        done: 1,
        total: 1,
        message: `Loaded ${allContacts.length} contacts.`,
      });

      if (allContacts.length === 0) {
        toast.info('No contact telemetry available yet for this campaign.');

        return;
      }

      const exportedAtUtc = new Date().toISOString();
      const rows = buildCampaignCallLogRows(campaign.id, allContacts, exportedAtUtc);
      if (rows.length === 0) {
        toast.info('No call attempts recorded yet for this campaign.');

        return;
      }

      setDownloadProgress({
        phase: 'analytics',
        done: 0,
        total: 1,
        message: 'Linking campaign analytics and transcript records...',
      });

      const analyticsPayload = await campaignApi.getDetailedAnalytics(campaign.user_uid, campaign.id) as unknown;
      let analyticsRecords = extractCampaignAnalyticsRecords(analyticsPayload);

      if (analyticsRecords.length === 0) {
        setDownloadProgress({
          phase: 'analytics',
          done: 0,
          total: 1,
          message: 'No campaign-tagged analytics found, scanning user analytics as fallback...',
        });

        try {
          const userAnalyticsPayload = await campaignApi.getUserDetailedAnalytics(campaign.user_uid) as unknown;
          const userAnalyticsRecords = extractCampaignAnalyticsRecords(userAnalyticsPayload);

          const campaignCallIds = new Set(
            rows
              .map((row) => row.provider_call_id)
              .filter((callId): callId is string => typeof callId === 'string' && callId.length > 0),
          );
          const campaignPhoneKeys = new Set(
            rows
              .map((row) => normalizePhoneKey(row.phone_number))
              .filter((phoneKey): phoneKey is string => phoneKey.length > 0),
          );
          const campaignWindowStart = parseDate(campaign.started_at) ?? parseDate(campaign.created_at) ?? 0;
          const campaignWindowEnd = parseDate(campaign.completed_at) ?? parseDate(campaign.updated_at) ?? Date.now();
          const windowStartPaddingMs = 15 * 60 * 1000;
          const windowEndPaddingMs = 6 * 60 * 60 * 1000;

          analyticsRecords = userAnalyticsRecords.filter((record) => {
            if (record.campaign_id && record.campaign_id === campaign.id) return true;
            if (record.call_id && campaignCallIds.has(record.call_id)) return true;

            const phoneKey = normalizePhoneKey(record.phone_number);
            if (!phoneKey || !campaignPhoneKeys.has(phoneKey)) return false;

            const createdAt = parseDate(record.created_at);
            if (createdAt === null) return true;

            return (
              createdAt >= campaignWindowStart - windowStartPaddingMs
              && createdAt <= campaignWindowEnd + windowEndPaddingMs
            );
          });
        } catch (fallbackError) {
          console.warn('Failed to fetch user analytics fallback for campaign export:', fallbackError);
        }
      }

      const analyticsByPhone = new Map<string, CampaignAnalyticsExportRecord[]>();

      analyticsRecords.forEach((record) => {
        const phoneKey = normalizePhoneKey(record.phone_number);
        if (!phoneKey) return;

        const bucket = analyticsByPhone.get(phoneKey) ?? [];
        bucket.push(record);
        analyticsByPhone.set(phoneKey, bucket);
      });

      analyticsByPhone.forEach((bucket) => {
        bucket.sort((a, b) => (parseDate(a.created_at) ?? 0) - (parseDate(b.created_at) ?? 0));
      });

      const usedAnalyticsIndices = new Map<string, Set<number>>();
      const rowsByAttemptTime = [...rows].sort((a, b) => {
        const aTime = parseDate(a.attempt_timestamp_utc) ?? parseDate(a.contact_updated_at_utc) ?? 0;
        const bTime = parseDate(b.attempt_timestamp_utc) ?? parseDate(b.contact_updated_at_utc) ?? 0;

        return aTime - bTime;
      });

      rowsByAttemptTime.forEach((row) => {
        const phoneKey = normalizePhoneKey(row.phone_number);
        if (!phoneKey) return;

        const candidates = analyticsByPhone.get(phoneKey);
        if (!candidates || candidates.length === 0) return;

        const used = usedAnalyticsIndices.get(phoneKey) ?? new Set<number>();
        let selectedIndex = -1;

        if (row.provider_call_id) {
          const exactIndex = candidates.findIndex((candidate, index) => {
            return !used.has(index) && candidate.call_id === row.provider_call_id;
          });
          if (exactIndex >= 0) selectedIndex = exactIndex;
        }

        if (selectedIndex < 0) {
          const rowTimestamp = parseDate(row.attempt_timestamp_utc) ?? parseDate(row.contact_updated_at_utc) ?? Date.now();
          let bestScore = Number.POSITIVE_INFINITY;

          candidates.forEach((candidate, index) => {
            if (used.has(index)) return;
            const candidateTimestamp = parseDate(candidate.created_at) ?? rowTimestamp;
            const score = Math.abs(candidateTimestamp - rowTimestamp);
            if (score < bestScore) {
              bestScore = score;
              selectedIndex = index;
            }
          });
        }

        if (selectedIndex < 0) return;

        used.add(selectedIndex);
        usedAnalyticsIndices.set(phoneKey, used);

        const selected = candidates[selectedIndex];
        const analytics = parseAnalyticsExportPayload(selected.analytics);
        row.transcript_call_id = selected.call_id ?? '';
        row.transcript_url = resolveTranscriptExportUrl(selected);
        row.transcript_created_at_utc = toUtcIso(selected.created_at);
        row.analysis_verdict = typeof analytics?.verdict === 'string' ? analytics.verdict : '';
        row.analysis_summary = typeof analytics?.summary === 'string' ? analytics.summary : '';
        row.analysis_confidence_score = typeof analytics?.confidence_score === 'number'
          ? String(analytics.confidence_score)
          : '';
        // Direct passthrough of DB analytics fields used by the CSV export. Null/missing → ''.
        // The export layer must never invent values for these — see campaign-client-export.ts.
        // call_status / voicemail live at the top level; the verdict-detail fields live under
        // analytics.key_discoveries (see prod schema for reference).
        row.call_status = typeof analytics?.call_status === 'string' ? analytics.call_status : '';
        // Direction: billing → provider fallback + conflict policy. Resolved from the
        // selected record (billing_data / provider_call_status live on the record, not the
        // inner analytics blob). 'unknown' is written as '' so the column reads clean.
        const resolvedDirection = resolveCallDirection({
          billing_data: selected.billing_data,
          provider_call_status: selected.provider_call_status,
        });
        row.call_direction = resolvedDirection === 'unknown' ? '' : resolvedDirection;
        row.voicemail = typeof analytics?.voicemail === 'boolean' ? String(analytics.voicemail) : '';
        const keyDiscoveries = (analytics?.key_discoveries && typeof analytics.key_discoveries === 'object' && !Array.isArray(analytics.key_discoveries))
          ? analytics.key_discoveries as Record<string, unknown>
          : null;
        row.uncertain_tag = typeof keyDiscoveries?.uncertain_tag === 'string' ? keyDiscoveries.uncertain_tag : '';
        row.uncertain_reason = typeof keyDiscoveries?.uncertain_reason === 'string' ? keyDiscoveries.uncertain_reason : '';
        row.uncertain_agent_feedback = typeof keyDiscoveries?.uncertain_agent_feedback === 'string' ? keyDiscoveries.uncertain_agent_feedback : '';
        row.not_interested_tag = typeof keyDiscoveries?.not_interested_tag === 'string' ? keyDiscoveries.not_interested_tag : '';
        row.not_interested_reason = typeof keyDiscoveries?.not_interested_reason === 'string' ? keyDiscoveries.not_interested_reason : '';
        row.sip_call_id = selected.sip_call_id ?? '';
        row.recording_url = selected.recording_url ?? '';
        row.analytics_json = analytics;
      });

      // Surface fetch/match failures: any attempt that resolved to a real call (provider_call_id
       // exists) but didn't get analytics attached is suspect. Don't write blank silently.
      const unmatchedConnectedRows = rows.filter((row) => {
        return Boolean(row.provider_call_id) && !row.analytics_json && !row.transcript_call_id;
      });
      if (unmatchedConnectedRows.length > 0) {
        const sample = unmatchedConnectedRows.slice(0, 10).map((row) => row.provider_call_id);
        console.warn(
          `[CampaignExport] ${unmatchedConnectedRows.length} attempt(s) had a provider_call_id but no analytics record matched. Sample call IDs:`,
          sample,
        );
      }

      setDownloadProgress({
        phase: 'analytics',
        done: 1,
        total: 1,
        message: `Matched analytics records for ${analyticsRecords.length} campaign calls.`,
      });

      const transcriptUrls = Array.from(
        new Set(
          rows
            .map((row) => row.transcript_url)
            .filter((url): url is string => typeof url === 'string' && url.length > 0),
        ),
      );

      if (transcriptUrls.length > 0) {
        setDownloadProgress({
          phase: 'transcripts',
          done: 0,
          total: transcriptUrls.length,
          message: `Fetching transcripts (0/${transcriptUrls.length})...`,
        });

        const transcriptCache = new Map<string, { transcript: string; messageCount: number }>();
        const queue = [...transcriptUrls];
        let completed = 0;

        const workerCount = Math.min(4, queue.length);
        const workers = Array.from({ length: workerCount }, async () => {
          while (queue.length > 0) {
            const url = queue.shift();
            if (!url) break;

            try {
              const content = await fetchJson<{ transcript?: string; messageCount?: number }>(
                '/api/transcript-content',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ url }),
                  retry: { retries: 2 },
                },
              );
              transcriptCache.set(url, {
                transcript: content.transcript ?? '',
                messageCount: content.messageCount ?? 0,
              });
            } catch (error) {
              console.error('Failed to fetch transcript for export:', url, error);
              transcriptCache.set(url, {
                transcript: '',
                messageCount: 0,
              });
            } finally {
              completed += 1;
              setDownloadProgress({
                phase: 'transcripts',
                done: completed,
                total: transcriptUrls.length,
                message: `Fetching transcripts (${completed}/${transcriptUrls.length})...`,
              });
            }
          }
        });

        await Promise.all(workers);

        rows.forEach((row) => {
          if (!row.transcript_url) return;
          const transcriptEntry = transcriptCache.get(row.transcript_url);
          if (!transcriptEntry) return;

          row.transcript_text = transcriptEntry.transcript;
          row.transcript_message_count = String(transcriptEntry.messageCount);
        });
      }

      setDownloadProgress({
        phase: 'csv',
        done: 1,
        total: 1,
        message: 'Generating client campaign CSV file...',
      });

      const exportResult = buildClientCampaignExport(rows);
      if (exportResult.totalCalls > 0) {
        setRecordingStatus((current) => ({
          user_uid: campaign.user_uid,
          campaign_id: campaign.id,
          total_calls: exportResult.totalCalls,
          available_recordings: exportResult.availableRecordings,
          pending_recordings: Math.max(exportResult.totalCalls - exportResult.availableRecordings, 0),
          missing_sip_call_id: current?.missing_sip_call_id,
          refreshed_recordings: current?.refreshed_recordings,
          lookup_errors: current?.lookup_errors,
          vobiz_configured: current?.vobiz_configured,
        }));
      }

      const csvContent = generateCSV(
        exportResult.rows as unknown as Parameters<typeof generateCSV>[0],
        exportResult.fields,
      );
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const safeCampaignName = campaign.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
      downloadCSV(csvContent, `${safeCampaignName}_${campaign.id}_client_export_${timestamp}.csv`);
      toast.success(`Downloaded ${exportResult.rows.length} lead rows.`);
    } catch (error) {
      console.error('Failed to download campaign call logs:', error);
      toast.error('Failed to download campaign call logs.');
    } finally {
      setIsDownloadingLogs(false);
      setDownloadProgress(null);
    }
  };

  const contacts = useMemo(
    () => campaignContacts[campaignId] ?? [],
    [campaignContacts, campaignId],
  );

  const contactCounts = useMemo(() => {
    return contacts.reduce(
      (acc, contact) => {
        acc[contact.status] += 1;

        return acc;
      },
      { pending: 0, 'in-progress': 0, completed: 0, failed: 0 } as Record<CampaignContactStatus, number>,
    );
  }, [contacts]);

  const activityEvents = useMemo(
    () => (campaign ? buildActivityEvents(campaign, contacts) : []),
    [campaign, contacts],
  );

  const filteredContacts = useMemo(() => {
    const normalizedQuery = contactQuery.trim().toLowerCase();

    return contacts
      .filter((contact) => {
        if (statusFilter !== 'all' && contact.status !== statusFilter) return false;
        if (!normalizedQuery) return true;
        const name = getContactDisplayName(contact.metadata, nameColumnOverride)?.toLowerCase() ?? '';
        const phone = contact.phone_number.toLowerCase();
        const callId = getAttemptCallId(contact)?.toLowerCase() ?? '';

        return name.includes(normalizedQuery)
          || phone.includes(normalizedQuery)
          || callId.includes(normalizedQuery);
      })
      .sort((a, b) => (parseDate(b.updated_at) ?? 0) - (parseDate(a.updated_at) ?? 0));
  }, [contacts, contactQuery, statusFilter, nameColumnOverride]);

  const sortedAssistants = useMemo(
    () => [...assistants].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [assistants],
  );

  if (loading && !campaign) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) return null;

  const statusConfig = getStatusConfig(campaign.status);
  const currentCampaignStats = campaignStats[campaignId];
  const hasContactTelemetry = contacts.length > 0;
  const recordingReadinessLabel = recordingStatus
    ? `Recordings ${recordingStatus.available_recordings}/${recordingStatus.total_calls}`
    : (isRefreshingRecordingStatus ? 'Recordings checking...' : 'Recordings --/--');

  const progress = getCampaignProgress(campaign, currentCampaignStats);
  const completedCalls = hasContactTelemetry
    ? contactCounts.completed
    : Math.max(0, currentCampaignStats?.completed_contacts ?? campaign.successful_calls ?? 0);
  const failedCalls = hasContactTelemetry
    ? contactCounts.failed
    : Math.max(0, currentCampaignStats?.failed_contacts ?? campaign.failed_calls ?? 0);
  const inProgressCalls = hasContactTelemetry
    ? contactCounts['in-progress']
    : Math.max(0, currentCampaignStats?.in_progress_contacts ?? progress.inProgress);
  const attempts = completedCalls + failedCalls;
  const successRate = attempts > 0 ? Math.round((completedCalls / attempts) * 100) : 0;
  const attemptedContacts = hasContactTelemetry
    ? contacts.filter((contact) => contact.call_attempts.length > 0).length
    : attempts;
  const unresolvedFailures = hasContactTelemetry
    ? contacts.filter((contact) => contact.status === 'failed' && contact.call_attempts.length === 0).length
    : 0;
  const runtimeStatusLabel = campaign.status === 'active'
    ? (!queueStatus?.time_window_active
      ? 'Waiting for call window'
      : queueStatus.credits_available === false
        ? 'Waiting for credits'
        : progress.statusLabel)
    : progress.statusLabel;
  const selectedAssistant = sortedAssistants.find((assistant) => assistant.id === campaign.assistant_id);
  const selectedAssistantKbName = (() => {
    const kb = selectedAssistant?.knowledgeBase;
    if (!kb) return null;
    const match = libraryItems.find((item) => item.id === kb || item.url === kb);

    return match ? match.filename.replace(/\.txt$/, '') : null;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-4">
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Operations
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-medium tracking-tighter text-foreground">{campaign.name}</h1>
              <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full border', statusConfig.bg, statusConfig.border)}>
                <statusConfig.icon size={12} className={statusConfig.color} />
                <span className={cn('text-[10px] font-bold uppercase tracking-widest', statusConfig.color)}>{statusConfig.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void handleRefresh(); }}
              className="h-10 border-border text-[10px] font-bold uppercase tracking-widest"
              aria-label="Refresh campaign"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void handleDownloadCallLogs(); }}
              disabled={isDownloadingLogs}
              className="h-10 max-w-[320px] border-border text-[10px] font-bold uppercase tracking-widest gap-2 truncate"
              aria-label="Download campaign call logs"
              title={downloadProgress?.message ?? `Download client export. ${recordingReadinessLabel}`}
            >
              {isDownloadingLogs ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isDownloadingLogs ? (downloadProgress?.message ?? 'Preparing CSV...') : `Download CSV · ${recordingReadinessLabel}`}
            </Button>
            {canStartCampaign(campaign.status) && (
              <Button
                onClick={handleStart}
                disabled={loading || campaign.total_contacts === 0}
                className="h-10 gap-2 bg-green-600 hover:bg-green-700 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
              >
                <Play size={14} /> Execute
              </Button>
            )}
            {campaign.status === 'paused' && (
              <Button
                onClick={handleResume}
                disabled={loading}
                className="h-10 gap-2 bg-green-600 hover:bg-green-700 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
              >
                <Play size={14} /> Resume
              </Button>
            )}
            {canPauseCampaign(campaign.status) && (
              <Button
                onClick={handlePause}
                disabled={loading}
                className="h-10 gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
              >
                <Pause size={14} /> Pause
              </Button>
            )}
            {canStopCampaign(campaign.status) && (
              <Button
                onClick={handleStop}
                disabled={loading}
                variant="destructive"
                className="h-10 gap-2 rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
              >
                <Square size={14} /> Stop
              </Button>
            )}
          </div>
        </div>

        {isDownloadingLogs && downloadProgress && (
          <p className="text-[10px] text-muted-foreground">
            {downloadProgress.message}
          </p>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest rounded-md flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {(pendingEdit || isImportGateOpen) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-md bg-primary/10 border border-primary/20 flex gap-3 items-start"
          >
            <AlertCircle className="text-primary shrink-0" size={18} />
            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Confirmation required</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {pendingEdit
                  ? 'This campaign is currently running. It will be paused, updated, and then resumed automatically.'
                  : 'This campaign is currently running. It will be paused during CSV import and resumed after upload.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (pendingEdit) {
                      handleConfirmPendingEdit();
                    } else {
                      void handleConfirmImportGate();
                    }
                  }}
                  disabled={isSavingEdit || isPreparingImport}
                  className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline disabled:opacity-60 disabled:no-underline"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setPendingEdit(null);
                    setIsImportGateOpen(false);
                  }}
                  disabled={isSavingEdit || isPreparingImport}
                  className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:underline disabled:opacity-60 disabled:no-underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <div className="space-y-8">
            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardContent className="p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <StatItem label="Completion" value={`${progress.percent}%`} subtext={`${progress.processed} / ${progress.total} • ${runtimeStatusLabel}`} />
                <StatItem label="Success" value={`${successRate}%`} subtext={`${completedCalls} completed`} />
                <StatItem label="Failed" value={failedCalls} subtext={unresolvedFailures > 0 ? `${unresolvedFailures} missing attempt data` : 'With call metadata'} />
                <StatItem label="Dialing" value={inProgressCalls} subtext="Currently in progress" />
                <StatItem label="Attempted" value={attemptedContacts} subtext="At least one call attempt" />
              </PaperCardContent>
              <div className="px-8 pb-8">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-1000 ease-out',
                      campaign.status === 'active'
                        ? 'bg-green-500'
                        : campaign.status === 'paused'
                          ? 'bg-yellow-500'
                          : campaign.status === 'completed'
                            ? 'bg-blue-500'
                            : campaign.status === 'stopped'
                              ? 'bg-red-500'
                              : 'bg-primary',
                    )}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                {campaign.status === 'active' && queueStatus && (!queueStatus.time_window_active || queueStatus.credits_available === false) && (
                  <p className="mt-2 text-[10px] font-medium text-muted-foreground">
                    {queueStatus.time_window_active
                      ? 'Campaign is active but call dispatch is blocked until credits are available.'
                      : 'Campaign is active but currently outside the configured daily call window.'}
                  </p>
                )}
              </div>
            </PaperCard>

            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-6 pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Audience</PaperCardTitle>
                    {csvPreview && !isImportMode && (
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                        {csvPreview.totalContacts} total entries
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    {!isImportMode && hasContactTelemetry && (
                      <div className="flex items-center gap-2 mr-2">
                        <Input
                          value={contactQuery}
                          onChange={(event) => setContactQuery(event.target.value)}
                          placeholder="Search phone, name..."
                          className="h-8 w-full md:w-48 text-[10px]"
                        />
                        <div className="flex gap-1">
                          {CONTACT_STATUS_ORDER.map((status) => (
                            <Button
                              key={status}
                              variant={statusFilter === status ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 px-2 text-[9px] uppercase tracking-widest"
                              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                            >
                              {status === 'in-progress' ? 'Dialing' : status}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button
                      variant={isImportMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleImportToggle}
                      className="h-8 text-[10px] uppercase tracking-widest gap-2"
                      disabled={loading || isUploading || isPreparingImport}
                    >
                      {isImportMode ? 'View Contacts' : 'Import CSV'}
                    </Button>
                  </div>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="px-6 pb-6">
                {isImportMode || (!hasContactTelemetry && !isImportMode) ? (
                  <div className="bg-background border border-border/40 rounded-md overflow-hidden min-h-[300px]">
                    <CSVUpload
                      campaignId={campaignId}
                      onUploadComplete={handleCSVUpload}
                      onPreviewSaved={handlePreviewSaved}
                      existingPreview={csvPreview}
                      disabled={loading || isUploading || isPreparingImport || (campaign.status === 'active' && !isImportPausedForUpload)}
                    />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-border/40 rounded-md">
                    <p className="text-xs text-muted-foreground">
                      No contacts matched your current filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] text-left">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {/* ── Field Mapper ───────────────────────────────── */}
                            {(() => {
                              // Collect all metadata keys from the first contact that has metadata
                              const sampleMeta = filteredContacts.find((c) => Object.keys(c.metadata).length > 0)?.metadata ?? {};
                              const metaKeys = Object.keys(sampleMeta);
                              // Show mapper if there are metadata keys but we still can't auto-resolve a name
                              // (or user already picked manually — always show so they can change)
                              const showMapper = metaKeys.length > 0;
                              if (!showMapper) return 'Contact';
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span>Contact</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] normal-case tracking-normal text-muted-foreground/60">name col:</span>
                                    <select
                                      value={nameColumnOverride ?? ''}
                                      onChange={(e) => handleNameColumnChange(e.target.value)}
                                      className="h-5 max-w-[120px] bg-background border border-border/40 rounded px-1 text-[9px] text-muted-foreground font-mono normal-case tracking-normal cursor-pointer"
                                      title="Choose which CSV column to use as the contact name"
                                    >
                                      <option value="">(auto-detect)</option>
                                      {metaKeys.map((k) => (
                                        <option key={k} value={k}>{k}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })()}
                          </th>
                          <th className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">Attempts</th>
                          <th className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">Last Attempt</th>
                          <th className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">Call ID</th>
                          <th className="py-2 pr-3 text-[10px] uppercase tracking-widest text-muted-foreground">Detail</th>
                          <th className="py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContacts.map((contact) => {
                          const lastAttempt = getLastAttempt(contact);
                          const callId = getAttemptCallId(contact);
                          const displayName = getContactDisplayName(contact.metadata, nameColumnOverride);

                          return (
                            <tr key={contact.id} className="border-b border-border/10 align-top hover:bg-muted/5 transition-colors">
                              <td className="py-3 pr-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-foreground font-mono">{contact.phone_number}</span>
                                  {displayName
                                    ? <span className="text-[11px] text-muted-foreground">{displayName}</span>
                                    : <span className="text-[11px] text-muted-foreground/40 italic">—</span>}
                                </div>
                              </td>
                              <td className="py-3 pr-3">
                                <Badge variant="outline" className={cn('text-[9px] uppercase font-bold tracking-tighter', getContactStatusBadgeClass(contact.status))}>
                                  {contact.status}
                                </Badge>
                              </td>
                              <td className="py-3 pr-3 text-xs font-mono text-foreground">
                                {contact.call_attempts.length}
                              </td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">
                                {lastAttempt ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground">{lastAttempt.status}</span>
                                    <span>{formatRelativeTime(lastAttempt.timestamp)}</span>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="py-3 pr-3 text-xs font-mono text-muted-foreground">
                                {callId ?? '—'}
                              </td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground max-w-[320px] truncate">
                                {getAttemptMessage(contact)}
                              </td>
                              <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(contact.updated_at)}
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
          </div>

          <div className="space-y-8">
            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-primary" />
                    <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Parameters</PaperCardTitle>
                  </div>
                  {!isEditingParams && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEditParams}
                      className="h-7 px-2 text-[9px] uppercase tracking-widest gap-1"
                    >
                      <Pencil size={11} />
                      Edit
                    </Button>
                  )}
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-4 space-y-1">
                <ConfigItem label="Provider" value={campaign.provider} />
                <ConfigItem label="Trunk" value={campaign.trunk_name} />
                {isEditingParams && editDraft ? (
                  <div className="space-y-3 py-2 border-b border-border/10">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Agent</label>
                      <select
                        value={editDraft.assistantId}
                        onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, assistantId: event.target.value } : prev))}
                        className="h-8 w-full bg-background border border-border/40 rounded px-2 text-[11px]"
                        disabled={isSavingEdit}
                      >
                        <option value="">Select assistant</option>
                        {sortedAssistants.map((assistant) => (
                          <option key={assistant.id} value={assistant.id}>{assistant.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Call Window</label>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <Input
                          type="time"
                          value={editDraft.dailyStartTime}
                          onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, dailyStartTime: event.target.value } : prev))}
                          disabled={isSavingEdit}
                          className="h-8 text-[11px] font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">to</span>
                        <Input
                          type="time"
                          value={editDraft.dailyEndTime}
                          onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, dailyEndTime: event.target.value } : prev))}
                          disabled={isSavingEdit}
                          className="h-8 text-[11px] font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Timezone</label>
                      <select
                        value={editDraft.timezone}
                        onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))}
                        className="h-8 w-full bg-background border border-border/40 rounded px-2 text-[11px]"
                        disabled={isSavingEdit}
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Description</label>
                      <textarea
                        value={editDraft.description}
                        onChange={(event) => setEditDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                        disabled={isSavingEdit}
                        rows={3}
                        className="w-full bg-background border border-border/40 rounded px-2 py-2 text-[11px] resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <ConfigItem label="Agent" value={selectedAssistant?.name ?? campaign.assistant_id} />
                    {selectedAssistantKbName ? (
                      <div className="flex justify-between py-2 border-b border-border/10">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Brain size={12} /> KB</span>
                        <span className="text-xs font-bold text-foreground">{selectedAssistantKbName}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between py-2 border-b border-border/10">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Bot size={12} /> Agent ID</span>
                        <span className="text-xs font-bold text-foreground font-mono">{campaign.assistant_id || '—'}</span>
                      </div>
                    )}
                    <ConfigItem label="Timezone" value={campaign.timezone} />
                    <ConfigItem label="Call Window" value={formatCallWindow(campaign)} />
                    <ConfigItem
                      label="Schedule"
                      value={campaign.scheduled_start_at ? formatInTimeZone(campaign.scheduled_start_at, campaign.timezone) : 'Start immediately'}
                    />
                    <ConfigItem label="Description" value={campaign.description || '—'} />
                  </>
                )}
                <ConfigItem label="Rate" value={`${campaign.calls_per_second} CPS`} />
                <ConfigItem label="Concurrency" value={campaign.max_concurrent} />
                <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                  <span className="text-xs text-muted-foreground">Retries</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={retryDraftValue}
                      onChange={(event) => setRetryDraftValue(Number(event.target.value))}
                      className="h-7 min-w-[64px] bg-background border border-border/40 rounded px-2 text-[11px] font-mono"
                      disabled={isSavingRetries}
                    >
                      {Array.from({ length: CAMPAIGN_API_CONFIG.LIMITS.MAX_RETRIES + 1 }, (_, n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { void handleSaveRetries(); }}
                      disabled={isSavingRetries || isSavingEdit || retryDraftValue === campaign.max_retries}
                      className="h-7 px-2 text-[9px] uppercase tracking-widest"
                    >
                      {isSavingRetries ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
                {isEditingParams && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditParams}
                      disabled={isSavingEdit}
                      className="h-7 px-2 text-[9px] uppercase tracking-widest"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveParamsClick}
                      disabled={isSavingEdit || !editDraft?.assistantId}
                      className="h-7 px-2 text-[9px] uppercase tracking-widest"
                    >
                      {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>

            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-6 pb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Activity Feed</PaperCardTitle>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="px-6 pb-6">
                {activityEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No activity yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {activityEvents.map((event) => (
                      <div key={event.id} className="rounded-md border border-border/20 bg-background p-3 transition-colors hover:border-border/40">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{event.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{event.detail}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {event.phone && (
                                <Badge variant="outline" className="text-[9px] font-mono h-5">{event.phone}</Badge>
                              )}
                              {event.callId && (
                                <Badge variant="outline" className="text-[9px] font-mono h-5">Call {event.callId.substring(0, 8)}</Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] text-muted-foreground font-medium uppercase whitespace-nowrap">
                            {formatRelativeTime(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>

            <PaperCard variant="default" className="bg-muted/5 border-border/40">
              <PaperCardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <PhoneCall size={16} className="text-primary" />
                  <PaperCardTitle className="text-[10px] uppercase tracking-[0.2em]">Timeline</PaperCardTitle>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock size={13} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Created</p>
                    <p className="text-[11px] text-muted-foreground">{formatAbsoluteTime(campaign.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <PhoneForwarded size={13} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Started</p>
                    <p className="text-[11px] text-muted-foreground">{formatAbsoluteTime(campaign.started_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <PhoneOff size={13} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Completed</p>
                    <p className="text-[11px] text-muted-foreground">{formatAbsoluteTime(campaign.completed_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw size={13} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Last Updated</p>
                    <p className="text-[11px] text-muted-foreground">{formatRelativeTime(campaign.updated_at)}</p>
                  </div>
                </div>
              </PaperCardContent>
            </PaperCard>
          </div>
        </div>
      </main>
    </div>
  );
}
