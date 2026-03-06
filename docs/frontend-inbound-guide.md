# Frontend Integration Guide: Inbound Calling

## Overview

Inbound calling lets users receive phone calls that are automatically routed to a voice agent. The backend handles all the LiveKit configuration (dispatch rules, prompt baking) automatically — frontend just needs to manage trunks and set the right fields on assistants.

---

## Schema Changes

### Trunks Table — New Columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `trunk_type` | String | `"outbound"` | `"inbound"` or `"outbound"` — use this to filter in the dashboard |
| `allowed_numbers` | String[] | `[]` | For inbound: restrict to these caller numbers (empty = allow all) |
| `krisp_enabled` | Boolean | `true` | Noise cancellation for inbound calls |

### Assistants Table — New Columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `call_direction` | String? | `null` | `"inbound"`, `"outbound"`, or `"both"` — filter for dashboard |
| `inbound_trunk_id` | String? | `null` | LiveKit trunk ID of the inbound trunk this assistant is mapped to |
| `dispatch_rule_id` | String? | `null` | Auto-set by backend. LiveKit dispatch rule ID (read-only for frontend) |

---

## Frontend Workflow

### Step 1: Create an Inbound Trunk

```
POST /api/users/{user_uid}/inbound-trunks
{
  "name": "My Inbound Trunk",
  "numbers": ["+1234567890"],       // DID numbers that receive calls
  "allowed_numbers": [],            // empty = allow all callers
  "krisp_enabled": true
}
```

**Response** includes `livekit_trunk_id` — save this, you'll need it for assistant mapping.

### Step 2: Create/Update an Inbound Assistant

To make an assistant handle inbound calls, just set `call_direction` and `inbound_trunk_id`:

```
POST /api/assistants
{
  "name": "Law Assistant",
  "user_uid": "user_123",
  "phoneNumber": "+1234567890",
  "knowledgeBase": "<kb-id>",            // Knowledge base ID (resolved to URL by backend)
  "call_direction": "inbound",           // NEW FIELD
  "inbound_trunk_id": "ST_xxxx",         // NEW FIELD — from step 1
  "speakingAccent": "en-US"              // optional
}
```

**What happens automatically behind the scenes:**
1. Backend saves the assistant to DB
2. Detects `call_direction: "inbound"` + `inbound_trunk_id` is set
3. Fetches the knowledge base content from the KB URL
4. Builds the full prompt + metadata (accent, user_id, etc.)
5. Creates a LiveKit dispatch rule with the baked prompt
6. Saves the `dispatch_rule_id` back to the assistant record

**The response includes `dispatch_rule_id`** — this confirms baking succeeded. If null, baking failed (check backend logs).

### Step 3: Update KB or Accent → Auto Rebake

When the user updates the knowledge base:

```
PATCH /api/assistants/{id}
{
  "knowledgeBase": "<new-kb-id>"
}
```

Backend detects the KB changed on an inbound assistant → **automatically deletes the old dispatch rule and creates a new one with the updated prompt**. Same happens for `speakingAccent` changes.

### Step 4: Switch Direction or Remove Inbound

To make an assistant outbound-only again:

```
PATCH /api/assistants/{id}
{
  "call_direction": "outbound"
}
```

Backend auto-deletes the dispatch rule and clears `inbound_trunk_id`.

### Deleting an Assistant

```
DELETE /api/assistants/{id}
```

Backend auto-cleans up the dispatch rule from LiveKit before deleting.

---

## Dashboard UI Suggestions

### Trunk List Page
- Fetch ALL trunks: `GET /api/users/{user_uid}/trunks` (outbound)
- Fetch inbound trunks: `GET /api/users/{user_uid}/inbound-trunks`
- Or fetch all and filter by `trunk_type` field client-side
- Show a badge/tag: "Inbound" vs "Outbound"

### Assistant Editor
- Add a dropdown: "Call Direction" → Inbound / Outbound / Both
- When "Inbound" or "Both" selected, show a trunk selector populated from inbound trunks list
- The trunk selector should use `livekit_trunk_id` as the value for `inbound_trunk_id`
- Show `dispatch_rule_id` as a read-only status indicator (green = baked, empty = not configured)

### Inbound Trunk Creation Form
Fields:
- Name (required)
- Numbers (required, array of DID numbers)
- Allowed Numbers (optional, restrict callers)
- Krisp Enabled (toggle, default true)

---

## API Reference

### Inbound Trunk Endpoints (Config Server / PostgreSQL)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/:user_uid/inbound-trunks` | Create inbound trunk |
| GET | `/api/users/:user_uid/inbound-trunks` | List user's inbound trunks |
| GET | `/api/users/:user_uid/inbound-trunks/:trunk_id` | Get specific trunk |
| PUT | `/api/users/:user_uid/inbound-trunks/:trunk_id` | Update trunk |
| DELETE | `/api/users/:user_uid/inbound-trunks/:trunk_id/unlink` | Unlink (DB only) |

### Assistant Endpoints (Updated)

Same endpoints as before, but now accept these additional fields:

**POST /api/assistants** and **PATCH /api/assistants/:id**:
- `call_direction`: `"inbound"` | `"outbound"` | `"both"` | `null`
- `inbound_trunk_id`: LiveKit trunk ID (from inbound trunk's `livekit_trunk_id`)
- `speakingAccent`: accent string

**Read-only field** (set by backend):
- `dispatch_rule_id`: LiveKit dispatch rule ID. Non-null = inbound is active and baked.

---

## Key Points

1. **Frontend never calls dispatch rule APIs directly** — they're managed automatically
2. **`knowledgeBase` field stores the URL** (backend resolves KB ID → URL on create/update)
3. **Every update to an inbound assistant's KB, accent, trunk, or direction triggers an auto-rebake**
4. **Outbound flow is completely unchanged** — all existing code works as before
5. **`trunk_type` on the Trunks table** helps you filter outbound vs inbound in the dashboard
