We need to refactor/build the dashboard Custom Integrations page as a generic integration framework, not a CollegeVidya-specific page.

Goal:
Create one reusable dashboard page, e.g. `/integrations` or `/custom-integrations`, that works for any current or future custom integration. CollegeVidya is only the first backend implementation. Do not create `/college-vidya` pages or CollegeVidya-specific components.

Expected behavior:
1. On page load, get the logged-in user's `user_id` / `user_uid`.
2. Call backend discovery for custom integrations.
3. If the backend returns no integrations, show this exact empty state:

   No custom integrations are active for this account.
   Contact the Monade team to connect a custom CRM or calling workflow.

4. If the backend returns integrations, render them generically using the returned integration objects.
5. Poll integration status and queue jobs every 15 seconds while the page is open.
6. Show:
   - status cards
   - calls in progress
   - ready queue count
   - scheduled retry count
   - deferred count
   - analytics pending count
   - max concurrency
   - queue table
   - job detail drawer with payload inspection
7. Redact any payload keys matching:
   - api_key
   - authorization
   - token
   - secret

Important architecture rule:
Do not hardcode CollegeVidya inside UI components. CollegeVidya should only appear as data from discovery, e.g. `integration.label`.

Good component names:
- `CustomIntegrationsPage`
- `IntegrationCard`
- `IntegrationQueueTable`
- `IntegrationJobDrawer`
- `IntegrationStatusCards`

Avoid:
- `CollegeVidyaPage`
- `CollegeVidyaQueueTable`
- `CollegeVidyaJobDrawer`
- CollegeVidya-specific route strings inside components

Temporary discovery:
For now, we only have CollegeVidya. Put the CollegeVidya discovery route in one API-client/adapter file only, not inside React components.

Example temporary registry:

```ts
const CUSTOM_INTEGRATION_DISCOVERY_ROUTES = [
  "/custom-integrations/collegevidya/internal/users/{user_id}/custom-integrations",
];
The page should call all discovery routes, merge returned integrations, and render generically.

Discovery response shape:

ts

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
Use routes from the object:

integration.routes.status
integration.routes.queue_jobs
Do not assemble CollegeVidya paths inside UI components.

Current backend routes:

Discovery:
GET /custom-integrations/collegevidya/internal/users/{user_id}/custom-integrations

Status:
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/status

Enriched queue:
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/queue/jobs?limit=100&bucket=all&include_payload=false

Job detail:
GET /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}

Delete job:
DELETE /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}

Reschedule:
PATCH /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}/schedule

Update job:
PATCH /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}

Retry now:
POST /custom-integrations/collegevidya/internal/users/{user_id}/integrations/collegevidya/jobs/{job_id}/retry-now

Queue table:
Use queue/jobs as the main table endpoint. It returns buckets:

json

{
  "ready": [],
  "scheduled": [],
  "deferred": [],
  "analytics_pending": []
}
Each job summary can include:

job_id
phone_number
prospect_id
bucket
status
queue_status
attempt
retry_count
retry_day
max_retries
scheduled_for
next_attempt_after
created_at
updated_at
last_failure_reason
Actions:
Show retry-now and delete only for non-active jobs. Hide or disable actions for:

in_progress
ended_waiting_for_analytics
analytics_pending
Long-term:
Once backend exposes a central route like GET /api/users/{user_id}/custom-integrations, replace the temporary frontend discovery registry with that single call. The UI should not need changes when that happens.

Deliverable:
Refactor the current implementation so adding another custom integration later only requires adding a discovery route/config entry, not copying a page or duplicating CollegeVidya-specific components.
```