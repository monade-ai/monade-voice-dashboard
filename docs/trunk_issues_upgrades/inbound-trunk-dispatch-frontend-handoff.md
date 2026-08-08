# Inbound Trunk and Dispatch Frontend Handoff

## Purpose

This document is the current frontend contract for LiveKit Cloud inbound trunks.
It supersedes any older frontend instructions that say dispatch rules must be
deleted and recreated when an assistant or prompt changes.

Production base URL:

```text
https://service.monade.ai/db_services
```

Use the dashboard's existing authentication headers/cookies. The frontend must
only call the config-server routes below; it must not call the internal provider
service or LiveKit APIs directly.

## What Changed

- A trunk is updated in place using its existing LiveKit trunk ID.
- A dispatch rule is updated in place and normally keeps the same rule ID.
- The backend stores the active IDs in existing fields:
  - trunk: `livekit_trunk_id`
  - assistant: `inbound_trunk_id`
  - assistant: `dispatch_rule_id`
- The backend now asks LiveKit for specific IDs instead of fetching every trunk
  or dispatch rule and searching the full response locally.
- If a stored dispatch rule ID is stale, the backend can recover the rule using
  the mapped trunk ID and persist the authoritative rule ID.
- No database migration or new schema field is required.

## Important ID Rule

Every `:trunk_id` in the endpoints below is the LiveKit trunk ID returned as
`livekit_trunk_id`, usually shaped like `ST_...`. It is not the PostgreSQL trunk
row UUID in `id`.

Keep both values in frontend state:

```json
{
  "id": "postgres-row-uuid",
  "livekit_trunk_id": "ST_xxxxxxxxx"
}
```

Use `livekit_trunk_id` in route parameters and assistant mappings.

## Inbound Trunk Routes

### List trunks

```http
GET /api/users/:user_uid/inbound-trunks
```

Public request:

```http
GET https://service.monade.ai/db_services/api/users/:user_uid/inbound-trunks
```

Use this response to populate the inbound trunk list and assistant trunk picker.

### Get one trunk

```http
GET /api/users/:user_uid/inbound-trunks/:trunk_id
```

Use this when opening an edit form if the list data may be stale.

### Create a trunk

```http
POST /api/users/:user_uid/inbound-trunks
Content-Type: application/json

{
  "name": "Mumbai inbound",
  "numbers": ["+918071583274"],
  "allowed_numbers": [],
  "krisp_enabled": true
}
```

Required fields:

- `name`: non-empty string
- `numbers`: non-empty string array

The response contains `livekit_trunk_id`. Store/use that value for mapping and
future updates.

### Update the same trunk

```http
PUT /api/users/:user_uid/inbound-trunks/:trunk_id
Content-Type: application/json

{
  "name": "Mumbai inbound updated",
  "numbers": ["+918071583069"],
  "allowed_numbers": [],
  "krisp_enabled": true
}
```

This is a partial update. Send only changed fields. Supported fields are:

- `name`
- `numbers`
- `allowed_numbers`
- `krisp_enabled`

The backend updates the existing LiveKit trunk and the existing PostgreSQL row.
The `livekit_trunk_id` remains unchanged. Do not create a replacement trunk just
because its number or name changed.

Example:

```javascript
await api.put(
  `/api/users/${userUid}/inbound-trunks/${trunk.livekit_trunk_id}`,
  {
    numbers: form.numbers,
    name: form.name,
  }
);
```

### Unlink from this user

```http
DELETE /api/users/:user_uid/inbound-trunks/:trunk_id/unlink
```

This removes the local DB association but intentionally leaves the LiveKit trunk
alive. Present this as an unlink action, not as permanent deletion.

The global deletion route is restricted to internal service authentication and
must not be exposed as a normal dashboard action.

## Assistant Mapping and Dispatch Rules

### Map an assistant

```http
POST /api/users/:user_uid/inbound-trunks/:trunk_id/map-assistant
Content-Type: application/json

{
  "assistant_id": "assistant-uuid"
}
```

The backend performs the entire operation:

1. Validates user, trunk, and assistant ownership.
2. Builds fresh prompt and agent metadata.
3. Updates the known dispatch rule in place when it exists.
4. Recovers by trunk ID if the stored rule ID is stale.
5. Creates a rule only when no rule exists.
6. Persists `inbound_trunk_id` and the authoritative `dispatch_rule_id`.

Successful response shape:

