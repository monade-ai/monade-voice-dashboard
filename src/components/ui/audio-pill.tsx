'use client';

import React, { useCallback } from 'react';
import { Play, Pause, Loader2, MoreVertical, Download, Volume2, RotateCcw, AlertCircle } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCallRecording } from '@/app/hooks/use-call-recording';

interface AudioPillProps {
  callId: string;
  sipCallId?: string | null;
  recordingUrl?: string | null;
  durationMs?: string | null;
}

export function AudioPill({ callId, sipCallId, recordingUrl: existingUrl, durationMs: existingDurationMs }: AudioPillProps) {
  const {
    recordingUrl,
    downloadUrl,
    loading,
    error,
    errorType,
    isPlaying,
    formattedDuration,
    formattedCurrentTime,
    progress,
    togglePlay,
    seek,
    audioDuration,
    fetchRecording,
  } = useCallRecording(callId, existingUrl, existingDurationMs);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * audioDuration);
  }, [audioDuration, seek]);

  const handleDownload = useCallback(() => {
    const triggerDownload = async () => {
      // Prefer the dedicated download_url (triggers save-as), fall back to the
      // signed playback URL returned by the prepare -> status flow.
      const url = downloadUrl || recordingUrl || await fetchRecording();
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${callId}.mp3`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    };

    void triggerDownload();
  }, [downloadUrl, recordingUrl, fetchRecording, callId]);

  // No SIP call ID — recording not possible
  if (!sipCallId && !existingUrl && !recordingUrl) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 text-muted-foreground/50">
        <Volume2 size={16} className="opacity-40" />
        <span className="text-[10px] font-bold uppercase tracking-widest">No recording available</span>
      </div>
    );
  }

  // Error state
  if (error && !loading && !recordingUrl) {
    return (
      <div className="flex items-center gap-3 bg-muted/20 border border-border/40 rounded-full px-4 py-2 w-full max-w-4xl">
        <AlertCircle size={16} className="text-muted-foreground/60 shrink-0" />
        <span className="text-[11px] text-muted-foreground flex-1 truncate">{error}</span>
        {errorType === 'not_yet_available' && (
          <button
            onClick={() => fetchRecording()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground text-background text-[9px] font-bold uppercase tracking-widest hover:bg-foreground/90 transition-colors shrink-0"
          >
            <RotateCcw size={10} />
            Retry
          </button>
        )}
      </div>
    );
  }

  const displayTime = isPlaying ? formattedCurrentTime : '0:00';
  const displayDuration = formattedDuration || '--:--';

  return (
    <div className="flex items-center gap-4 bg-muted/20 border border-border/40 rounded-full pl-2 pr-4 py-2 w-full max-w-4xl shadow-sm group transition-all">

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={loading}
        className="w-10 h-10 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center justify-center shadow-md disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Progress / Info Area */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold font-mono text-foreground tracking-tighter">{displayTime}</span>
          <div className="flex items-center gap-2">
            {loading && <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 animate-pulse">Preparing...</span>}
            <span className="text-[10px] font-bold font-mono text-muted-foreground/60">{displayDuration}</span>
          </div>
        </div>
        <div
          className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="absolute inset-0 bg-primary/40 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
          {progress > 0 && (
            <div
              className="absolute top-0 h-full w-px bg-primary shadow-[0_0_8px_rgba(250,204,21,0.8)]"
              style={{ left: `${progress}%` }}
            />
          )}
        </div>
      </div>

      {/* Volume / Menu Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50 focus:outline-none">
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md z-[110] border-border/40 bg-background/95 backdrop-blur-md">
            <DropdownMenuItem
              className="gap-3 cursor-pointer py-2.5"
              onClick={handleDownload}
              disabled={loading || (!sipCallId && !existingUrl && !recordingUrl && !downloadUrl)}
            >
              <Download size={14} className="text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Download Recording</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
