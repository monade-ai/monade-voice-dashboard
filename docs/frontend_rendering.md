# Frontend Rendering Notes

## Primary endpoint

Render the dashboard from:

`GET /api/campaigns/:campaign_id/analytics`

## Recommended widgets

Use `overview` for headline cards:

- `total_contacts`
- `attempted_contacts`
- `connected_contacts`
- `total_call_attempts`
- `total_credits_used`
- `credits_per_connected_call`
- `credits_per_qualified_lead`
- `pickup_rate`
- `qualification_rate`
- `avg_call_duration_seconds`
- `avg_confidence_score`
- `enhanced_transcript_coverage`

Use `diagrams.connectivity_funnel` for a funnel chart:

- `contacts_total`
- `attempted_contacts`
- `connected_calls`
- `qualified_calls`

Use these for bar / donut charts:

- `diagrams.qualification_distribution`
- `diagrams.call_quality_distribution`
- `diagrams.provider_status_distribution`
- `diagrams.contact_status_distribution`
- `diagrams.template_distribution`

Use `diagrams.confidence_score_distribution` for the c-score histogram.

Use `diagrams.timeline` for a daily trend chart.

Use `diagrams.hour_of_day` for a "best time to call" heatmap or bar chart:

- `hour`
- `calls`
- `connected`
- `qualified`
- `pickup_rate`
- `qualification_rate`

Use `diagrams.duration_vs_qualification` for a duration bucket chart.

Use `diagrams.drop_off_pattern` for the "where did connected calls fail?" breakdown.

Use `diagrams.outcome_flowchart` for a flowchart / sankey-style rendering.

## Date handling

Do not treat reanalysis time as call time.

- Call table date: prefer `call_started_at`, then `created_at`.
- Campaign analytics row date: `campaign_analytics.date` is the campaign event day.
- Analytics run time: `summary.generated_at`.
- Reanalysis mutation time: individual call `updated_at`.

This means a campaign can be analyzed repeatedly without moving historical call logs.

## Call table

When `include_calls=true`, use `call_entries.entries` for the detailed table.

Useful columns:

- `call_id`
- `phone_number`
- `provider_status`
- `verdict`
- `confidence_score`
- `call_quality`
- `duration_seconds`
- `template_name`
- `use_case`
- `connected`
- `created_at`

## Reanalysis UX

For the campaign analytics action button, offer three choices:

1. Analyze campaign
2. Analyze campaign and re-analyze all entries
3. Analyze campaign, re-analyze all entries, and enhance transcripts automatically

Recommended backend sequence:

1. `GET /api/campaigns/:campaign_id/analytics`
2. If the user chose reanalysis, call `POST /api/campaigns/:campaign_id/reanalyze`.
3. If `commit=true` reanalysis finished, call `GET /api/campaigns/:campaign_id/analytics` again to refresh the stored campaign summary.
4. If the user chose enhanced transcripts, call `POST /api/campaigns/:campaign_id/enhance-transcripts` with `{ "concurrency": 3 }`.

For longer-running operator flows, pass `async_job: true` and poll:

```http
GET /api/campaigns/:campaign_id/jobs/:job_id
POST /api/campaigns/:campaign_id/jobs/:job_id/cancel
```

This is lightweight Redis-backed job tracking with a 24h TTL. It is still not a full durable queue, but polling works across campaign-service pods.

For template experiments before commit:

1. Call `POST /api/campaigns/:campaign_id/reanalyze` with `commit=false`.
2. Compare returned `results[].analysis`.
3. Re-run with `commit=true` once the user wants to apply the template to all calls in that campaign.

Recommended UX safeguards:

- Show total calls before starting.
- Warn that `commit=true` updates stored analytics for all calls in the campaign.
- Surface `failed_calls` and individual `results[].error` entries if some calls fail to reprocess.
- Treat failed entries as skipped for that run; the backend does not retry them forever.
- Disable these actions while the campaign status is `active` or `pending`; backend returns 409 in that case.
- Let the user pick the post-processing template before reanalysis.

## Recording and transcript actions

Recording backfill is optional and separate:

```http
POST /api/campaigns/:campaign_id/backfill-recordings
Content-Type: application/json

{ "concurrency": 8 }
```

Enhanced transcript backfill is optional and should be visibly heavier:

```http
POST /api/campaigns/:campaign_id/enhance-transcripts
Content-Type: application/json

{ "concurrency": 3 }
```

Show `calls_kicked_off`, `calls_failed`, and per-call errors from the response.
Failed recording/enhanced-transcript entries are skipped for that run; show them as actionable failures rather than blocking the whole campaign flow.
