# Call Archive Pagination — Frontend Integration Guide

**Status:** shipped to the config server. **This is a breaking change** for any
client that relied on these endpoints returning a user's complete history.

---

## TL;DR

Four list endpoints used to return **every** row for a user. They now return
**20 rows by default, 100 maximum**, plus pagination metadata. Filtering that you
currently do in the browser should move to query parameters.

| | Before | After |
|---|---|---|
| Rows returned | all of them (one user had 102,168) | `limit`, default 20, max 100 |
| `count` | total number of rows | **rows in this response** |
| Total | not available | new `total` field |
| Filtering | client-side, after downloading everything | server-side query params |
| Ordering | `created_at DESC` | `created_at DESC, id DESC` (stable) |

**The `count` change is the one most likely to break you silently.** It used to
mean "how many calls does this user have"; it now means "how many rows are in
this response". If you render `count` as a total anywhere, it will read `20`.
Use `total` instead.

---

## Why this changed

Opening Call Archive asked the config server to materialise a user's entire
analytics history in Node memory. For the largest production account that is
~102k records and roughly **246 MB** of JSON before Prisma object overhead,
V8 overhead, serialisation, and Fastify buffers. Three config-server pods had
`OOMKilled` in their history, with logs cutting off around 101k records.

A browser-side cache cannot fix this: it only helps *after* a successful first
response. Cold sessions, cache misses, retries, and every additional user still
hit the unbounded query.

---

## Base URL and ingress

All config-server routes are exposed through the shared nginx ingress:

```
https://service.monade.ai/db_services/<route>
```

The ingress rule is `path: /db_services/(.*)` with
`nginx.ingress.kubernetes.io/rewrite-target: /$1`, so **the `/db_services`
prefix is stripped before the request reaches the service.** A route documented
here as `/api/analytics/user/:user_uid` is called as:

```
GET https://service.monade.ai/db_services/api/analytics/user/abc123?limit=20&offset=0
```

Notes:

- **Host matters.** The ingress matches `host: service.monade.ai`. Requests to
  the load balancer IP without that Host header will not route.
- **TLS** is issued by cert-manager (`letsencrypt-prod`) for `service.monade.ai`.
  Always use `https://`.
- The config server registers its routes both at `/api/...` and `/db_services/api/...`,
  so in-cluster callers can use either. **Through the ingress, always include
  `/db_services`.**
- Other services on the same host use sibling prefixes — `/campaigns/`,
  `/billing/`, `/analytics/` (the aggregator), `/webhook/`. Don't confuse
  `/analytics/` (aggregator service) with `/db_services/api/analytics` (config
  server, this document).

### Auth

Unchanged by this work. Send either the BetterAuth session cookie or an API key:

```
Authorization: Bearer <api-key>
```

Ownership is enforced server-side: an authenticated user may only read their own
`user_uid`. Passing someone else's id returns 403.

---

## Affected endpoints

| Endpoint | Notes |
|---|---|
| `GET /api/analytics` | requires `user_uid` query param |
| `GET /api/analytics/user/:user_uid` | main Call Archive list |
| `GET /api/analytics/user/:user_uid/campaign/:campaign_id` | campaign-scoped list |
| `GET /api/users/:user_uid/transcripts` | transcript history |

Single-record routes such as `GET /api/analytics/:call_id` are **unchanged**.

---

## Pagination parameters

| Param | Default | Rules |
|---|---|---|
| `limit` | `20` | integer, `1`–`100`. Above 100 → **400** |
| `offset` | `0` | integer, `>= 0` |

Malformed values (non-integer, negative, out of range) return **HTTP 400** with a
message naming the offending field — they are not silently clamped. Handle 400
rather than assuming the request degrades gracefully.

### Response shape

`analytics` and `count` are retained for compatibility; everything else is new.

```json
{
  "user_uid": "abc123",
  "analytics": [ /* ...records... */ ],
  "count": 20,
  "total": 102168,
  "limit": 20,
  "offset": 0,
  "has_more": true,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 20,
    "total": 102168,
    "has_more": true
  }
}
```

The top-level fields and the `pagination` object carry the same values — use
whichever suits your client. `total` reflects the **filtered** result set, so it
is the correct denominator for "showing 20 of N".

Advance a page with `offset += limit`. Stop when `has_more` is `false`.

> **Do not auto-walk every page on initial render.** That reproduces the exact
> problem this change fixes, just with more round trips. Page on user action.

The transcripts endpoint returns the same fields under `transcripts` instead of
`analytics`, alongside its existing `success: true`.

---

## Server-side filters

Apply these as query params on the analytics list endpoints. Filters run
**before** pagination, so `total` always reflects the filtered set.

