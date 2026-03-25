# Frontend Integration Guide — Billing System

This document covers every frontend-facing change from the billing system implementation. It describes which endpoints to call, what data to render, and how payment gateways fit in.

> **Base URL convention**: All config-server routes use `{{base_url}}/db_services` prefix.
> All timestamps from the backend are in **UTC**. Convert to IST (or user timezone) in the frontend using `dayjs`, `date-fns`, or `Intl.DateTimeFormat`.

---

## Authentication Context

The platform supports three authentication tiers:

| Tier | Mechanism | Used By |
|------|-----------|---------|
| **Session cookies** | BetterAuth session (httpOnly cookie) | Frontend / Dashboard |
| **API keys** | `Authorization: Bearer <api_key>` or `x-api-key` header | SDK / Programmatic access |
| **Service tokens** | Internal service API keys (env vars) | Inter-service calls (billing → config-server, agent → config-server, etc.) |

**Frontend always uses session cookies.** The user logs in via BetterAuth (`/api/auth/sign-in/email`), gets a session cookie, and all subsequent requests are authenticated via that cookie automatically. No API keys needed in the frontend.

Service-only routes (e.g., `PUT /api/billing/config/:key`, admin pricing overrides) are blocked for session/API-key auth — only service tokens can access them. These are listed in `SERVICE_ONLY_ROUTE_RULES` in `_auth.js`.

**Future scope — Admin master API key:** A separate auth tier for admin panel access with unrestricted permissions. Not yet implemented.

---

## 1. Credit Balance Display

### Endpoint
```
GET /api/users/:user_uid/credits
```

### Response
```json
{ "available_credits": 142.5000 }
```

### Notes
- This reads from PostgreSQL. During active calls, the real-time balance is tracked in Redis by the billing service but the DB value is the source of truth after settlement.
- Display with 2 decimal places (e.g., `142.50 credits`).
- Poll or refresh on page focus — don't long-poll.

---

## 2. Assistant Recording Toggle

### What changed
The `Assistant` model now has an `enableRecording` boolean field (default: `true`). When enabled, calls through this assistant are billed at **base rate + 0.5 credits/min** recording surcharge. When disabled, only the base rate applies.

### Create Assistant
```
POST /api/assistants
```
Include `enableRecording` in the body:
```json
{
  "name": "Sales Agent",
  "phoneNumber": "+919876543210",
  "enableRecording": true,
  ...
}
```
Defaults to `true` if omitted.

### Update Assistant
```
PATCH /api/assistants/:assistant_id
```
```json
{ "enableRecording": false }
```

### Frontend UX
- Show a toggle switch labeled something like **"Call Recording"** in the assistant settings.
- Below the toggle, display a cost hint:
  - ON: `"Calls will be recorded. Billed at 1.5 credits/min (1.0 base + 0.5 recording)"`
  - OFF: `"No recording. Billed at 1.0 credits/min"`
- The surcharge rates can be fetched dynamically from the billing config endpoint (see section 7) if you want to avoid hardcoding.

### Read Current Value
The assistant GET endpoints already return `enableRecording`:
```
GET /api/assistants/:assistant_id
GET /api/assistants/user/:user_uid
```

---

## 3. Call Analytics — Billing Data Rendering

### What changed
`CallAnalytics` now includes per-call billing audit data written at settlement time (3-4 seconds after call ends). The post-call analytics (Gemini summary, transcript) arrive ~2 minutes later via Pub/Sub but do NOT overwrite billing columns.

### Endpoint
```
GET /api/analytics/user/:user_uid
GET /api/analytics/:call_id
```

### New columns in response

| Field | Type | Description |
|-------|------|-------------|
| `call_started_at` | `DateTime?` (UTC) | When billing started |
| `call_ended_at` | `DateTime?` (UTC) | When billing ended |
| `duration_seconds` | `Int?` | Total call duration |
| `billing_data` | `Json?` | Billing audit object (see below) |

### `billing_data` JSON structure
```json
{
  "assistant_id": "uuid-of-assistant",
  "credits_used": 7.5,
  "cost_per_minute": 1.0,
  "recording_enabled": true,
  "recording_surcharge_total": 2.5,
  "call_direction": "outbound",
  "settlement_status": "ok"
}
```

### How to render call analytics cards

