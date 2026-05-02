# Frontend Guide — Call Direction, Billing Audit & Provider Status on Analytics

**Audience:** Frontend team rendering the call analytics list / detail views.
**Status:** Backend changes shipped. Update your selectors/components when you redeploy the dashboard.
**Service touched:** `monade-voice-config-server` → `routes/analytics/analytics.routes.js`

---

## TL;DR

Four `GET /api/analytics*` endpoints used to strip out the columns that tell you whether a call was inbound vs outbound, how long it lasted, what was billed, and what the telephony provider's CDR said. We were storing all of that — just not returning it.

**Now we are.** No new endpoints, no breaking changes — the existing response shapes simply gain seven new fields per `analytics` record. Render them where they help; ignore them where they don't.

---

## Endpoints affected

All four list/get endpoints in `analytics.routes.js`:

| Method | Path | Used for |
|---|---|---|
| `GET` | `/api/analytics?user_uid=...` | Main analytics list |
| `GET` | `/api/analytics/:call_id` | Detail panel for a single call |
| `GET` | `/api/analytics/user/:user_uid` | User-scoped list |
| `GET` | `/api/analytics/user/:user_uid/campaign/:campaign_id` | Campaign drilldown |

---

## New fields on every `analytics` record

```ts
type CallAnalyticsRecord = {
  // ────────── Existing fields (unchanged) ──────────
  id: string;
  call_id: string;
  user_uid?: string;          // only on /:call_id endpoint
  analytics: object;          // post-processing template output
  transcript_url: string;
  phone_number: string;
  sip_call_id: string | null; // Vobiz/telephony call ID
  recording_url: string | null;
  enhanced_transcript_url: string | null;
  campaign_id: string | null;
  created_at: string;         // ISO timestamp
  updated_at: string;

  // ────────── NEW: call timing ──────────
  call_started_at: string | null;   // ISO timestamp, UTC. When billing started.
  call_ended_at: string | null;     // ISO timestamp, UTC. When billing ended.
  duration_seconds: number | null;  // Total call duration

  // ────────── NEW: billing audit ──────────
  billing_data: {
    assistant_id?: string;
    credits_used?: number;
    cost_per_minute?: number;
    recording_enabled?: boolean;
    recording_surcharge_total?: number;
    call_direction?: 'inbound' | 'outbound' | 'unknown';
    settlement_status?: 'ok' | 'failed';
  } | null;

  // ────────── NEW: provider/CDR ground truth ──────────
  provider_call_status: {
    status: 'answered' | 'no_answer' | 'busy' | 'failed' | 'cancelled' | string;
    hangup_cause?: string | null;
    duration?: number | null;     // seconds, from telephony provider
    end_time?: string | null;     // provider-reported end
    direction: 'inbound' | 'outbound';
    source: 'vobiz' | 'skipped';
    fetched_at: string;           // ISO timestamp
  } | null;

  // ────────── NEW: recording metadata ──────────
  recording_metadata: {
    duration_ms?: number | null;
    from_number?: string | null;
    to_number?: string | null;
    recording_available_after_ms?: number | null;
    fetched_at?: string;
  } | null;
};
```

---

## What to render & where

### 1. Call direction badge

The single most useful new field. Use it as a column in the list view and as a badge in the detail header.

```tsx
const direction = record.billing_data?.call_direction
  ?? record.provider_call_status?.direction
  ?? 'unknown';

// 📞 Inbound  |  📱 Outbound  |  — (unknown)
```

**Why two sources?** `billing_data.call_direction` is set when the call starts and is always present on settled calls. `provider_call_status.direction` comes from the telephony provider's CDR and is the authoritative ground truth, but only fills in after the post-processing sweeper runs (a few minutes to a few hours later). Prefer `billing_data` for instant display; if it's missing, fall back to `provider_call_status`.

**Conflict policy:** If the two values disagree, **trust `provider_call_status`** (it's the carrier's view of the call). This should essentially never happen — if it does, log it; we want to know.

---

### 2. Call duration

```tsx
const seconds = record.duration_seconds
  ?? record.provider_call_status?.duration
  ?? 0;

// Format mm:ss
const formatted = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
```

`duration_seconds` is what we billed against. `provider_call_status.duration` is what the carrier saw. They should match within a second or two. Display the billed duration; surface the provider one only in a debug/audit panel.

---

### 3. Call timing (started/ended)

```tsx
// Stored as UTC. Convert to user's locale in the browser.
const startedAt = record.call_started_at
  ? new Date(record.call_started_at).toLocaleString(undefined, { timeZone: userTz })
  : null;
```

Use these in the detail view, not the list (too noisy for a row). For the list, `created_at` is still fine as the sort key.

---

### 4. Outcome/status badge (provider ground truth)

```tsx
const status = record.provider_call_status?.status;

// status === 'answered'  → green "Connected"
// status === 'no_answer' → grey "No Answer"
// status === 'busy'      → yellow "Busy"
// status === 'failed'    → red "Failed"
// status === undefined   → grey "Pending CDR"
```

This is **separate from the analytics verdict**. Analytics tells you what the conversation was *about*. `provider_call_status.status` tells you whether the call *connected* at all. Both are useful — show both.

`hangup_cause` is provider-specific shorthand (e.g. `NORMAL_CLEARING`, `USER_BUSY`). Surface it as a tooltip on the badge, not a column.

