# Custom Integrations Dashboard Frontend Guide

This page describes how the dashboard should show custom integrations. The dashboard UI must be integration-agnostic: CollegeVidya is only the first implementation behind the common contract. Most users will not have a custom integration and should see an empty state.

## Important Frontend Rule

Do not build a CollegeVidya-specific dashboard page.

Build a generic `Custom Integrations` page that renders whatever integrations are returned by discovery. The page can call the CollegeVidya discovery route today because that is the first service we have, but the UI components, state model, actions, labels, and routing layer should work for any future integration that exposes the same contract.

Good frontend shape:

```text
CustomIntegrationsPage
  -> discovery client
  -> IntegrationCard[]
  -> IntegrationQueueTable
  -> IntegrationJobDrawer
  -> integration action handlers from discovered routes
```

Avoid:

```text
CollegeVidyaPage
CollegeVidyaQueueTable
hardcoded collegevidya route strings inside components
hardcoded CollegeVidya-only copy except the integration display label
```

## Product Behavior

Add a dashboard section called `Custom Integrations` or `Integrations`.

For users with no custom integration:

```text
No custom integrations are active for this account.
Contact the Monade team to connect a custom CRM or calling workflow.
```

For users with a custom integration:

- Show an integration card for each active custom integration.
- Show queue health, calls in progress, scheduled retries, deferred calls, and analytics-pending calls.
- Let an operator inspect queued jobs and their original request payload.
- Support delete/cancel, reschedule, payload update, and retry-now for jobs that are not active calls.

## Route Base

Custom integration services are exposed under:

```text
https://service.monade.ai/custom-integrations/{integration_slug}
```

The first implementation, CollegeVidya, is exposed through:

```text
https://service.monade.ai/custom-integrations/collegevidya
```

Ingress rewrites:

```text
/custom-integrations/collegevidya/(.*) -> /$1
```

So the frontend can call the CollegeVidya implementation through the generic route shape:

```text
GET https://service.monade.ai/custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/status
```

The service validates that the requested `user_id` matches the authenticated user and that the user is enabled for the integration. Other users should receive `403`.

## Authentication

Use the same authenticated API call wrapper/dashboard API key flow used for other backend requests.

The service accepts the user's API key and resolves the user through config server. The requested `user_id` in the route must match the authenticated user.

## Visibility Logic

Recommended frontend logic:

1. For the logged-in user's `user_uid`, call one or more custom integration discovery routes through a discovery client.
2. If it returns an empty `integrations` array, show the empty state.
3. If it returns one or more integrations, render cards from that response.
4. Use the `routes` object returned by discovery. Do not assemble CollegeVidya paths inside UI components.
5. If an integration route returns `403` or `404`, hide that integration and refresh discovery.

Current per-service discovery route shape:

```text
GET /custom-integrations/{integration_slug}/internal/users/{user_id}/custom-integrations
```

CollegeVidya currently exposes this first implementation:

```text
GET /custom-integrations/collegevidya/internal/users/{user_id}/custom-integrations
```

Example response:

```json
{
  "user_id": "user-id",
  "integrations": [
    {
      "slug": "collegevidya",
      "label": "CollegeVidya",
      "service": "collegevidya",
      "base_path": "/custom-integrations/collegevidya",
      "status": {},
      "routes": {
        "status": "/custom-integrations/collegevidya/internal/users/user-id/integrations/collegevidya/status",
        "queue": "/custom-integrations/collegevidya/internal/users/user-id/integrations/collegevidya/queue",
        "queue_jobs": "/custom-integrations/collegevidya/internal/users/user-id/integrations/collegevidya/queue/jobs"
      }
    }
  ]
}
```

For now, the frontend may keep a tiny discovery registry in one API-client file only, not in components:

```ts
const CUSTOM_INTEGRATION_DISCOVERY_ROUTES = [
  "/custom-integrations/collegevidya/internal/users/{user_id}/custom-integrations",
];
```

The frontend should merge all returned `integrations` arrays and render them generically.

Longer term, this should become one central dashboard/backend route that queries a small registry of active integration services. That avoids the frontend knowing every possible custom service path.

Suggested central route:

```text
GET /api/users/{user_id}/custom-integrations
```

Suggested response:

```json
{
  "integrations": [
    {
      "slug": "collegevidya",
      "label": "CollegeVidya",
      "status_url": "/custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/status",
      "queue_url": "/custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/queue"
    }
  ]
}
```

## Common Integration Contract

Every custom integration should return objects with this shape from discovery:

