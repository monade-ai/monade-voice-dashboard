# Campaign Schedule Later

This note is only for the new "schedule later" campaign behavior.

## What Frontend Should Use

There is no new endpoint for this feature.

Frontend should use the existing campaign endpoints:

- `POST /campaigns/api/v1/campaigns/`
- `PATCH /campaigns/api/v1/campaigns/{campaign_id}`
- `GET /campaigns/api/v1/campaigns/{campaign_id}`
- `POST /campaigns/api/v1/campaigns/{campaign_id}/start`

## New Field

Use `scheduled_start_at` in the request body.

- Type: ISO 8601 datetime
- Expected value: UTC timestamp
- Example: `2026-05-07T10:00:00Z`

If `scheduled_start_at` is omitted or `null`, the campaign behaves like a normal unscheduled campaign.

## Create Scheduled Campaign

Use `POST /campaigns/api/v1/campaigns/`.

Example body:

```json
{
  "name": "May 7 Outreach",
  "description": "Start later in the day",
  "provider": "vobiz",
  "trunk_name": "Vobiz-SIP",
  "assistant_id": "assistant_123",
  "max_concurrent": 8,
  "calls_per_second": 1,
  "daily_start_time": "10:00",
  "daily_end_time": "21:00",
  "timezone": "Asia/Kolkata",
  "max_retries": 2,
  "scheduled_start_at": "2026-05-07T10:00:00Z"
}
```

Expected behavior:

- campaign is created in `pending`
- it auto-starts when `scheduled_start_at` becomes due

## Update Scheduled Start

Use `PATCH /campaigns/api/v1/campaigns/{campaign_id}`.

Example body:

```json
{
  "scheduled_start_at": "2026-05-07T12:30:00Z"
}
```

Use this when the user edits the scheduled launch time before the campaign starts.

## Manual Start Override

Use `POST /campaigns/api/v1/campaigns/{campaign_id}/start`.

Expected behavior:

- campaign starts immediately
- any previously stored `scheduled_start_at` is cleared
- it will not auto-start again later

This is the safe override path when a user clicks "Start now" before the scheduled time.

## What Frontend Should Display

Read `scheduled_start_at` from campaign details/list responses.

Suggested UI rules:

- if `status = pending` and `scheduled_start_at` is set, show "Scheduled"
- if `status = active`, ignore old schedule messaging
- if user clicks "Start now", call the start endpoint instead of patching the schedule

## Important Notes

- `scheduled_start_at` is one-time scheduling, not a recurring daily start
- `daily_start_time` and `daily_end_time` still control the allowed calling window for each day
- a campaign can be scheduled for later and still respect its daily calling window once it starts
