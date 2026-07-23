# Haiku Shadow Analytics — API Guide

**What this is:** an A/B test. Every call that goes through post-processing is
analysed twice — once by **Gemini** (the live, authoritative result that drives
webhooks, campaigns, and everything user-facing) and once by **Claude Haiku on
AWS Bedrock** (a shadow result stored purely for QA comparison).

These endpoints exist so the QA team can compare the two side by side and decide
whether Haiku is good enough to replace Gemini.

---

## Read this first

**Nothing here affects production behaviour.** The Haiku result is written to a
single new column, `call_analytics.haiku_shadow_analytics`. It does not feed
`analytics`, webhooks, campaign reconciliation, billing, or any existing
response. The main analytics list endpoints do **not** return this column.

**The shadow is currently disabled.** It ships behind
`HAIKU_SHADOW_ENABLED=false` and is being enabled only after AWS Bedrock quota
is granted. Until then every call returns `"shadow_status": "missing"` and
`"haiku": null`. **Build the UI to handle that as the normal case**, not an error.

**Historical calls will never have shadow data.** The column is null for
everything processed before the feature was switched on. Don't treat a null as a
failure — see `shadow_status` below.

---

## Base URL and ingress

Same host and prefix as every other config-server route:

```
https://service.monade.ai/db_services/<route>
```

The ingress rule `path: /db_services/(.*)` uses
`nginx.ingress.kubernetes.io/rewrite-target: /$1`, so **`/db_services` is
stripped before reaching the service.** A route written below as
`/api/analytics/:call_id/haiku-shadow` is called as:

```
GET https://service.monade.ai/db_services/api/analytics/call-abc/haiku-shadow
```

- The ingress matches `host: service.monade.ai` — requests without that Host
  header won't route.
- TLS via cert-manager (`letsencrypt-prod`). Use `https://`.
- Auth is unchanged: BetterAuth session cookie, or `Authorization: Bearer <api-key>`.
  Ownership is enforced — you can only read your own `user_uid`.

---

## Endpoints

### 1. Single call — side-by-side comparison

```
GET /api/analytics/:call_id/haiku-shadow
```

Returns both analyses for one call plus a precomputed comparison.

```json
{
  "call_id": "call-abc",
  "user_uid": "abc123",
  "campaign_id": "camp-1",
  "phone_number": "+919812345678",
  "transcript_url": "https://...",
  "post_processing_template_id": "tpl-7",
  "created_at": "2026-07-23T08:11:00.000Z",
  "updated_at": "2026-07-23T08:11:04.000Z",

  "gemini": {
    "verdict": "interested",
    "confidence_score": 70,
    "summary": "Customer asked about pricing and agreed to a callback.",
    "key_discoveries": { "customer_name": "Asha", "next_steps": "Call back Friday" },
    "call_quality": "completed",
    "call_status": "picked_up",
    "voicemail": false,
    "use_case": "Lead qualification",
    "analysis_model": "gemini-3.1-flash-lite",
    "analysis_timestamp": "2026-07-23T08:11:02.000Z",
    "template_id": "tpl-7",
    "template_name": "CV Lead Qualification"
  },

  "haiku": {
    "schema_version": 1,
    "provider": "bedrock",
    "model": "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    "region": "ap-south-1",
    "analysis": { "...same shape as `gemini` above..." },
    "usage": {
      "input_tokens": 1500,
      "output_tokens": 220,
      "estimated_cost_usd": 0.0026
    },
    "latency_ms": 912,
    "comparison": { "...see below..." },
    "error": null,
    "created_at": "2026-07-23T08:11:03.500Z"
  },

  "shadow_status": "ok",
  "comparison": { "...same object as haiku.comparison, lifted for convenience..." }
}
```

`gemini` is the live analytics blob — **identical** to the `analytics` field on
`GET /api/analytics/:call_id`. `haiku.analysis` uses the same shape deliberately,
so one renderer works for both columns.

Returns **404** if no `call_analytics` row exists for that `call_id`.

### 2. Review list

```
GET /api/analytics/user/:user_uid/haiku-shadow
```

| Param | Default | Notes |
|---|---|---|
| `limit` | `100` | max `500` |
| `offset` | `0` | |
| `campaign_id` | — | scope to one campaign |
| `only` | `all` | `all` \| `shadowed` \| `matched` \| `mismatched` \| `errors` |

`only=mismatched` is the QA workhorse — it returns just the calls where Gemini
and Haiku disagreed on the verdict. `only=errors` returns calls where the Haiku
run itself failed.

```json
{
  "user_uid": "abc123",
  "analytics": [
    {
      "call_id": "call-abc",
      "phone_number": "+919812345678",
      "campaign_id": "camp-1",
      "post_processing_template_id": "tpl-7",
      "created_at": "2026-07-23T08:11:00.000Z",
      "updated_at": "2026-07-23T08:11:04.000Z",
      "gemini": { "..." },
      "haiku": { "..." },
      "shadow_status": "ok",
      "comparison": { "..." }
    }
  ],
  "count": 1,
  "limit": 100,
  "offset": 0
}
```

> Note: this endpoint's pagination defaults (100 / max 500) differ from the main
> Call Archive routes (20 / max 100), because it's an internal QA surface with
> heavier rows. It also returns `count` only — no `total` / `has_more`. If you
> need those, say so and they can be added.

