# Frontend Guide — Auto-Enhanced Transcript (Account Setting)

A single per-user toggle. When **on**, every successful outbound call is automatically run through the Gemini-on-audio enhanced-transcript pipeline once Vobiz makes the recording available. No per-call action required by the user.

When **off** (default), the user keeps clicking the "Generate enhanced transcript" button per call (the existing flow).

---

## TL;DR for the integration

1. On the account/settings page, render a single toggle: **"Auto-generate enhanced transcript for outbound calls"**.
2. Initial state — read `user.autoEnhancedTranscript` from `GET /api/users/{user_uid}`.
3. Flip the toggle — `PATCH /api/users/{user_uid}/auto-enhanced-transcript` with `{ "enabled": true | false }`.
4. That's the entire frontend surface for this feature.

The actual fetching, polling Vobiz, downloading the recording, and triggering Gemini all happen in the backend automatically. The frontend doesn't poll, doesn't track state, doesn't change anything else.

---

## Endpoints

### 1. Read current toggle state

```http
GET /api/users/{user_uid}
Authorization: Bearer <token>
```

Response (relevant field):
```json
{
  "user_uid": "...",
  "email_id": "...",
  "name": "...",
  "available_credits": "100.0000",
  "autoEnhancedTranscript": false,
  ...
}
```

The `autoEnhancedTranscript` field is a boolean. Default for all existing users is `false`.

### 2. Toggle (write)

```http
PATCH /api/users/{user_uid}/auto-enhanced-transcript
Authorization: Bearer <token>
Content-Type: application/json

{ "enabled": true }
```

Response:
```json
{
  "user_uid": "...",
  "autoEnhancedTranscript": true
}
```

Errors:
- `400` — body must include `enabled` as a boolean
- `404` — user not found
- `500` — server error

---

## Suggested UI

A single checkbox / switch in the account settings page:

```
☐  Auto-generate enhanced transcript for every outbound call
   When on, every completed outbound call is automatically passed to our
   Gemini-on-audio analyzer as soon as the recording is ready (typically
   1–3 minutes after the call ends). Inbound calls are not affected.
```

Optionally add a tooltip / info popup:
> Cost note: each enhanced transcript runs Gemini on the call audio. If you
> have high volume and don't need this for every call, leave it off and
> generate on-demand from the call detail page.

---

## What changes in your existing UI when this is on

**Nothing forced.** All existing routes still work the same:
- The "Generate enhanced transcript" button still works on individual calls.
- The status-polling endpoint (`GET /api/analytics/{call_id}/enhanced-transcript`) returns the same shapes.

The only difference: when the toggle is **on**, by the time a user opens a call's detail page, the enhanced transcript is often already ready (`status: "ready"` from the same GET endpoint). You don't need to disable the manual button — calling the trigger when it's already running is a safe no-op.

---

## How it works under the hood (for context, not for you to implement)

1. Call ends → agent fires Pub/Sub event → post-processing pod runs Gemini analytics on the transcript text and creates the `CallAnalytics` row.
2. Same pod's CDR sweeper (every 30s) batch-fetches Vobiz CDR data and writes the truthful call status to `provider_call_status` on the row.
3. If the call was a successful outbound (`status: completed`, `duration > 0`, `direction: outbound`) AND the user has `autoEnhancedTranscript = true`, a recording-fetch job goes onto a separate queue.
4. Recording sweeper waits 90s after CDR success (Vobiz needs time to transcode + upload), then polls the recording endpoint with backoff `2m → 3m → 5m → 10m → 15m → 25m`. Drops after 35 min.
5. Once the recording lands, it POSTs to the existing `/api/analytics/{call_id}/enhanced-transcript` route — same path your manual button uses.
6. Your existing GET on that route returns `processing` then `ready` as usual.

The toggle acts purely as a gate at step 3.

---

## Edge cases the frontend should handle

- **Toggle is on but enhanced transcript never appears for a specific call**: it could be a no-answer / busy / failed call — those don't have a recording to process and never trigger enhanced. This is expected. The `provider_call_status.status` field on the analytics row tells you which it was. Don't warn the user about it.
- **Toggle is on and call was completed but transcript still not ready after ~5 min**: still processing. The pipeline gives up at 35 min. After that, the manual button always works as a fallback.
- **Inbound calls**: never auto-enhanced regardless of toggle. The settings UI copy should mention this.

---

## Questions / contact

Backend owner: this team. Reach out for:
- Cost projections for users with high outbound volume
- Adding a per-assistant override (currently account-level only)
- Adding usage stats (how many auto-runs hit per billing cycle)

Endpoints documented in [unified-api-collection.json](../../unified-api-collection.json) under:
- **PostgreSQL DB Routes → Account Settings (User Toggles)**
- **PostgreSQL DB Routes → Analytics Management → Get Provider Call Status**
