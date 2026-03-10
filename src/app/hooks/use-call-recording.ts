'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import { ApiError, fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';

// --- Types ---

interface PrepareResponse {
  status: 'processing' | 'ready' | 'failed';
  url?: string;
  download_url?: string;
  error?: string;
}

interface StatusResponse {
  status: 'processing' | 'ready' | 'failed' | 'not_started';
  url?: string;
  download_url?: string;
  error?: string;
}

export type RecordingErrorType =
  | 'not_yet_available'
  | 'no_sip_call_id'
  | 'service_not_configured'
  | 'unknown';

interface CachedRecording {
  url: string;
  downloadUrl: string | null;
  durationMs: number | null;
}

// --- Client-side cache ---

const recordingCache = new Map<string, CachedRecording>();

// --- Global singleton audio for one-at-a-time playback ---

let globalAudio: HTMLAudioElement | null = null;
let globalActiveCallId: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function getOrCreateAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.addEventListener('ended', () => {
      globalActiveCallId = null;
      notifyListeners();
    });
    globalAudio.addEventListener('pause', () => {
      notifyListeners();
    });
    globalAudio.addEventListener('playing', () => {
      notifyListeners();
    });
  }
  return globalAudio;
}

export function stopGlobalAudio() {
  const audio = globalAudio;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  globalActiveCallId = null;
  notifyListeners();
}

// --- Helpers ---

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function classifyError(err: unknown): RecordingErrorType {
  if (err instanceof ApiError) {
    if (err.status === 503) return 'service_not_configured';
    if (err.status === 404) {
      const data = err.data as Record<string, unknown> | undefined;
      const message = (data?.message as string) || err.message || '';
      if (message.toLowerCase().includes('not yet available') || message.toLowerCase().includes('try again')) {
        return 'not_yet_available';
      }
      return 'no_sip_call_id';
    }
  }
  return 'unknown';
}

// --- Constants ---
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

// --- Hook ---