```ts
type CustomIntegration = {
  slug: string;
  label: string;
  service: string;
  base_path: string;
  status: IntegrationStatus;
  routes: {
    status: string;
    queue: string;
    queue_jobs: string;
    job?: string;
    delete_job?: string;
    reschedule_job?: string;
    update_job?: string;
    retry_now?: string;
  };
};
```

The frontend should treat CollegeVidya as data:

```json
{
  "slug": "collegevidya",
  "label": "CollegeVidya",
  "service": "collegevidya"
}
```

The UI may display `label`, but logic should use the common route contract.

## Current Read Endpoints

### 1. Integration Status

```text
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/status
```

Use this for top-level cards and counters. For a generic UI, call `integration.routes.status`.

Example response:

```json
{
  "service": "collegevidya",
  "user_id": "091cf311-6949-42fd-b1d2-de3bb4b3bf48",
  "dispatch_enabled": true,
  "max_concurrent_calls": 10,
  "calling_window": {
    "timezone": "Asia/Kolkata",
    "start": "09:00",
    "end": "21:00"
  },
  "queue_depth": 12,
  "scheduled_retry_count": 4,
  "deferred_outside_window_count": 25,
  "analytics_pending_count": 2,
  "calls_in_progress": 6,
  "launching_count": 1
}
```

Suggested UI:

- `Dispatch enabled`
- `Calls in progress`
- `Capacity used`, computed as `calls_in_progress / max_concurrent_calls`
- `Ready queue`
- `Scheduled retries`
- `Deferred until next window`
- `Waiting for post-processing`
- Calling window: `09:00-21:00 Asia/Kolkata`

### 2. Queue Snapshot

```text
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/queue?limit=50
```

Current response returns Redis sorted-set members and their scores:

```json
{
  "ready": [
    ["job-id-1", 1781337600.123]
  ],
  "scheduled": [
    ["job-id-2", 1781350200.0]
  ],
  "deferred": [
    ["job-id-3", 1781379000.0]
  ],
  "analytics_pending": [
    ["job-id-4", 1781338200.0]
  ]
}
```

How to render this today:

1. Read each bucket.
2. Treat the score as a Unix timestamp in seconds.
3. Convert it to local display time.
4. Fetch each job detail with the job endpoint.

Bucket meaning:

| Bucket | Meaning |
| --- | --- |
| `ready` | Eligible to dispatch now during the 9 AM-9 PM IST window. |
| `scheduled` | Retry or CRM lookup retry scheduled for a future time. |
| `deferred` | Incoming call request accepted outside the calling window; next attempt is next window start. |
| `analytics_pending` | Call ended; waiting for post-processing result before deciding retry/final. |

### 3. Enriched Queue Jobs

```text
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/queue/jobs?limit=100&bucket=all&include_payload=false
```

Use this as the main queue table endpoint. It returns job summaries grouped by bucket, so the frontend does not need one request per row. For a generic UI, call `integration.routes.queue_jobs`.

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `limit` | `100` | `1-500`, applied per bucket. |
| `bucket` | `all` | `all`, `ready`, `scheduled`, `deferred`, or `analytics_pending`. |
| `include_payload` | `false` | Set `true` when the table needs the original request payload inline. |

Example response:

```json
{
  "ready": [
    {
      "job_id": "job-id",
      "user_id": "user-id",
      "phone_number": "+91XXXXXXXXXX",
      "prospect_id": "prospect-id",
      "bucket": "ready",
      "status": "queued",
      "queue_status": "ready",
      "attempt": 0,
      "retry_count": 0,
      "retry_day": 1,
      "max_retries": 7,
      "scheduled_for": "2026-06-13T08:30:00+00:00",
      "next_attempt_after": null,
      "created_at": "2026-06-13T08:30:00+00:00",
      "updated_at": "2026-06-13T08:30:00+00:00",
      "last_call_id": null,
      "last_room_name": null,
      "last_failure_reason": null,
      "expires_at": "2026-06-17T08:30:00+00:00"
    }
  ],
  "scheduled": [],
  "deferred": [],
  "analytics_pending": []
}
```

### 4. Job Detail

```text
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}
```

Use this for row expansion, drawer details, and showing the original API payload. If discovery includes a job-detail route template later, use that. Until then, the generic API client can derive it from `base_path`, `user_id`, `slug`, and `job_id` in one place.

Example response shape:

