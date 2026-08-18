# College Vidya 24-hour cadence — backend and dashboard handoff

Source specification: `/mnt/e/voice_server_livekit/CV_24h_Reminder_Cadence.md`.

## Decision

Do not create two active WhatsApp flow rows for one assistant. That can allow the
standard sender and experimental scheduler to both act on the same call.

Use the existing assistant WhatsApp flow with one mutually exclusive mode:

- `standard` — existing behavior and the default for every current flow/account.
- `cv_24h_cadence` — College Vidya only; owns C1-C4 and N/U/T1/M1/M2.

Mode and cadence configuration are stored under a reserved `__automation` entry
inside the existing `WhatsappFlow.mappings` JSON. Public API responses expose
them as `flow_mode` and `cadence_config`, while returning ordinary outcome
`mappings` unchanged. No Prisma schema change or database migration is needed.

## Dashboard API contract

### 1. Discover whether the account may use the cadence

`GET /db_services/api/users/:user_uid/vobiz-whatsapp/flow-capabilities`

The College Vidya account receives `cv_24h_cadence.available=true`, the exact
schedule defaults, ten required template slots, expected Meta category, body,
buttons and footer. Every other account receives `available=false` and must only
see Standard mode.

### 2. Read an assistant flow

Existing routes remain unchanged:

- `GET /db_services/api/assistants/:assistant_id/whatsapp-flow?user_uid=...`
- `GET /db_services/api/users/:user_uid/vobiz-whatsapp/flows`

Each returned flow now additionally contains:

```json
{
  "flow_mode": "standard",
  "cadence_config": {}
}
```

Old flows with no automation metadata automatically read as `standard`.

### 3. Save a draft cadence

Use the existing PUT route. No route was removed or replaced:

`PUT /db_services/api/assistants/:assistant_id/whatsapp-flow`

While configuring, send `enabled:false`. Incomplete template assignments may be
saved as a draft and are returned in `cadence_draft_errors`.

```json
{
  "user_uid": "091cf311-6949-42fd-b1d2-de3bb4b3bf48",
  "post_processing_template_id": "<template-id>",
  "whatsapp_channel_connection_id": "<connection-id>",
  "enabled": false,
  "flow_mode": "cv_24h_cadence",
  "mappings": {
    "Qualified": { "enabled": true, "template_name": "legacy-standard-name", "language": "en" },
    "uncertain": { "enabled": true, "template_name": "legacy-standard-name", "language": "en" },
    "did_not_pick_up": { "enabled": true, "template_name": "legacy-standard-name", "language": "en" }
  },
  "cadence_config": {
    "schedule": {
      "timezone": "Asia/Kolkata",
      "call_window_start": "09:00",
      "call_window_end": "21:00",
      "c2_delay_minutes": 120,
      "evening_window_start": "19:00",
      "evening_window_end": "21:00",
      "c4_delay_minutes_min": 45,
      "c4_delay_minutes_max": 60,
      "late_lead_morning_start": "09:00",
      "late_lead_morning_end": "11:00",
      "whatsapp_window_start": "09:00",
      "whatsapp_window_end": "20:00",
      "max_touches_24h": 3,
      "m1_delay_days": 3,
      "m2_delay_days": 7
    },
    "templates": {
      "N1": { "template_name": "<approved-name>", "language": "en" },
      "N2": { "template_name": "<approved-name>", "language": "en" },
      "N3": { "template_name": "<approved-name>", "language": "en" },
      "U1": { "template_name": "<approved-name>", "language": "en" },
      "U2a": { "template_name": "<approved-name>", "language": "en" },
      "U2b": { "template_name": "<approved-name>", "language": "en" },
      "U3": { "template_name": "<approved-name>", "language": "en" },
      "T1": { "template_name": "<approved-name>", "language": "en" },
      "M1": { "template_name": "<approved-name>", "language": "en" },
      "M2": { "template_name": "<approved-name>", "language": "en" }
    }
  }
}
```

`template_name_no_name` is optional per slot. If the approved template requires
`{{name}}` and no plausible name exists, the send is skipped unless this variant
is configured.

### 4. Enable

Send the same PUT with `enabled:true`. The backend refuses activation unless all
ten slots have a template name and language and timing values are valid.

At send time the config server also verifies:

- the assistant flow is still enabled and still in `cv_24h_cadence` mode;
- the template is approved;
- N1-N3/U1-U3/T1 are assigned Utility;
- M1/M2 are assigned Marketing;
- the lead is not suppressed;
- the cadence key has not already been sent.

### 5. Stop or switch back

- Emergency stop: set the flow `enabled:false`.
- Return to old behavior: set `flow_mode:"standard"`.

Both prevent new cadence template sends. A cadence job already underway is
closed after its current call analytics arrive; it is not moved into the legacy
retry schedule mid-ladder. Existing Standard mappings are retained.

## Dashboard UI recommendation

On the existing assistant WhatsApp-flow screen:

1. Fetch capabilities.
2. Show a two-option mode control only when the experimental mode is available.
3. Keep Standard selected by default.
4. When cadence is selected, render:
   - ten required template selectors grouped as N, U, Qualified and Marketing;
   - expected category and final copy from the capabilities response;
   - the schedule fields prefilled with the document defaults;
   - validation errors from `details` or `cadence_draft_errors`.
5. Save incomplete work with the parent flow disabled.
6. Require a separate Enable action after all templates are approved.
7. Never create or enable a second parallel flow for the same assistant/template.

## Isolation and behavior guarantees

- No automation metadata means Standard behavior.
- The experimental mode is rejected for every user except College Vidya.
- The normal post-call sender returns `cadence_managed` in cadence mode, avoiding
  a duplicate first message.
- Scheduler template selection has no environment fallback and is resolved from
  the live assistant flow for each send.
- WhatsApp reply/STOP/callback hooks check the bot config's `user_uid`; other
  customer accounts cannot mutate College Vidya state.
- Any reply/tap cancels the pending reminder and remaining cadence calls.
- M2 creates a durable soft message suppression. It is automatically cleared
  only if that lead sends a new inbound WhatsApp message. Hard STOP/product
  suppressions remain latched.

## Deployment prerequisites

1. Submit the ten templates using the exact bodies/buttons/footers returned by
   the capabilities endpoint and the source specification.
2. Confirm Meta's assigned categories after approval.
3. Deploy:
   - `monade-voice-config-server`
   - `collegevidya-custom-integration`
   - `whatsapp-bot-service`
4. Apply the updated Kubernetes manifests. Their cadence flags are infrastructure
   master switches; assistant activation remains controlled by the dashboard.
5. Ensure the College Vidya WhatsApp bot config, interactive replies and channel
   are enabled. The backend rejects cadence activation otherwise.
6. Update the three externally stored prompt documents named in the source spec;
   they are not present in this repository.

No Prisma migration is required for this implementation.
