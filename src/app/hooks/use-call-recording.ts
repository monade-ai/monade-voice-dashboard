'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { ApiError, fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';
import {
  clearLocalCacheByResource,
  createScopedCacheKey,
  getCurrentOrganizationId,
  readLocalCache,
  removeLocalCache,
  writeLocalCache,
} from '@/lib/utils/client-cache';

import { useMonadeUser } from './use-monade-user';

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
  cachedAt: number;
}

class RecordingPreparationError extends Error {
  errorType: RecordingErrorType;

  constructor(message: string, errorType: RecordingErrorType) {
    super(message);
    this.name = 'RecordingPreparationError';
    this.errorType = errorType;
  }
}

// --- Client-side cache ---

const recordingCache = new Map<string, CachedRecording>();
const recordingInFlight = new Map<string, Promise<CachedRecording>>();
const toastCooldowns = new Map<string, number>();

// --- Global singleton audio for one-at-a-time playback ---

let globalAudio: HTMLAudioElement | null = null;
let globalActiveCallId: string | null = null;
const listeners = new Set<() => void>();

const SIGNED_URL_TTL_MS = 29 * 60 * 1000;
const TOAST_COOLDOWN_MS = 6000;
const DOWNLOAD_IFRAME_CLEANUP_MS = 60_000;
const RECORDING_CACHE_RESOURCE = 'recording-signed-url';

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function shouldUseCachedRecording(cached?: CachedRecording) {
  return Boolean(
    cached
    && !isLegacyProviderRecordingUrl(cached.url)
    && (Date.now() - cached.cachedAt) < SIGNED_URL_TTL_MS,
  );
}

function isLegacyProviderRecordingUrl(url?: string | null) {
  return Boolean(url && url.includes('media.vobiz.ai'));
}

function getRecordingMemoryKey(userUid: string | null | undefined, callId: string) {
  return createScopedCacheKey(
    { userUid: userUid || 'anonymous', organizationId: getCurrentOrganizationId() },
    RECORDING_CACHE_RESOURCE,
    { callId },
  );
}

function getRecordingLocalCacheKey(userUid: string, callId: string) {
  return createScopedCacheKey(
    { userUid, organizationId: getCurrentOrganizationId() },
    RECORDING_CACHE_RESOURCE,
    { callId },
  );
}

function getFreshCachedRecording(callId: string, userUid?: string | null) {
  const memoryKey = getRecordingMemoryKey(userUid, callId);
  const cached = recordingCache.get(memoryKey);
  if (shouldUseCachedRecording(cached)) return cached;
  if (cached) recordingCache.delete(memoryKey);

  if (!userUid) return null;

  const localCacheKey = getRecordingLocalCacheKey(userUid, callId);
  const persisted = readLocalCache<CachedRecording>(localCacheKey);
  if (persisted && shouldUseCachedRecording(persisted.value)) {
    recordingCache.set(memoryKey, persisted.value);

    return persisted.value;
  }

  return null;
}

function cacheRecording(callId: string, userUid: string | null | undefined, cached: CachedRecording) {
  recordingCache.set(getRecordingMemoryKey(userUid, callId), cached);
  if (userUid) {
    writeLocalCache(getRecordingLocalCacheKey(userUid, callId), cached, SIGNED_URL_TTL_MS);
  }
}

function clearCachedRecording(callId: string, userUid?: string | null) {
  if (userUid) {
    recordingCache.delete(getRecordingMemoryKey(userUid, callId));
    removeLocalCache(getRecordingLocalCacheKey(userUid, callId));

    return;
  }

  for (const key of recordingCache.keys()) {
    recordingCache.delete(key);
  }
  clearLocalCacheByResource(RECORDING_CACHE_RESOURCE);
}

