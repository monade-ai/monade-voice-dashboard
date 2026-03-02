# Call Recording Playback — Re-implementation Guide

## Overview

Wire the existing (non-functional) play buttons in the dashboard table and transcript viewer to fetch and stream real call recordings from the backend API:

```
GET /api/analytics/{call_id}/recording
```

This endpoint is already proxied at `/api/proxy/[...path]/route.ts` — no new proxy is needed.

---

## Step 1 — Extend the `CallAnalytics` Interface

**File:** `src/app/hooks/use-analytics.ts`

Add three optional fields to the `CallAnalytics` interface:

```ts
sip_call_id?: string;
recording_url?: string | null;
recording_duration_ms?: string | null;
```

Then, in the `useUserAnalytics` hook, wherever analytics items are mapped from the API response (there are **two** mapping blocks — one for array items and one for single-item), add the same three fields:

```ts
sip_call_id: item.sip_call_id,
recording_url: item.recording_url,
recording_duration_ms: item.recording_duration_ms,
```

---

## Step 2 — Create the `useCallRecording` Hook

**New file:** `src/app/hooks/use-call-recording.ts`

This hook is the engine of the feature. It must:

1. **Client-side URL cache** — a module-level `Map<string, { url, durationMs }>` so the same recording never fetches twice.
2. **Global singleton audio** — module-level `HTMLAudioElement` shared across all hook instances, so only one recording ever plays at a time. When a new call starts, it stops the old one.
3. **Fetch the recording URL** — `GET /api/proxy/api/analytics/{callId}/recording`. If a `recording_url` is already passed as a prop, use it directly and warm the cache immediately — no fetch needed.
4. **Error classification** — map HTTP status codes to typed errors:
   - `404` with message containing "not yet available" → `'not_yet_available'` (processing, retry later)
   - `404` without that message → `'no_sip_call_id'` (call has no SIP leg, recording impossible)
   - `503` → `'service_not_configured'`
   - anything else → `'unknown'`
5. **Play / Pause / Seek** — methods that operate on the singleton audio element.
6. **Progress tracking** — `requestAnimationFrame` loop that updates `currentTime` while playing so consumers can show a progress bar.
7. **Global state sync** — a module-level `Set<() => void>` of listeners so that when the singleton pauses/plays/switches, all mounted hook instances update their `isPlaying` state instantly.

### Hook signature

```ts
export function useCallRecording(
  callId: string,
  existingRecordingUrl?: string | null,
  existingDurationMs?: string | null,
) {
  // returns:
  // { recordingUrl, durationMs, loading, error, errorType,
  //   isPlaying, currentTime, audioDuration, progress,
  //   formattedDuration, formattedCurrentTime,
  //   fetchRecording, play, pause, seek, togglePlay }
}
```

---

## Step 3 — Rewrite `AudioPill`

**File:** `src/components/ui/audio-pill.tsx`

The existing component is a static mock. Replace its implementation entirely.

**New props:**
```ts
interface AudioPillProps {
  callId: string;
  sipCallId?: string | null;
  recordingUrl?: string | null;
  durationMs?: string | null;
}
```

**Render logic (in order of priority):**

1. `if (!sipCallId && !recordingUrl)` → render a greyed-out "No recording available" label.
2. `if (loading)` → spinner with "Loading recording..." label.
3. `if (error)` → show error message, and for `'not_yet_available'` show a Retry button that calls `fetchRecording()`.
4. Otherwise → render the player: Play/Pause button, formatted current time / total duration, a seekable progress bar (click to seek), and a `⋯` overflow menu with a Download option.

---

## Step 4 — Wire `TranscriptViewer`

**File:** `src/components/transcript-viewer.tsx`

Find the existing `<AudioPill />` (currently rendered with no props) and pass the real data from the analytics object the viewer already holds:

```tsx
<AudioPill
  callId={callId}
  sipCallId={analytics?.sip_call_id}
  recordingUrl={analytics?.recording_url}
  durationMs={analytics?.recording_duration_ms}
/>
```

---

## Step 5 — Wire the Dashboard Table Play Button

**File:** `src/app/(app)/dashboard/page.tsx`

In the `TranscriptRow` component, the existing play button is currently a non-functional UI element with a hardcoded `"3:42"` duration. Replace it with real logic:

1. Call `useCallRecording(analytics?.call_id, analytics?.recording_url, analytics?.recording_duration_ms)` at the top of the component.
2. Determine `hasSipCallId = !!(analytics?.sip_call_id || analytics?.recording_url)`.
3. Replace the static play button with a real toggle that calls `togglePlay()` from the hook.
4. Show `loading` state with a spinner, and hide the play button entirely when `!hasSipCallId`.
5. Render the formatted duration from `formattedDuration` (or `formattedCurrentTime` while playing) instead of the hardcoded string.

---

## API Contract

```
GET /api/proxy/api/analytics/{call_id}/recording

Success 200:
{
  "call_id": "string",
  "recording_url": "https://...",   // signed URL, expires
  "recording_id": "string",
  "duration_ms": "12345",
  "cached": false
}

Not ready 404:
{ "message": "Recording not yet available, try again later" }

No SIP leg 404:
{ "message": "No sip_call_id found for this call" }

Service not configured 503:
{ "error": "..." }
```

The proxy at `/api/proxy/[...path]/route.ts` already forwards all requests to the upstream `db_services` host — no changes needed there.