export function useCallRecording(callId: string, existingRecordingUrl?: string | null, existingDurationMs?: string | null) {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<RecordingErrorType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const animFrameRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Initialize from existing data or cache
  useEffect(() => {
    if (existingRecordingUrl) {
      setRecordingUrl(existingRecordingUrl);
      if (existingDurationMs) {
        setDurationMs(parseFloat(existingDurationMs));
      }
      recordingCache.set(callId, {
        url: existingRecordingUrl,
        downloadUrl: null,
        durationMs: existingDurationMs ? parseFloat(existingDurationMs) : null,
      });
    } else {
      const cached = recordingCache.get(callId);
      if (cached) {
        setRecordingUrl(cached.url);
        setDownloadUrl(cached.downloadUrl);
        setDurationMs(cached.durationMs);
      }
    }
  }, [callId, existingRecordingUrl, existingDurationMs]);

  // Subscribe to global audio state changes
  useEffect(() => {
    const onStateChange = () => {
      const audio = globalAudio;
      const isMine = globalActiveCallId === callId;
      if (isMine && audio) {
        setIsPlaying(!audio.paused && !audio.ended);
        setCurrentTime(audio.currentTime);
        setAudioDuration(audio.duration || 0);
      } else {
        setIsPlaying(false);
      }
    };
    listeners.add(onStateChange);
    return () => { listeners.delete(onStateChange); };
  }, [callId]);

  // Progress tracking animation frame
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const tick = () => {
      const audio = globalAudio;
      if (audio && globalActiveCallId === callId) {
        setCurrentTime(audio.currentTime);
        setAudioDuration(audio.duration || 0);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, callId]);

  /** Handle a "ready" response — cache it and update state */
  const handleReady = useCallback((url: string, dlUrl?: string) => {
    const cached: CachedRecording = {
      url,
      downloadUrl: dlUrl || null,
      durationMs: null,
    };
    recordingCache.set(callId, cached);
    setRecordingUrl(url);
    setDownloadUrl(dlUrl || null);
    setError(null);
    setErrorType(null);
  }, [callId]);

  /** Stop any active polling */
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  /** Start polling /recording/status until ready or timeout */
  const startPolling = useCallback(() => {
    stopPolling();

    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchJson<StatusResponse>(
          `${MONADE_API_BASE}/api/analytics/${callId}/recording/status`,
          { retry: { retries: 0 } },
        );

        if (data.status === 'ready' && data.url) {
          stopPolling();
          handleReady(data.url, data.download_url);
          setLoading(false);
        } else if (data.status === 'failed') {
          stopPolling();
          setErrorType('not_yet_available');
          setError(data.error || 'Recording preparation failed');
          setLoading(false);
        }
        // 'processing' → keep polling
      } catch (err) {
        stopPolling();
        setError('Network error while checking recording status');
        setErrorType('unknown');
        setLoading(false);
      }
    }, POLL_INTERVAL_MS);

    // Safety timeout — stop polling after 2 minutes
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setLoading(false);
      setError('Recording preparation timed out. Try again.');
      setErrorType('not_yet_available');
    }, POLL_TIMEOUT_MS);
  }, [callId, handleReady, stopPolling]);

  const fetchRecording = useCallback(async (): Promise<string | null> => {
    // Check cache first
    const cached = recordingCache.get(callId);
    if (cached) {
      setRecordingUrl(cached.url);
      setDownloadUrl(cached.downloadUrl);
      setDurationMs(cached.durationMs);
      return cached.url;
    }

    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      // Step 1: POST /recording/prepare
      const data = await fetchJson<PrepareResponse>(
        `${MONADE_API_BASE}/api/analytics/${callId}/recording/prepare`,
        { method: 'POST', retry: { retries: 0 } },
      );

      if (data.status === 'ready' && data.url) {
        // Cache hit — URL available immediately
        handleReady(data.url, data.download_url);
        setLoading(false);
        return data.url;
      }

      if (data.status === 'failed') {
        setErrorType('not_yet_available');
        setError(data.error || 'Recording preparation failed');
        setLoading(false);
        return null;
      }

      // status === 'processing' — start polling
      startPolling();
      return null;
    } catch (err) {
      const errType = classifyError(err);
      setErrorType(errType);

      const messages: Record<RecordingErrorType, string> = {
        not_yet_available: 'Recording is being processed. Try again in a minute.',
        no_sip_call_id: 'Recording not available for this call.',
        service_not_configured: 'Recording service not configured.',
        unknown: 'Failed to load recording.',
      };
      setError(messages[errType]);
      setLoading(false);
      return null;
    }
  }, [callId, handleReady, startPolling]);

  const play = useCallback(async () => {
    let url = recordingUrl;
    if (!url) {
      url = await fetchRecording();
    }
    if (!url) return;

    const audio = getOrCreateAudio();

    // If same call, just toggle
    if (globalActiveCallId === callId && audio.src === url) {
      if (audio.paused) {
        audio.play().catch(console.error);
      } else {
        audio.pause();
      }
      return;
    }

    // New call — stop old, start new
    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.preload = 'auto';
    globalActiveCallId = callId;
    notifyListeners();
    audio.play().catch(console.error);
  }, [callId, recordingUrl, fetchRecording]);

  const pause = useCallback(() => {
    if (globalActiveCallId === callId && globalAudio) {
      globalAudio.pause();
    }
  }, [callId]);

  const seek = useCallback((time: number) => {
    if (globalActiveCallId === callId && globalAudio) {
      globalAudio.currentTime = time;
      setCurrentTime(time);
    }
  }, [callId]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  return {
    recordingUrl,
    downloadUrl,
    durationMs,
    loading,
    error,
    errorType,
    isPlaying,
    currentTime,
    audioDuration,
    fetchRecording,
    play,
    pause,
    seek,
    togglePlay,
    formattedDuration: durationMs ? formatDuration(durationMs) : null,
    formattedCurrentTime: formatDuration(currentTime * 1000),
    progress: audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0,
  };
}

export { formatDuration };
