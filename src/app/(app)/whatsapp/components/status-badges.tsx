'use client';

import { CheckCircle2, Clock, XCircle, HelpCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

const PILL_BASE = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] border';

type Tone = 'green' | 'yellow' | 'red' | 'gray';

const TONE_CLASS: Record<Tone, string> = {
  green: 'border-green-500/25 bg-green-500/10 text-green-600 dark:text-green-400',
  yellow: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
  gray: 'border-border/40 bg-muted/40 text-muted-foreground',
};

function Pill({ tone, icon, label }: { tone: Tone; icon?: React.ReactNode; label: string }) {
  return (
    <span className={cn(PILL_BASE, TONE_CLASS[tone])}>
      {icon}
      {label}
    </span>
  );
}

/**
 * Live WhatsApp template approval status.
 * `missing` means a flow mapping points at a template that no longer exists.
 */
export function TemplateStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'APPROVED') {
    return <Pill tone="green" icon={<CheckCircle2 size={11} />} label="Approved" />;
  }
  if (normalized === 'PENDING' || normalized === 'IN_REVIEW' || normalized === 'PENDING_REVIEW') {
    return <Pill tone="yellow" icon={<Clock size={11} />} label="Pending" />;
  }
  if (normalized === 'REJECTED') {
    return <Pill tone="red" icon={<XCircle size={11} />} label="Rejected" />;
  }
  if (!normalized || normalized === 'MISSING') {
    return <Pill tone="gray" icon={<HelpCircle size={11} />} label="Missing" />;
  }

  return <Pill tone="gray" label={normalized} />;
}

export function ChannelStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || '').toLowerCase();

  if (['active', 'connected', 'live'].includes(normalized)) {
    return <Pill tone="green" label={status || 'Active'} />;
  }
  if (['pending', 'connecting'].includes(normalized)) {
    return <Pill tone="yellow" label={status || 'Pending'} />;
  }
  if (['error', 'failed', 'disconnected', 'inactive'].includes(normalized)) {
    return <Pill tone="red" label={status || 'Inactive'} />;
  }

  return <Pill tone="gray" label={status || 'Unknown'} />;
}

export function VerificationBadge({ status }: { status?: string | null }) {
  const normalized = (status || '').toLowerCase();

  if (['verified', 'approved'].includes(normalized)) {
    return <Pill tone="green" label={status || 'Verified'} />;
  }
  if (['pending', 'unverified', 'in_review'].includes(normalized)) {
    return <Pill tone="yellow" label={status || 'Pending'} />;
  }
  if (['rejected', 'failed'].includes(normalized)) {
    return <Pill tone="red" label={status || 'Rejected'} />;
  }

  return <Pill tone="gray" label={status || 'Unknown'} />;
}