```json
{
  "job_id": "job-id",
  "user_id": "091cf311-6949-42fd-b1d2-de3bb4b3bf48",
  "phone_number": "+91XXXXXXXXXX",
  "prospect_id": "prospect-id",
  "payload": {
    "assistant_id": "assistant-id",
    "metadata": {
      "name": "Lead Name"
    },
    "special_parameters": {
      "prospect_id": "prospect-id"
    },
    "telephony": {
      "trunk_name": "collegevidyaoutbound"
    }
  },
  "attempt": 1,
  "retry_count": 0,
  "retry_day": 1,
  "max_retries": 7,
  "status": "queued",
  "queue_status": "ready",
  "source": "api",
  "created_at": "2026-06-13T08:30:00+00:00",
  "updated_at": "2026-06-13T08:30:00+00:00",
  "next_attempt_after": null,
  "last_call_id": null,
  "last_room_name": null,
  "last_failure_reason": null,
  "crm_lookup_failure_count": 0,
  "expires_at": "2026-06-17T08:30:00+00:00"
}
```

Important: the full original outbound-call payload is stored under `payload`. This contains assistant ID, metadata, special parameters, and trunk details needed for dispatch.

## Recommended Frontend Views

### Overview Cards

Use the status endpoint.

Cards:

- `Ready Now`
- `Calls In Progress`
- `Scheduled Retries`
- `Deferred Outside Window`
- `Waiting For Analytics`
- `Max Concurrency`

### Queue Table

Columns:

| Column | Source |
| --- | --- |
| Job ID | `job.job_id` |
| Phone | `job.phone_number` |
| Prospect ID | `job.prospect_id` or `job.payload.special_parameters.prospect_id` |
| Bucket | queue snapshot bucket |
| Status | `job.status` |
| Queue Status | `job.queue_status` |
| Attempts | `job.attempt` |
| Retries | `job.retry_count / job.max_retries` |
| Retry Day | `job.retry_day` |
| Best Scheduled Time | queue score or `job.next_attempt_after` |
| Created | `job.created_at` |
| Last Failure | `job.last_failure_reason` |

For `Best Scheduled Time`:

- If bucket is `ready`, show `Ready now`.
- If bucket is `scheduled`, show the sorted-set score converted from Unix seconds.
- If bucket is `deferred`, show the sorted-set score converted from Unix seconds.
- If bucket is `analytics_pending`, show `Waiting until analytics timeout`, using the sorted-set score.

### Job Detail Drawer

Show:

- Current status
- Original request payload
- Assistant ID
- Trunk name
- Prospect ID
- Phone number
- Retry counters
- Last call ID and room name
- Last failure reason
- Timestamps

Do not expose raw secret values. The stored payload should not contain service tokens, but the UI should still avoid rendering any key named `api_key`, `authorization`, `token`, or `secret` if one appears later.

## Mutation Endpoints

The public enqueue route exists:

```text
POST /custom-integrations/collegevidya/outbound-call/{phone_number}
```

This is mainly for the client's external system, not dashboard operators.

### Cancel/Delete A Job

```text
DELETE /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}
```

Behavior:

- Deletes non-active jobs and dedupe keys from Redis.
- Rejects `in_progress` jobs with `409`; the dashboard should not blindly kill live calls.
- Remove job ID from all Redis sorted sets.

Response:

```json
{
  "status": "deleted",
  "job_id": "job-id"
}
```

### Reschedule A Job

```text
PATCH /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}/schedule
```

Request:

```json
{
  "next_attempt_after": "2026-06-13T13:30:00+05:30"
}
```

Behavior:

- Move job to `scheduled`.
- Update `next_attempt_after`.
- Update the scheduled sorted-set score.
- Enforce the 9 AM-9 PM Asia/Kolkata calling window, or return `400`.
- Reject active/waiting-for-analytics jobs with `409`.

### Update Job Payload

```text
PATCH /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}
```

Request:

```json
{
  "payload": {
    "assistant_id": "new-assistant-id",
    "metadata": {
      "name": "Updated Lead Name"
    },
    "special_parameters": {
      "prospect_id": "prospect-id"
    },
    "telephony": {
      "trunk_name": "collegevidyaoutbound"
    }
  }
}
```

Behavior:

- Allow edits only before dispatch or after terminal dispatch failures.
- Reject edits for active calls and analytics-pending calls.
- Preserve required fields like `prospect_id`, `phone_number`, and `user_id`.
- If `prospect_id` or phone changes, update the dedupe key.

Optional phone update:

```json
{
  "phone_number": "+91XXXXXXXXXX",
  "payload": {}
}
```

### Retry Now

```text
POST /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}/retry-now
```

Behavior:

- Move job to `ready` if current IST time is inside 9 AM-9 PM.
- If outside the window, move it to `deferred` at the next window start.
- Reject active/waiting-for-analytics jobs with `409`.