```
┌──────────────────────────────────────────────────┐
│  Call to +91 98765 43210                         │
│  25 Mar 2026, 2:30 PM IST → 2:35 PM IST         │  ← convert call_started_at/call_ended_at to IST
│  Duration: 5m 0s                                 │  ← duration_seconds → format as Xm Ys
│                                                  │
│  Assistant: Sales Agent                          │  ← billing_data.assistant_id → resolve name via GET /api/assistants/:id
│  Direction: Outbound                             │  ← billing_data.call_direction
│  Recording: Yes                                  │  ← billing_data.recording_enabled
│                                                  │
│  Credits Used: 7.50                              │  ← billing_data.credits_used
│    Base cost: 5.00 (5 min × 1.0/min)            │  ← credits_used - recording_surcharge_total
│    Recording: 2.50 (5 min × 0.5/min)            │  ← billing_data.recording_surcharge_total
│                                                  │
│  ▶ Play Recording  |  📄 Transcript              │  ← existing recording_url / transcript_url
│                                                  │
│  Summary: Customer interested in premium plan... │  ← analytics JSON (arrives ~2 min after call)
└──────────────────────────────────────────────────┘
```

### Handling partial data
- `billing_data` arrives first (3-4s after call). `analytics` and `transcript_url` arrive later (~2 min).
- If `billing_data` exists but `analytics` is null, show the billing card with a "Processing analytics..." placeholder.
- If `billing_data` is null (very old calls before this feature), skip the billing breakdown section entirely.

### Timestamps
- Backend stores everything in **UTC**.
- Frontend converts: `new Date(call_started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`
- Display format suggestion: `25 Mar 2026, 2:30:45 PM IST`

---

## 4. Pre-Billing Credit Checks (Outbound Calls & Campaigns)

### Endpoint
```
POST /api/billing/check-credits
```
```json
{ "user_uid": "xxx", "feature": "outbound_call" }
```

### Feature values
| Feature | Threshold | Behavior when below |
|---------|-----------|---------------------|
| `outbound_call` | 10 credits | **Hard block** — 402 response, disable the "Call" button |
| `campaign_create` | 50 credits | **Warning only** — 200 with `warning: true`, show yellow banner but allow creation |
| `campaign_start` | 50 credits | **Hard block** — 402 response, disable the "Start Campaign" button |

### Response — sufficient credits
```json
{
  "success": true,
  "allowed": true,
  "available_credits": 142.5,
  "required_credits": 10
}
```

### Response — insufficient (hard block)
HTTP 402:
```json
{
  "success": false,
  "error_code": "INSUFFICIENT_CREDITS",
  "error_message": "You need at least 50 credits to use campaign_start. Current balance: 32",
  "details": { "feature": "campaign_start", "required_credits": 50, "available_credits": 32 }
}
```

### Response — insufficient (warning only, for `campaign_create`)
HTTP 200:
```json
{
  "success": true,
  "allowed": true,
  "warning": true,
  "warning_code": "LOW_CREDITS",
  "warning_message": "You have 32 credits but 50 are recommended for campaign_create. You may not be able to start this later.",
  "details": { "feature": "campaign_create", "required_credits": 50, "available_credits": 32 }
}
```

### Frontend UX

**Outbound call button:**
- Before initiating a call, call `check-credits` with `feature: "outbound_call"`.
- If 402 → disable button, show red banner: *"Insufficient credits. You need at least 10 credits to make a call."*
- Alternatively, do this check on page load and cache for the session.

**Campaign creation:**
- Call `check-credits` with `feature: "campaign_create"` when user clicks "Create Campaign".
- If response has `warning: true` → show yellow warning banner: *"Low credits. You may not be able to start this campaign later. Consider topping up."* but **allow the creation to proceed**.
- If sufficient → proceed normally, no banner.

**Campaign start:**
- Call `check-credits` with `feature: "campaign_start"` when user clicks "Start".
- If 402 → disable button, show red banner: *"Cannot start campaign. You need at least 50 credits."*
- Link to the top-up/purchase page.

---

## 5. Feature Subscriptions (RAG Engine, etc.)

### Subscribe
```
POST /api/billing/subscribe
```
```json
{ "user_uid": "xxx", "feature": "rag_engine" }
```

**Success (200):**
```json
{
  "success": true,
  "subscription_id": "uuid",
  "credits_deducted": 200,
  "cycle_start": "2026-03-25T10:00:00.000Z",
  "cycle_end": "2026-04-22T10:00:00.000Z",
  "balance_after": 342.5
}
```

**Errors:**
- 402 `INSUFFICIENT_CREDITS` — not enough credits for bundle
- 409 `ALREADY_SUBSCRIBED` — active subscription exists

### Check Feature Access
```
GET /api/billing/feature-access/:user_uid/:feature
```

**Has access (200):**
```json
{ "has_access": true, "expires_at": "2026-04-22T10:00:00.000Z", "auto_renew": true }
```

