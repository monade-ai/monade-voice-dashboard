# Frontend guide: assistant call-duration limit

## Purpose

Each assistant can have its own hard maximum call duration. If no custom value
is configured, the assistant inherits the global 15-minute (`900` seconds)
safety limit.

The frontend only manages the assistant setting. Billing-service and
session-manager automatically schedule and terminate calls; the frontend does
not interact with Redis or the session-manager scheduler.

## API base URL

Production:

```text
https://service.monade.ai/db_services
```

All requests must use the existing authenticated dashboard session/cookies.
When using `fetch`, include:

```js
credentials: 'include'
```

## 1. Read an assistant's setting

```http
GET /api/assistants/{assistant_id}/call-settings
```

Production example:

```http
GET https://service.monade.ai/db_services/api/assistants/98314ec1-.../call-settings
```

Assistant with a custom five-minute limit:

```json
{
  "assistant_id": "98314ec1-...",
  "user_uid": "091cf311-...",
  "max_call_duration_seconds": 300,
  "global_hard_limit_seconds": 900,
  "effective_max_call_duration_seconds": 300,
  "source": "assistant"
}
```

Assistant inheriting the global limit:

```json
{
  "assistant_id": "98314ec1-...",
  "user_uid": "091cf311-...",
  "max_call_duration_seconds": null,
  "global_hard_limit_seconds": 900,
  "effective_max_call_duration_seconds": 900,
  "source": "global_fallback"
}
```

## 2. Update an assistant's setting

```http
PATCH /api/assistants/{assistant_id}/call-settings
Content-Type: application/json
```

Set a five-minute limit:

```json
{
  "max_call_duration_seconds": 300
}
```

Remove the custom limit and inherit the global 15-minute limit:

```json
{
  "max_call_duration_seconds": null
}
```

Successful response:

```json
{
  "success": true,
  "assistant_id": "98314ec1-...",
  "user_uid": "091cf311-...",
  "max_call_duration_seconds": 300,
  "global_hard_limit_seconds": 900,
  "effective_max_call_duration_seconds": 300,
  "source": "assistant"
}
```

## Recommended UI

Add this control to the assistant settings page:

```text
Hard call-duration limit
[ ] Use a custom limit for this assistant

Maximum duration: [ 5 ] minutes
Global safety maximum: 15 minutes
```

Behavior:

- Toggle off: send `max_call_duration_seconds: null`.
- Toggle on: allow a value from 1 to 15 whole minutes.
- Convert minutes to seconds before sending: `minutes * 60`.
- Initialize the toggle from whether `max_call_duration_seconds` is `null`.
- Display `effective_max_call_duration_seconds` as the currently effective value.
- After PATCH succeeds, replace local state with the returned response.
- Disable the save button while the request is in progress.

The backend accepts integer seconds between `60` and the current global hard
limit (`900`). Do not send decimals, numeric strings, zero, or negative values.

## Suggested frontend request

```js
async function updateAssistantCallLimit(assistantId, secondsOrNull) {
  const response = await fetch(
    `https://service.monade.ai/db_services/api/assistants/${assistantId}/call-settings`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_call_duration_seconds: secondsOrNull,
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to update call-duration limit');
  }
  return payload;
}
```

## Errors to handle

| Status | Meaning |
|---|---|
| `400` | Missing value, non-integer value, or value outside 60–900 seconds |
| `401` | Dashboard session is missing or expired |
| `403` | The assistant does not belong to the authenticated user |
| `404` | Assistant ID was not found |
| `500` | Configuration service/database failure |

Show the backend `error` message for validation failures and a normal retry
message for server/network failures.

## Important runtime behavior

- Changes apply only to calls started after the setting is saved.
- Existing active calls keep the deadline calculated when they started.
- No custom setting always means the global 15-minute limit.
- Values above the global ceiling cannot be saved.
- The frontend does not need to call billing-service or session-manager.
- No agent, calling, campaign, WhatsApp, or post-processing UI changes are required.

## Frontend acceptance checks

1. Open an assistant with no override: UI shows inheritance and 15 minutes effective.
2. Enable custom duration and save 5 minutes: reload and confirm 5 minutes remains.
3. Disable the custom duration: reload and confirm it returns to inherited 15 minutes.
4. Verify a value below 1 minute or above 15 minutes is blocked client-side.
5. Verify a user cannot read or update another user's assistant.