### 3. Scorecard

```
GET /api/analytics/user/:user_uid/haiku-shadow/stats
```

Optional `campaign_id` to scope.

```json
{
  "user_uid": "abc123",
  "campaign_id": null,
  "statistics": {
    "total_calls": 5120,
    "shadow_attempted": 4980,
    "shadow_scored": 4955,
    "shadow_errors": 25,
    "shadow_coverage_pct": 97.27,
    "verdict_agreement_pct": 91.4,
    "call_quality_agreement_pct": 96.8,
    "voicemail_agreement_pct": 99.1,
    "avg_confidence_delta": 4.35,
    "avg_latency_ms": 890,
    "estimated_cost_usd_total": 12.401832,
    "verdict_matrix": {
      "interested -> interested": 3100,
      "interested -> likely_to_book": 210,
      "not_interested -> not_interested": 1400
    }
  }
}
```

Field meanings, since several are easy to misread:

| Field | Meaning |
|---|---|
| `total_calls` | every `call_analytics` row for the user — **including calls processed before the shadow existed** |
| `shadow_attempted` | rows where a shadow result was written (success *or* error) |
| `shadow_errors` | of those, how many failed |
| `shadow_scored` | `attempted − errors` — the usable comparison count |
| `shadow_coverage_pct` | `attempted / total_calls` |
| `*_agreement_pct` | agreement over `shadow_scored`, not over `total_calls` |
| `avg_confidence_delta` | mean of `haiku − gemini` confidence. Positive = Haiku more confident |
| `verdict_matrix` | `"gemini_verdict -> haiku_verdict": count`, i.e. a confusion matrix |

**`shadow_coverage_pct` will look terrible at first and that's expected.** The
denominator is the user's entire history, so on day one it reads near 0% and
climbs as new calls arrive. To get a meaningful figure, scope to a `campaign_id`
that started after the shadow was enabled.

---

## `shadow_status` — three states

Every response carries this. Branch on it rather than null-checking `haiku`.

| Value | Meaning | Suggested UI |
|---|---|---|
| `"missing"` | no shadow was written — feature was off, call predates it, or the run was load-shed | "Not compared" / hide the Haiku column |
| `"error"` | the Haiku run failed; `haiku.error` explains why | show the error, keep Gemini visible |
| `"ok"` | both analyses present; `comparison` is populated | render side by side |

When `shadow_status` is `"error"`, `haiku.analysis` is `null` and `haiku.error`
looks like:

```json
{ "type": "ThrottlingException", "message": "rate exceeded", "stage": "bedrock_call" }
```

`stage` is one of `bedrock_call` (the API call failed), `parse` (Haiku returned
unparseable JSON), or `response` (the model declined the request).

---

## The `comparison` object

Computed server-side at write time so it can be filtered on, rather than
recomputed per render.

```json
{
  "verdict_match": true,
  "call_quality_match": true,
  "call_status_match": true,
  "voicemail_match": true,
  "confidence_delta": 12,
  "key_discoveries_matched": 2,
  "key_discoveries_total": 3,
  "mismatched_fields": ["next_steps"],
  "gemini_verdict": "interested",
  "haiku_verdict": "interested",
  "gemini_model": "gemini-3.1-flash-lite"
}
```

`mismatched_fields` names the `key_discoveries` keys where the two disagreed —
use it to highlight only the differing cells instead of diffing client-side.

Data-point comparison is deliberately **lenient**: strings are trimmed and
lowercased, lists are compared order-insensitively, and `null` / `""` / `"n/a"`
are all treated as "not found". Without that, trivial formatting differences
would read as model disagreements. So `"Asha"` and `" asha "` count as a match,
while `"Call back Friday"` vs `"Follow up tomorrow"` does not.

`confidence_delta` is `null` when either side didn't produce a numeric score.

---

## Suggested QA workflow

1. **Scorecard** — `/haiku-shadow/stats` scoped to a recent `campaign_id` for
   headline agreement, cost, and latency.
2. **Disagreements** — `/user/:user_uid/haiku-shadow?only=mismatched` to review
   only where the models differ.
3. **Drill in** — `/analytics/:call_id/haiku-shadow` for one call, alongside the
   transcript from `transcript_url`.
4. **Failures** — `?only=errors` to check whether errors cluster on one
   `error.type` (throttling behaves very differently from bad parses).

`verdict_matrix` is worth surfacing directly: it shows *which* verdicts Haiku
tends to shift toward, which is more actionable than a single agreement
percentage.

---

## Write endpoint (internal — not for the dashboard)

```
POST /api/analytics/:call_id/haiku-shadow
```

Called only by the post-processing service. Documented here so nobody mistakes
it for a dashboard route.

It never creates a `call_analytics` row and never emits an analytics-completed
event, so it cannot trigger a webhook. If the Gemini row hasn't landed yet it
returns **202** with `{"pending": true}` and the caller retries with backoff.

---

## Cost note

`usage.estimated_cost_usd` is computed from configured per-token rates for QA
comparison. It is an **estimate**, not billing truth — reconcile against AWS
Cost Explorer before quoting real numbers.