**No access (402):**
```json
{ "has_access": false, "error_code": "FEATURE_NOT_PURCHASED" }
```

### List Subscriptions
```
GET /api/billing/subscriptions/:user_uid
```
Returns array of all subscriptions (active, cancelled, expired).

### Unsubscribe
```
POST /api/billing/unsubscribe
```
```json
{ "user_uid": "xxx", "feature": "rag_engine" }
```
Sets `auto_renew = false`. Access continues until `cycle_end`.

### Frontend UX
- Gate RAG features behind `feature-access` check. If `has_access: false`, show a paywall/subscribe prompt.
- Show subscription status card: *"RAG Engine — Active until 22 Apr 2026 — Auto-renew: ON"* with toggle/cancel button.
- After cancellation, show: *"Cancelled. Access until 22 Apr 2026. Re-subscribe anytime."*
- If subscription expired due to insufficient credits (status `expired`, auto_renew was true), show: *"Subscription expired — insufficient credits at renewal. Top up and re-subscribe."*

---

## 6. Billing Ledger (Transaction History)

### Endpoint
```
GET /api/billing/ledger/:user_uid?page=1&limit=20&event_type=topup&from=2026-03-01&to=2026-03-31
```

### Query params (all optional)
| Param | Description |
|-------|-------------|
| `event_type` | Filter: `topup`, `bundle_purchase`, `bundle_renewal`, `bundle_cancel`, `refund`, `manual_adjustment` |
| `feature` | Filter by feature name (e.g., `rag_engine`) |
| `from` | ISO date — filter entries from this date |
| `to` | ISO date — filter entries up to this date |
| `page` | Page number (default 1) |
| `limit` | Items per page (default 50, max 100) |

### Response
```json
{
  "entries": [
    {
      "id": "uuid",
      "event_type": "topup",
      "direction": "credit",
      "amount": "500.0000",
      "balance_after": "642.5000",
      "feature": null,
      "reference_id": "razorpay_payment_xxx",
      "description": "Credit top-up of 500 credits",
      "created_at": "2026-03-25T10:00:00.000Z"
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
```

### Frontend UX
- Render as a transaction history table with columns: Date, Type, Description, Amount (+/-), Balance After.
- Use `direction` to color the amount: green for `credit`, red for `debit`.
- Add filter dropdowns for `event_type` and date range.
- **Important**: This ledger does NOT contain per-call entries (too high volume). Per-call billing data is in CallAnalytics (section 3).

---

## 7. Billing Config (Display Pricing Info)

### Endpoint
```
GET /api/billing/config
```

### Response
```json
{
  "configs": [
    { "key": "voice_cost_per_minute", "value": "1.0", "category": "call_pricing" },
    { "key": "recording_surcharge_per_minute", "value": "0.5", "category": "call_pricing" },
    { "key": "min_credits_outbound_call", "value": "10", "category": "thresholds" },
    { "key": "min_credits_campaign", "value": "50", "category": "thresholds" },
    { "key": "rag_engine_credits", "value": "200", "category": "bundles" },
    { "key": "billing_cycle_days", "value": "28", "category": "bundles" },
    { "key": "credit_value_inr_default", "value": "4.0", "category": "pricing" },
    { "key": "credit_value_inr_enterprise", "value": "3.0", "category": "pricing" }
  ]
}
```

### Usage
- Use this to dynamically render pricing info on the UI instead of hardcoding rates.
- Example: Pricing page can show *"Voice calls: 1.0 credits/min"*, *"Recording surcharge: +0.5 credits/min"* pulled from this endpoint.
- Cache client-side for the session — these values rarely change.

---

## 8. Per-User Pricing (Checkout / Payment Gateway)

### What it is
Admins can set custom INR-per-credit pricing for specific users (enterprise deals, promo discounts, etc.). Credit deductions per call remain uniform for everyone — only the **purchase price** differs.

### Endpoint (frontend calls this at checkout)
```
GET /api/billing/user-pricing/:user_uid?keys=credit_value_inr_default
```

### Response
```json
{
  "user_uid": "xxx",
  "pricing": {
    "credit_value_inr_default": "3.5"
  }
}
```

If the user has no override, this returns the global default (e.g., `"4.0"`).

### Payment Gateway Integration (Future Scope)

#### Flow
```
1. User clicks "Buy 500 credits"
2. Frontend calls GET /api/billing/user-pricing/:user_uid?keys=credit_value_inr_default
3. Gets back INR price per credit (e.g., ₹3.5)
4. Computes total: 500 × 3.5 = ₹1,750
5. Creates Razorpay/Stripe order with amount = ₹1,750
6. User completes payment
7. Payment gateway webhook → your backend verifies signature
8. Backend calls POST /api/users/:user_uid/credits/add with { "amount": 500 }
9. Backend writes ledger entry (event_type: "topup", reference_id: razorpay_payment_id)
10. Frontend refreshes balance
```