---

### 5. Billing breakdown (detail view only)

In the detail panel, render a small table:

| Field | Source |
|---|---|
| Direction | `billing_data.call_direction` |
| Duration | `duration_seconds` |
| Credits used | `billing_data.credits_used` |
| Recording surcharge | `billing_data.recording_surcharge_total` (only if `recording_enabled`) |
| Settlement | `billing_data.settlement_status` (chip: ✓ OK / ⚠ Failed) |

If `settlement_status === 'failed'`, render a red warning chip — that means the billing service couldn't write back to the wallet ledger. Engineering should investigate; the user shouldn't be charged twice.

---

### 6. Recording icon

```tsx
const hasRecording = Boolean(record.recording_url);
const recordingPending = !record.recording_url && record.billing_data?.recording_enabled;
```

- `hasRecording` → solid 🔴 record icon, click → play.
- `recordingPending` → outlined 🔴 record icon with tooltip "Recording is being prepared, check back in a few minutes." (Recording sweeper hasn't fetched yet.)
- Neither → no icon (recording was disabled for this call).

---

## Filtering & sorting

### Filter by direction (recommended UX)

Add an `Inbound | Outbound | All` toggle above the list. **Filter client-side** for now — `billing_data` is a JSON column, so server-side filtering would need a JSON path query. With typical page sizes (≤500 rows) client-side is fine.

If page sizes grow past ~1000 rows, ping backend; we'll either add a `?direction=inbound` query param (server-side JSON filter) or promote `call_direction` to a top-level Prisma column with an index. Don't pre-optimize.

### Sort

Default sort stays `created_at desc`. If you add a "longest call first" sort, key it on `duration_seconds` (handle nulls last).

---

## Important caveats

1. **`billing_data` may be `null`** on very old rows written before the billing audit was added. Render `—` placeholders, never assume the object exists. Always optional-chain: `record.billing_data?.call_direction`.

2. **`provider_call_status` may be `null`** while the CDR sweeper hasn't run yet. Inbound calls usually reconcile within minutes; outbound calls can take up to a few hours depending on the carrier. Show "Pending CDR" instead of "Failed" when it's null.

3. **`call_started_at` / `call_ended_at` are UTC.** Convert in the browser using the user's timezone — don't assume IST or any other locale.

4. **`duration_seconds === 0`** is a valid value (call placed but never connected). Don't treat 0 as "missing" — check for `null` explicitly.

5. **Recording URLs are signed and expire.** If you cache the response client-side and a `recording_url` 403s on click, refetch the analytics record to get a fresh URL.

---

## Sample response (one record)

```json
{
  "id": "a3f9...",
  "call_id": "RPC_abc123",
  "analytics": { "verdict": "interested", "confidence_score": 0.87, "...": "..." },
  "transcript_url": "https://storage.googleapis.com/.../transcript.txt",
  "phone_number": "+919876543210",
  "sip_call_id": "vobiz-uuid-xyz",
  "recording_url": "https://storage.googleapis.com/.../recording.mp3",
  "enhanced_transcript_url": null,
  "campaign_id": "camp-456",
  "call_started_at": "2026-04-21T14:47:12.000Z",
  "call_ended_at":   "2026-04-21T14:49:46.000Z",
  "duration_seconds": 154,
  "billing_data": {
    "assistant_id": "95617f6b-c1ae-4f11-941a-d9ba244da5c5",
    "credits_used": 2.567,
    "cost_per_minute": 1.0,
    "recording_enabled": true,
    "recording_surcharge_total": 1.283,
    "call_direction": "inbound",
    "settlement_status": "ok"
  },
  "provider_call_status": {
    "status": "answered",
    "hangup_cause": "NORMAL_CLEARING",
    "duration": 154,
    "end_time": "2026-04-21T14:49:46.000Z",
    "direction": "inbound",
    "source": "vobiz",
    "fetched_at": "2026-04-21T14:55:01.122Z"
  },
  "recording_metadata": {
    "duration_ms": 154300,
    "from_number": "+919876543210",
    "to_number": "+918888888888",
    "recording_available_after_ms": 240000,
    "fetched_at": "2026-04-21T14:55:01.122Z"
  },
  "created_at": "2026-04-21T14:49:46.500Z",
  "updated_at": "2026-04-21T14:55:01.122Z"
}
```

---

## Backend reference (for context, not required reading)

- **Where direction is set:** `agent.py` reads `dispatch_metadata.call_type` (`"inbound"` baked into dispatch rules by `inbound_trunk_api.py`, `"outbound"` set live by `control-plane/outbound_call.py`) and forwards it to `billing_service` on `start_call`.
- **Where it's persisted:** `billing_service.end_call` → `POST /api/users/:user_uid/credits/settle-call` → `routes/credits/credits.routes.js` writes `billing_data`, `call_started_at`, `call_ended_at`, `duration_seconds` onto `CallAnalytics`.
- **Where provider status is filled:** Post-processing CDR sweeper calls `POST /api/analytics/:call_id/provider-status`.

---

## Questions / changes needed?

- Need server-side filtering on direction → ping backend, we'll add a query param.
- Need a top-level indexed `call_direction` column → ping backend, will require a migration.
- Field shapes differ from what's documented here → file an issue; the schema may have drifted.
