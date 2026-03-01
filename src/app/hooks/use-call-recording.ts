'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import { ApiError, fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';

// --- Types ---

interface RecordingResponse {
    call_id: string;
    recording_url: string | null;
    recording_id?: string;
    duration_ms?: string;
    cached?: boolean;
    message?: string;
    error?: string;
}

export type RecordingErrorType =
    | 'not_yet_available'
    | 'no_sip_call_id'
    | 'service_not_configured'
    | 'unknown';

interface CachedRecording {
    url: string;
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

// --- Hook ---

export function useCallRecording(callId: string, existingRecordingUrl?: string | null, existingDurationMs?: string | null) {
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    const [durationMs, setDurationMs] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<RecordingErrorType | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const animFrameRef = useRef<number>(0);

    // Initialize from existing data or cache
    useEffect(() => {
        if (existingRecordingUrl) {
            setRecordingUrl(existingRecordingUrl);
            if (existingDurationMs) {
                setDurationMs(parseFloat(existingDurationMs));
            }
            recordingCache.set(callId, {
                url: existingRecordingUrl,
                durationMs: existingDurationMs ? parseFloat(existingDurationMs) : null,
            });
        } else {
            const cached = recordingCache.get(callId);
            if (cached) {
                setRecordingUrl(cached.url);
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

    const fetchRecording = useCallback(async (): Promise<string | null> => {
        // Check cache first
        const cached = recordingCache.get(callId);
        if (cached) {
            setRecordingUrl(cached.url);
            setDurationMs(cached.durationMs);
            return cached.url;
        }

        setLoading(true);
        setError(null);
        setErrorType(null);

        try {
            const data = await fetchJson<RecordingResponse>(
                `${MONADE_API_BASE}/api/analytics/${callId}/recording`,
                { retry: { retries: 0 } },
            );

            if (data.recording_url) {
                const dur = data.duration_ms ? parseFloat(data.duration_ms) : null;
                recordingCache.set(callId, { url: data.recording_url, durationMs: dur });
                setRecordingUrl(data.recording_url);
                setDurationMs(dur);
                return data.recording_url;
            }

            // No recording URL in response
            const errType = 'not_yet_available';
            setErrorType(errType);
            setError(data.message || 'Recording not available');
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
            return null;
        } finally {
            setLoading(false);
        }
    }, [callId]);

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