#### What backend needs for payment gateway (not yet built)
- **Payment webhook handler**: Receives Razorpay/Stripe webhook, verifies signature, credits the user. Should be idempotent (use `reference_id` = payment ID to prevent double-credit).
- **Order creation endpoint**: `POST /api/payments/create-order` — computes amount using user-pricing, creates Razorpay order, returns `order_id` to frontend.
- **Payment verification endpoint**: `POST /api/payments/verify` — verifies payment signature, credits user, writes ledger.
- **Payment history**: Can be derived from ledger entries with `event_type: "topup"`.

#### Frontend checkout page
```
┌──────────────────────────────────────────────────┐
│  Buy Credits                                     │
│                                                  │
│  Your rate: ₹3.50 per credit                     │  ← from user-pricing endpoint
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 100      │  │ 500      │  │ 1000     │       │
│  │ ₹350     │  │ ₹1,750   │  │ ₹3,500   │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
│  Custom: [____] credits = ₹ [auto-calculated]    │
│                                                  │
│  [Pay with Razorpay]                             │
└──────────────────────────────────────────────────┘
```

#### Bundle purchase checkout
For feature bundles (RAG engine), the cost is in **credits**, not INR. The subscribe endpoint handles deduction automatically:
```
1. User clicks "Subscribe to RAG Engine"
2. Frontend calls POST /api/billing/subscribe { user_uid, feature: "rag_engine" }
3. Backend deducts credits (200 or per-user override) and creates subscription
4. Frontend shows success + updated balance
```
No payment gateway involved — bundles are paid from credit balance.

---

## 9. Summary: Endpoint Quick Reference

| Use Case | Method | Endpoint | Auth |
|----------|--------|----------|------|
| Get credit balance | GET | `/api/users/:user_uid/credits` | Session cookie |
| Pre-check credits | POST | `/api/billing/check-credits` | Session cookie |
| Get user pricing (checkout) | GET | `/api/billing/user-pricing/:user_uid` | Session cookie |
| Subscribe to feature | POST | `/api/billing/subscribe` | Session cookie |
| Unsubscribe | POST | `/api/billing/unsubscribe` | Session cookie |
| Check feature access | GET | `/api/billing/feature-access/:user_uid/:feature` | Session cookie |
| List subscriptions | GET | `/api/billing/subscriptions/:user_uid` | Session cookie |
| Transaction history | GET | `/api/billing/ledger/:user_uid` | Session cookie |
| Billing config (rates) | GET | `/api/billing/config` | Session cookie |
| Call analytics (billing) | GET | `/api/analytics/user/:user_uid` | Session cookie |
| Single call detail | GET | `/api/analytics/:call_id` | Session cookie |
| Create assistant | POST | `/api/assistants` | Session cookie |
| Update assistant | PATCH | `/api/assistants/:assistant_id` | Session cookie |
| Update billing config | PUT | `/api/billing/config/:key` | Service token only |
| Set user pricing override | PUT | `/api/billing/admin/pricing/:user_uid/:config_key` | Service token only |
| Remove pricing override | DELETE | `/api/billing/admin/pricing/:user_uid/:config_key` | Service token only |
| List all overrides | GET | `/api/billing/admin/pricing/overrides` | Service token only |
| Trigger cycle renewal | POST | `/api/billing/cycles/renew` | Service token only |

---

## 10. Key Frontend Considerations

1. **All timestamps are UTC** — always convert to user's timezone (default IST) before display.
2. **`billing_data` arrives before `analytics`** — show billing breakdown immediately, analytics with a loading state.
3. **Credit balance is eventually consistent** — during active calls, the billing service tracks real-time balance in Redis. The DB (and therefore the GET credits endpoint) settles after call ends. Don't show "real-time" balance during an active call.
4. **Ledger ≠ per-call history** — the ledger tracks financial events (topups, bundles, refunds). For per-call billing breakdown, use CallAnalytics.
5. **`enableRecording` defaults to `true`** — new assistants have recording on by default. Make sure the toggle reflects this.
6. **Campaign creation vs start** — creation with low credits shows warning but proceeds. Starting with low credits is blocked. Handle both UX flows differently.
7. **Subscription expiry** — when `auto_renew` is true but credits were insufficient at renewal, status becomes `expired`. User must manually re-subscribe after topping up.
