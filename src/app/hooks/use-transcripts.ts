'use client';

/**
 * Re-export from transcripts context for backward compatibility.
 * The actual implementation with caching is in use-transcripts-context.tsx
 */
export { useTranscripts, TranscriptsProvider } from './use-transcripts-context';
export type { Transcript, TranscriptsContextType } from './use-transcripts-context';
