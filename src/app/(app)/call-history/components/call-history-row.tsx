'use client';

import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  Clock,
  MessageSquare,
  Activity,
  Play,
  Pause,
  Loader2,
  Download,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { LeadIcon } from '@/components/ui/lead-icon';
import { cn } from '@/lib/utils';
import { CallAnalytics, BillingData } from '@/app/hooks/use-analytics';
import { Transcript } from '@/app/hooks/use-transcripts';
import { useCallRecording } from '@/app/hooks/use-call-recording';

interface CallHistoryRowProps {
  transcript: Transcript;
  analytics?: CallAnalytics;
  onView: () => void;
}

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const CallHistoryRow = React.memo(({
  transcript,
  analytics,
  onView,
}: CallHistoryRowProps) => {
  const hasSipCallId = !!(analytics?.sip_call_id || analytics?.recording_url);
  const {
    loading: recordingLoading,
    isPlaying,
    formattedDuration,
    formattedCurrentTime,
    progress,
    togglePlay,
    downloadUrl,
    recordingUrl,
  } = useCallRecording(
    transcript.call_id,
    analytics?.recording_url,
    analytics?.recording_duration_ms,
  );

  const isEngaged = transcript.has_conversation || (analytics && analytics.verdict !== 'no_answer');
  const verdictRaw = analytics?.verdict || (isEngaged ? 'conversation' : 'no_answer');
  const verdict = analytics?.verdict ? analytics.verdict.replace('_', ' ') : (isEngaged ? 'Conversation' : 'No Answer');
  const summary = analytics?.summary || (isEngaged ? 'Call transcript available for review.' : 'No interaction recorded.');
  const quality = analytics?.call_quality || 'N/A';
  const duration = typeof analytics?.key_discoveries?.duration_seconds === 'number'
    ? analytics.key_discoveries.duration_seconds
    : (analytics?.duration_seconds ?? undefined);
  const billing = analytics?.billing_data;

  const dotColor = useMemo(() => {
    const colors: Record<string, string> = {
      interested: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]',
      not_interested: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
      callback: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
      conversation: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]',
      no_answer: 'bg-gray-500/40',
    };

    return colors[verdictRaw] || 'bg-gray-500/40';
  }, [verdictRaw]);

  return (
    <tr
      className={cn(
        'group border-b border-border/40 transition-all duration-300',
        isEngaged ? 'bg-[#facc15]/[0.02] hover:bg-[#facc15]/[0.05]' : 'hover:bg-muted/30',
      )}
    >
      {/* 1. Lead Identity */}
      <td className="py-3 px-6">
        <div className="flex items-center gap-3">
          <LeadIcon seed={transcript.call_id} size={28} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground tracking-tight selection:bg-primary selection:text-black">
              {transcript.phone_number}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              ID: {transcript.call_id.substring(0, 8)}
            </span>
          </div>
        </div>
      </td>

      {/* 2. Interaction */}
      <td className="py-3 px-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {getRelativeTime(transcript.created_at)}
            </span>
          </div>
          {duration && (
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-primary/60" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {formatDuration(duration)}
              </span>
            </div>
          )}
          {billing && typeof billing.credits_used === 'number' ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">
                {billing.credits_used.toFixed(2)} cr
              </span>
              {billing.recording_enabled && (
                <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">
                  +rec
                </span>
              )}
            </div>
          ) : isEngaged && !billing ? (
            <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider mt-0.5">
              No billing data
            </span>
          ) : null}
        </div>
      </td>

      {/* 3. AI Analysis */}
      <td className="py-3 px-6">
        <div className="flex flex-col gap-1 max-w-[300px]">
          <div className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full transition-colors duration-500', dotColor)} />
            <span className={cn(
              'text-[11px] font-bold uppercase tracking-widest',
              isEngaged ? 'text-foreground' : 'text-muted-foreground/50',
            )}>
              {verdict}
            </span>
            {quality !== 'N/A' && (
              <span className="text-[9px] text-muted-foreground/60 ml-1">
                ({quality})
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1 italic leading-relaxed">
            &quot;{summary}&quot;
          </p>
        </div>
      </td>

      {/* 4. Actions */}
      <td className="py-3 px-6 text-right">
        <div className="flex items-center justify-end gap-3">
          {isEngaged && hasSipCallId ? (
            <div className="flex items-center gap-2">
              <motion.div
                layout
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center"
              >
                <motion.button
                  layout
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  disabled={recordingLoading}
                  className={cn(
                    'h-7 flex items-center bg-foreground text-background font-bold tracking-widest overflow-hidden transition-all duration-500 rounded-full disabled:opacity-60',
                    isPlaying ? 'px-3 gap-3 w-48' : 'px-3 gap-2 w-auto',
                  )}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {recordingLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={12} fill="currentColor" />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    {!isPlaying && !recordingLoading && <span className="text-[9px] uppercase">{formattedDuration || formatDuration(duration)}</span>}
                    {recordingLoading && <span className="text-[9px] uppercase">Preparing</span>}
                  </div>

                  {isPlaying && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <div className="flex-1 h-1 bg-background/20 rounded-full relative overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="absolute inset-y-0 left-0 bg-background"
                        />
                      </div>
                      <span className="text-[8px] font-mono tabular-nums opacity-60">{formattedCurrentTime}</span>
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>

              {(downloadUrl || recordingUrl) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = downloadUrl || recordingUrl;
                    if (!url) return;
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recording-${transcript.call_id}.mp3`;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.click();
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
                  title="Download recording"
                >
                  <Download size={11} />
                </button>
              )}

              <div className="flex items-center min-w-[14px] group-hover:hidden transition-all">
                <MessageSquare
                  size={14}
                  className="text-muted-foreground/60"
                />
              </div>
            </div>
          ) : (
            <MessageSquare size={14} className="text-muted-foreground/60 group-hover:hidden" />
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="opacity-0 group-hover:opacity-100 h-7 px-4 rounded-[4px] bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
          >
            Details
            <ArrowUpRight size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

CallHistoryRow.displayName = 'CallHistoryRow';