```json
{
  "success": true,
  "assistant_id": "assistant-uuid",
  "trunk_id": "ST_xxxxxxxxx",
  "dispatch_rule_id": "SDR_xxxxxxxxx",
  "message": "Assistant mapped and dispatch rule synchronized."
}
```

### Automatic synchronization after assistant edits

The normal assistant create/update APIs automatically synchronize the dispatch
rule when relevant inbound configuration changes, including:

- knowledge base or prompt data
- inbound trunk mapping
- call direction
- speaking accent or voice
- recording configuration
- tool, model, audio, VAD, or noise-cancellation configuration
- greeting prompt configuration

The frontend should make one assistant save request and wait for its response.
Do not immediately call a separate dispatch delete, map, or rebake request after
the same save. That creates duplicate work and can race another synchronization.

### Manual rebake

Use this only for an explicit Retry/Rebuild action or when prompt content changed
outside the normal assistant update flow:

```http
POST /api/users/:user_uid/inbound-trunks/rebake-assistant
Content-Type: application/json

{
  "assistant_id": "assistant-uuid"
}
```

The backend reads `dispatch_rule_id` and `inbound_trunk_id` from the assistant.
The frontend does not need to discover or list LiveKit rules.

### Unmap an assistant

```http
DELETE /api/users/:user_uid/inbound-trunks/:trunk_id/unmap-assistant
Content-Type: application/json

{
  "assistant_id": "assistant-uuid"
}
```

This is an intentional destructive operation: it deletes the LiveKit dispatch
rule and clears the assistant's inbound mapping.

## Frontend Upgrade Checklist

- Use `livekit_trunk_id`, not the DB `id`, in inbound trunk route parameters.
- Add Edit beside each inbound trunk and call `PUT`, not create-and-delete.
- Support editing `name`, `numbers`, `allowed_numbers`, and `krisp_enabled`.
- Disable submit while a create, update, map, or rebake request is running.
- Prevent double-click submissions and duplicate mutation requests.
- Do not optimistically show a new number until the update succeeds.
- Refresh the edited trunk or update local state from the PUT response.
- Treat `dispatch_rule_id` as read-only status data.
- Do not fetch all LiveKit rules to find an assistant's rule.
- Do not delete/recreate a dispatch rule after ordinary assistant updates.
- Provide a manual rebake/retry action only for explicit recovery.
- Clearly separate Unlink from destructive deletion in the UI.
- Surface backend `error` and `details` fields instead of silently retrying.

## Suggested UI States

```text
Saving trunk...
Synchronizing inbound assistant...
Dispatch ready
Dispatch synchronization failed - Retry
```

Avoid saying "Creating new trunk" during an edit because the existing trunk ID
is retained.

## Error Handling

Expected statuses include:

- `400`: missing/invalid fields or assistant has no inbound mapping
- `401`/`403`: authentication or ownership/service-only restriction
- `404`: user, trunk, assistant, or dispatch rule not found
- `409`: conflicting trunk name
- `500`: config-server/database failure
- `502`: provider/LiveKit synchronization failure

On `500` or `502`, keep the user's form values and offer Retry. Do not attempt a
frontend delete/create fallback; the backend keeps the currently working rule
until an in-place update succeeds.

## Backend Timing

The provider's LiveKit SDK timeout is currently 30 seconds. Frontend request
timeouts for create, update, map, and rebake should be longer than 30 seconds,
for example 40-45 seconds, so the browser does not abandon a request while the
backend is still waiting for LiveKit.

Show a progress state during these operations. They include a network call to
LiveKit and, for dispatch synchronization, prompt/knowledge-base preparation.

## Verification Scenarios

Before releasing the dashboard changes, verify:

1. Edit only a trunk name; confirm `livekit_trunk_id` is unchanged.
2. Replace the inbound number; confirm the same trunk ID is returned.
3. Map an assistant; confirm a non-null `dispatch_rule_id` is returned.
4. Change assistant prompt/voice/tools; confirm the dispatch ID stays unchanged.
5. Submit an update once and confirm the frontend sends only one mutation.
6. Trigger manual rebake and confirm calls still route to the assistant.
7. Simulate a provider failure and confirm the UI preserves form data and offers Retry.
8. Unmap an assistant and confirm the dashboard no longer shows it as inbound-ready.

## Backend References

- `monade-voice-config-server/routes/trunks/inbound-trunks.routes.js`
- `monade-voice-config-server/routes/assistants/assistants.routes.js`
- `provider-trunk-configs/inbound_trunk_api.py`