| Param | Type | Notes |
|---|---|---|
| `search` | string | matches `call_id`, `phone_number`, or the analytics `summary`. Case-insensitive, max 200 chars |
| `verdicts` | CSV | e.g. `interested,likely_to_book`. Max 25 values |
| `qualities` | CSV | matches `call_quality` |
| `campaign_ids` | CSV | max 25 values |
| `template_id` | string | post-processing template id, or the literal `legacy` for rows with no template |
| `verdict` | string | single-verdict convenience form |
| `min_confidence` | number | `0`–`100`; outside that range → **400** |
| `exclude_negative` | `"true"` | drops negative verdicts (see below) |
| `direction` | `inbound` \| `outbound` | reads `billing_data.call_direction` or `provider_call_status.direction` |
| `duration_range` | `short` \| `medium` \| `long` | `<60s`, `60–300s`, `>300s` |
| `from` / `to` | ISO-8601 | filters on `created_at`; invalid dates → **400** |

Example:

```
GET /db_services/api/analytics/user/abc123
      ?limit=20&offset=0
      &verdicts=interested,likely_to_book
      &from=2026-07-01T00:00:00Z
      &direction=outbound
```

### `exclude_negative` — behaviour note

This filter drops verdicts containing `failed`, `dnc`, `wrong`, `disconnect`,
`declined`, `reject`, or **starting with** `not_`.

`not_` is matched as a **prefix only**. An earlier build matched it as a
substring, which also excluded legitimate verdicts such as `cannot_reach` and
`cannot_contact` (`can` + `not_` + …) — those calls silently vanished from the
archive. Fixed; if you have QA notes about missing "cannot reach" calls, that
was the cause.

---

## Ordering and pagination stability

Rows are ordered `created_at DESC, id DESC`.

The `id` tiebreaker matters more than it looks. `created_at` collides constantly
— a bulk campaign writes many rows in the same millisecond. With only
`created_at`, rows sharing a timestamp have *undefined* relative order, and
because each page is a separate query, a row could appear on two pages or be
skipped. The composite index and the `id` tiebreaker make ordering total, so
paging is stable.

**Deep offsets are still linear.** `offset=100000` walks 100k index entries
server-side. Fine for human browsing; don't build an export that pages to the
end of a large archive. Use `monade-analytics-aggregator` for bulk reporting.

---

## Known gotcha: the stats endpoint ignores filters

```
GET /api/analytics/stats/:user_uid
```

This endpoint was rewritten to aggregate inside Postgres (it no longer loads
every analytics document into Node), but **it does not accept the filter
params above**. It always reports over the user's entire history.

So if you render stats next to a filtered list, the two will disagree — the list
says "20 of 340 matching" while the stats tile reports totals across all 102,168.
Either label the stats as account-wide, or derive filtered figures from `total`
on the list response. Filter support on stats is a possible follow-up; it isn't
there today.

Its response shape is unchanged:

```json
{
  "user_uid": "abc123",
  "statistics": {
    "total_calls": 102168,
    "verdict_distribution": { "interested": 4021, "...": 0 },
    "average_confidence_score": 64.21,
    "call_quality_distribution": { "completed": 88123, "...": 0 },
    "period_start": "2026-01-04T09:12:00.000Z",
    "period_end": "2026-07-22T17:55:00.000Z"
  }
}
```

---

## Performance expectations

The composite indexes make **unfiltered** paging fast regardless of archive size —
Postgres walks the index in order and stops at `limit`.

Filters on JSON fields (`verdicts`, `qualities`, `search`, `min_confidence`)
**cannot use those indexes**. `search` in particular becomes a `LIKE '%…%'` over
a JSON extract and runs twice per request (once for rows, once for `total`). On
a 100k-row account, filtered queries stay noticeably slower than unfiltered ones.
Prefer the cheap filters (`campaign_ids`, `from`/`to`, `direction`) where they'd
give the same result, and debounce `search` input.

---

## Migration checklist

- [ ] Replace `count` with `total` anywhere you display a total
- [ ] Send `limit` / `offset`; don't rely on the default if you need a specific page size
- [ ] Handle **400** from malformed `limit` / `offset` / `min_confidence` / `from` / `to`
- [ ] Move client-side filtering to query params
- [ ] Use `has_more` (not `count > 0`) to decide whether to show "load more"
- [ ] Remove any "fetch all pages then filter" logic
- [ ] Decide how to present stats given they ignore filters
- [ ] Confirm requests go to `https://service.monade.ai/db_services/...`

---

## Rollout order

Backend is deployed first, dashboard second. If you deploy a dashboard build
that assumes pagination before the config server rolls out, it will receive the
old unbounded payload — large but structurally compatible, since `analytics` and
`count` are unchanged in shape. The reverse (backend first, old dashboard) shows
only the newest 20 rows until you ship.

For rollback, roll the dashboard back **before** reverting the backend.