## Redis Namespace

Every custom integration should use this user-isolated Redis namespace pattern:

```text
customsvc:{integration_slug}:v1:user:{user_id}:queue:ready
customsvc:{integration_slug}:v1:user:{user_id}:queue:scheduled
customsvc:{integration_slug}:v1:user:{user_id}:queue:deferred
customsvc:{integration_slug}:v1:user:{user_id}:queue:analytics_pending
customsvc:{integration_slug}:v1:user:{user_id}:job:{job_id}
customsvc:{integration_slug}:v1:user:{user_id}:dedupe:{prospect_id}:{phone}
customsvc:{integration_slug}:v1:user:{user_id}:concurrency:active
customsvc:{integration_slug}:v1:user:{user_id}:concurrency:launching
customsvc:{integration_slug}:v1:user:{user_id}:call:{call_id}
customsvc:{integration_slug}:v1:user:{user_id}:room:{room_name}
```

Frontend should not read Redis directly. These namespaces are useful for backend observability and for understanding why the page is user-scoped.

CollegeVidya currently uses `integration_slug=collegevidya`.

## Frontend Refactor Guidance

If the first frontend version was built as CollegeVidya-specific, refactor like this:

1. Rename page/components to generic names:
   - `CollegeVidyaIntegrationsPage` -> `CustomIntegrationsPage`
   - `CollegeVidyaQueueTable` -> `IntegrationQueueTable`
   - `CollegeVidyaJobDrawer` -> `IntegrationJobDrawer`
2. Move CollegeVidya route strings into one discovery adapter/client file.
3. Store selected integration as an object returned by discovery, not as a hardcoded slug.
4. Make polling consume `integration.routes.status` and `integration.routes.queue_jobs`.
5. Make actions consume route builders from the integration client:
   - `deleteJob(integration, jobId)`
   - `retryNow(integration, jobId)`
   - `rescheduleJob(integration, jobId, datetime)`
   - `updateJob(integration, jobId, patch)`
6. Keep the empty state generic.
7. Only show the client name through `integration.label`.

The end result should be that adding another client requires adding one discovery route/config entry, not copying a page.

## Status Values

Common `status` values:

| Status | Meaning |
| --- | --- |
| `queued` | Accepted and waiting. |
| `in_progress` | LiveKit dispatch/SIP participant was created and call is active. |
| `ended_waiting_for_analytics` | Agent shutdown callback arrived; waiting for post-processing. |
| `scheduled_retry` | Post-processing result was retryable and a retry was scheduled. |
| `completed_no_retry` | Post-processing result was final and no retry is needed. |
| `exhausted` | Retry limit reached. |
| `skipped_by_crm` | CRM said do not call; this is normally removed from Redis. |
| `crm_lookup_retry` | CRM lookup failed temporarily; will retry lookup. |
| `crm_lookup_failed` | CRM lookup failed too many times. |
| `dispatch_failed` | Could not create LiveKit dispatch/SIP participant. |
| `analytics_timeout` | Post-processing did not report back before timeout. |

Common `queue_status` values:

| Queue Status | Meaning |
| --- | --- |
| `ready` | Ready to dispatch. |
| `scheduled` | Scheduled for future retry/lookup. |
| `deferred` | Outside calling window. |
| `in_progress` | Active call. |
| `final` | Terminal state. |

## Retry And Window Summary

Calling window:

```text
09:00-21:00 Asia/Kolkata
```

Retry policy:

- 8 total call attempts including the first call.
- Day 1 retries: after 1 hour, 2 hours, then 3 hours.
- Day 2 retries: two attempts between 6 PM and 9 PM IST, one hour apart.
- Day 3 retries: two attempts between 6 PM and 9 PM IST, one hour apart.
- Post-processing decides whether a call is retryable.
- Retryable examples: not picked up, voicemail.
- CRM is checked before every dispatch. If CRM returns `mx_Work_Type=true`, the job is removed and no call is placed.

## Frontend Implementation Notes

- Poll `status` every 10-30 seconds while the page is open.
- Poll `queue/jobs` every 15-30 seconds.
- Fetch `jobs/{job_id}` only for a detail drawer or if `include_payload=false` and the operator opens a payload view.
- Use row virtualization if showing more than 100 jobs.
- Show timestamps in the user's locale, but label the calling-window timezone as `Asia/Kolkata`.
- Do not show this page as an error for users without integrations; show the empty state.
- Treat `403` as "not enabled for this user" unless the user should have access.
- Treat `404` job detail as stale queue data and refresh `queue/jobs`.