function showRecordingToast(key: string, title: string, description: string) {
  const now = Date.now();
  const lastShownAt = toastCooldowns.get(key) ?? 0;
  if ((now - lastShownAt) < TOAST_COOLDOWN_MS) return;

  toast(title, { description });
  toastCooldowns.set(key, now);
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
    globalAudio.addEventListener('error', () => {
      if (globalActiveCallId) {
        clearCachedRecording(globalActiveCallId);
        showRecordingToast(
          `recording-expired:${globalActiveCallId}`,
          'Recording link expired',
          'Please try again. We will fetch a fresh secure link for playback.',
        );
      }
      globalActiveCallId = null;
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
  if (err instanceof RecordingPreparationError) return err.errorType;
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function toCachedRecording(
  data: { url?: string; download_url?: string },
  durationMs: number | null,
): CachedRecording {
  if (!data.url || isLegacyProviderRecordingUrl(data.url)) {
    throw new RecordingPreparationError('Recording link was invalid. Please try again.', 'unknown');
  }

  return {
    url: data.url,
    downloadUrl: data.download_url || null,
    durationMs,
    cachedAt: Date.now(),
  };
}

async function prepareRecordingUntilReady(callId: string, durationMs: number | null): Promise<CachedRecording> {
  const data = await fetchJson<PrepareResponse>(
    `${MONADE_API_BASE}/api/analytics/${callId}/recording/prepare`,
    { method: 'POST', retry: { retries: 0 } },
  );

  if (data.status === 'ready') return toCachedRecording(data, durationMs);
  if (data.status === 'failed') {
    throw new RecordingPreparationError(data.error || 'Recording preparation failed', 'not_yet_available');
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const status = await fetchJson<StatusResponse>(
      `${MONADE_API_BASE}/api/analytics/${callId}/recording/status`,
      { retry: { retries: 0 } },
    );

    if (status.status === 'ready') return toCachedRecording(status, durationMs);
    if (status.status === 'failed') {
      throw new RecordingPreparationError(status.error || 'Recording preparation failed', 'not_yet_available');
    }
  }

  throw new RecordingPreparationError('Recording preparation timed out. Try again.', 'not_yet_available');
}

function startAnchorDownload(url: string, callId: string, openInNewTab = false) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `recording-${callId}.mp3`;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  if (openInNewTab) a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function startAttachmentDownload(url: string) {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.display = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), DOWNLOAD_IFRAME_CLEANUP_MS);
}

async function downloadPlaybackUrlAsBlob(url: string, callId: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Recording download failed with ${response.status}`);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  startAnchorDownload(objectUrl, callId);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

// --- Hook ---

export function useCallRecording(callId: string, existingRecordingUrl?: string | null, existingDurationMs?: string | null) {
  const { userUid } = useMonadeUser();
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

  const parsedExistingDurationMs = existingDurationMs && Number.isFinite(parseFloat(existingDurationMs))
    ? parseFloat(existingDurationMs)
    : null;

  // Initialize from cache only. The analytics `recording_url` field comes from the
  // legacy endpoint path, so we treat it as an availability hint rather than a
  // streamable URL. Playback/download should only use signed URLs returned by
  // the prepare -> status flow.
  useEffect(() => {
    setRecordingUrl(null);
    setDownloadUrl(null);
    setError(null);
    setErrorType(null);

    setDurationMs(parsedExistingDurationMs);

    const cached = getFreshCachedRecording(callId, userUid);
    if (shouldUseCachedRecording(cached)) {
      setRecordingUrl(cached.url);
      setDownloadUrl(cached.downloadUrl);
      setDurationMs(cached.durationMs ?? parsedExistingDurationMs);
    }
  }, [callId, existingRecordingUrl, parsedExistingDurationMs, userUid]);

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
    if (isLegacyProviderRecordingUrl(url)) {
      setError('Recording link was invalid. Please try again.');
      setErrorType('unknown');
      return;
    }

    const cached: CachedRecording = {
      url,
      downloadUrl: dlUrl || null,
      durationMs: parsedExistingDurationMs,
      cachedAt: Date.now(),
    };
    cacheRecording(callId, userUid, cached);
    setRecordingUrl(url);
    setDownloadUrl(dlUrl || null);
    setDurationMs(parsedExistingDurationMs);
    setError(null);
    setErrorType(null);
  }, [callId, parsedExistingDurationMs, userUid]);

  const fetchRecording = useCallback(async (): Promise<string | null> => {
    // Check cache first
    const freshCached = getFreshCachedRecording(callId, userUid);
    if (freshCached) {
      setRecordingUrl(freshCached.url);
      setDownloadUrl(freshCached.downloadUrl);
      setDurationMs(freshCached.durationMs ?? parsedExistingDurationMs);
      return freshCached.url;
    }

    const memoryKey = getRecordingMemoryKey(userUid, callId);
    const cached = recordingCache.get(memoryKey);
    if (cached) {
      clearCachedRecording(callId, userUid);
      setRecordingUrl(null);
      setDownloadUrl(null);
      showRecordingToast(
        `recording-expired:${callId}`,
        'Recording link expired',
        'Fetching a fresh secure link for this recording now.',
      );
    } else if (existingRecordingUrl) {
      showRecordingToast(
        `recording-refresh:${callId}`,
        'Preparing recording',
        'Creating a fresh secure link. This can take a few seconds.',
      );
    }

    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      let request = recordingInFlight.get(memoryKey);
      if (!request) {
        request = prepareRecordingUntilReady(callId, parsedExistingDurationMs).then((recording) => {
          cacheRecording(callId, userUid, recording);

          return recording;
        }).finally(() => {
          recordingInFlight.delete(memoryKey);
        });
        recordingInFlight.set(memoryKey, request);
      }

      const recording = await request;
      handleReady(recording.url, recording.downloadUrl ?? undefined);
      setDurationMs(recording.durationMs ?? parsedExistingDurationMs);
      setLoading(false);

      return recording.url;
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
  }, [callId, existingRecordingUrl, handleReady, parsedExistingDurationMs, userUid]);

  const play = useCallback(async () => {
    const freshCached = getFreshCachedRecording(callId, userUid);
    const url = freshCached?.url ?? await fetchRecording();
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
  }, [callId, fetchRecording, userUid]);

  const downloadRecording = useCallback(async () => {
    const freshCached = getFreshCachedRecording(callId, userUid);
    let downloadUrl = freshCached?.downloadUrl || null;
    let playbackUrl = freshCached?.url || null;
    if (!downloadUrl && !playbackUrl) {
      const preparedPlaybackUrl = await fetchRecording();
      const prepared = getFreshCachedRecording(callId, userUid);
      downloadUrl = prepared?.downloadUrl || null;
      playbackUrl = prepared?.url || preparedPlaybackUrl;
    }
    if (downloadUrl) {
      startAttachmentDownload(downloadUrl);
      toast.success('Download started');

      return true;
    }
    if (!playbackUrl) return false;

    try {
      await downloadPlaybackUrlAsBlob(playbackUrl, callId);
      toast.success('Download started');
    } catch (err) {
      console.warn('[useCallRecording] Falling back to opening recording URL:', err);
      startAnchorDownload(playbackUrl, callId, true);
    }

    return true;
  }, [callId, fetchRecording, userUid]);

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

  const freshCached = getFreshCachedRecording(callId, userUid);
  const activeRecordingUrl = freshCached ? recordingUrl : null;
  const activeDownloadUrl = freshCached ? downloadUrl : null;

  return {
    recordingUrl: activeRecordingUrl,
    downloadUrl: activeDownloadUrl,
    durationMs,
    loading,
    error,
    errorType,
    isPlaying,
    currentTime,
    audioDuration,
    fetchRecording,
    downloadRecording,
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
