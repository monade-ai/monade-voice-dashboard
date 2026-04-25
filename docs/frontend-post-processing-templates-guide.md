# Post-Processing Templates — Frontend Integration Guide

**Audience:** frontend team
**Backend:** `monade-voice-config-server` + `post-processing` microservice
**Goal:** let users define, pick, and iterate on their own call-qualification rules without calling anyone at Monade.

---

## 1. What this feature does, in plain words

Every call we process produces an **analytics row** (verdict, confidence, summary, extracted data points). Until now, the rules for *what qualifies as "interested" vs "likely to book"* were hardcoded inside our Python analyzer — real-estate flavored, one-size-fits-nobody.

Now each user picks (or builds) a **post-processing template**. A template is:

- A **name** the user gives it ("Clinic appointments", "SaaS demo qualifier", etc.)
- A list of **qualification buckets** — the verdict categories specific to their business (e.g. `demo_booked`, `needs_followup`, `not_icp`)
- A list of **data points** to extract from each call (e.g. `company_size`, `preferred_date`, `current_tool`)
- Optional **custom instructions** — short pointers for the analyzer (e.g. "treat 'maybe later' as not_qualified unless a date is given")

When the Python post-processor runs on a new call, it looks up the call owner's active template and uses **those** buckets + data points in the prompt sent to Gemini. The resulting `CallAnalytics` row is shaped by the user's template.

There's also a **Re-analyze** endpoint so users can try a different template on an existing call without placing a new one — perfect for iteration.

### Day-1 behavior
Every existing user's `post_processing_template_id` is `null`. On first boot the backend seeds one **system default** template (same rules as today's hardcoded prompt). Users with `null` fall back to it. **Nothing breaks for existing users.**

---

## 2. Core concepts (UI vocabulary)

| Concept | What it is | What the user does |
|---|---|---|
| **Template** | A saved set of rules, stored as JSON in our backend | Creates / edits / deletes / picks one active |
| **Qualification bucket** | A verdict category (one will be chosen per call) | Adds 2–10, gives each a `key`, `label`, `description` |
| **Data point** | A field to extract from the call | Adds up to 12, picks a type (string/number/list/boolean) |
| **Custom instruction** | A short pointer for the analyzer | Adds up to 15 short lines |
| **System default** | A built-in template everyone can use | Can pick it, cannot edit/delete it |
| **Active template** | The one template applied to all their calls | Picks at most one at a time |
| **Re-analyze** | Run analysis again on an old call with any template | Tries templates against old calls to iterate |

---

## 3. Template JSON shape

Every template, once saved, is stored as JSON with this exact shape. Your form builds this object and sends it as the POST body. **Do not nest under `content`** — send the fields at the top level.

```json
{
  "user_uid": "<the owner's user_uid>",
  "name": "Clinic appointment qualifier",
  "description": "For inbound clinic calls. Optional.",
  "qualification_buckets": [
    {
      "key": "appointment_booked",
      "label": "Appointment Booked",
      "description": "Customer confirmed a specific date/time slot.",
      "confidence_range": [80, 100]
    },
    {
      "key": "callback_requested",
      "label": "Callback Requested",
      "description": "Customer wants someone to call them back at a later time.",
      "confidence_range": [50, 79]
    },
    {
      "key": "not_a_fit",
      "label": "Not a Fit",
      "description": "Wrong service or customer declined.",
      "confidence_range": [0, 49]
    }
  ],
  "data_points": [
    {
      "key": "preferred_date",
      "label": "Preferred Date",
      "description": "Any date mentioned by the customer for the appointment.",
      "type": "string"
    },
    {
      "key": "symptoms",
      "label": "Symptoms",
      "description": "List of symptoms the customer described.",
      "type": "list"
    }
  ],
  "custom_instructions": [
    "If the customer gives a specific date AND time, always treat as appointment_booked.",
    "Treat 'I'll think about it' as callback_requested only if a timeframe is mentioned."
  ]
}
```

### Validation rules (backend enforces these — surface them in your form)

| Field | Rule |
|---|---|
| `name` | Required, 1–120 chars |
| `description` | Optional, ≤ 1000 chars |
| `qualification_buckets` | Required, **2 to 10** items |
| `qualification_buckets[].key` | Required, snake_case, `^[a-z][a-z0-9_]{0,40}$`, unique within the template |
| `qualification_buckets[].label` | Required, 1–80 chars |
| `qualification_buckets[].description` | Required, 1–500 chars |
| `qualification_buckets[].confidence_range` | Optional; if set, `[low, high]` within 0–100 and low ≤ high |
| `data_points` | Optional, up to 12 items |
| `data_points[].key` | Same pattern as bucket key, unique |
| `data_points[].label` | Required, 1–80 chars |
| `data_points[].description` | Required, 1–400 chars |
| `data_points[].type` | Required, one of `"string"`, `"number"`, `"list"`, `"boolean"` |
| `custom_instructions` | Optional, up to 15 strings, each 1–300 chars |

Backend returns `400` with a `details: string[]` array if any rule fails — show these inline in the form.

---

## 4. API reference

All routes live on `monade-voice-config-server`. Auth is unchanged (BetterAuth cookie or API key — same as the rest of the app).

### 4.1 Create a template
```
POST /api/post-processing-templates
body: { user_uid, name, description?, qualification_buckets, data_points?, custom_instructions? }
→ 201 { id, name, description, url, is_system_default, created_at, updated_at, content }
```

### 4.2 List a user's templates (plus system defaults) — **use this for the picker**
```
GET /api/users/:user_uid/post-processing-templates
→ 200 {
    active_template_id: "uuid" | null,
    templates: [
      { id, user_uid, name, description, url, is_system_default, created_at, updated_at }
    ]
  }
```

System defaults have `is_system_default: true` and come first in the list. Use this to render the "Select template" dropdown.

### 4.3 Fetch one template (full content inlined)
```
GET /api/post-processing-templates/:id?include_content=true
→ 200 { id, user_uid, name, description, url, is_system_default, created_at, updated_at, content: <template JSON> }
```

Use this when opening the edit form — seed it from `content`.

### 4.4 Update a template
```
PUT /api/post-processing-templates/:id
body: { user_uid, name, description?, qualification_buckets, data_points?, custom_instructions? }
→ 200 { id, ..., content }
```

Cannot update a system default (`403`).

### 4.5 Delete a template
```
DELETE /api/post-processing-templates/:id
→ 200 { success: true }
```

Cannot delete a system default. Any user whose active template is this one gets their active set to `null` automatically (they'll fall back to the system default).

### 4.6 Set the user's active template
```
PUT /api/users/:user_uid/post-processing-template
body: { template_id: "<uuid>" | null }
→ 200 { user_uid, post_processing_template_id }
```

Sending `null` clears the user's pick and they fall back to the system default.

### 4.7 Resolve the active template (inlines the JSON content)

Mostly used by the Python service, but the UI can call this to show "currently applied rules" somewhere.

```
GET /api/users/:user_uid/post-processing-template/resolved
→ 200 {
    template_id, name, description, url, is_system_default,
    resolved_via: "user_active" | "system_default",
    content: <template JSON>
  }
```

### 4.8 Re-analyze an existing call (the iteration feature)
```
POST /api/post-processing/reanalyze
body: {
  call_id: "<call uuid>",
  template_id?: "<uuid>",   // optional — defaults to the call owner's active
  commit?: false            // default false → dry-run, does not touch DB
}

→ 200 dry-run {
    committed: false,
    template_id, template_name,
    analysis: { verdict, confidence_score, summary, key_discoveries, call_quality, use_case, ... }
  }

→ 200 commit=true {
    committed: true,
    template_id, template_name,
    analysis: { ... },
    history_length, updated_at
  }
```

**UX pattern:**
1. User opens a past call, clicks "Re-analyze with different rules"
2. They pick a template (or edit the current one) → call `reanalyze` with `commit: false`
3. Show them the new verdict / summary side-by-side with the original
4. If they like it, click "Save" → call `reanalyze` again with `commit: true`
5. On commit, the old analytics is appended to `analytics_history` (audit trail) and the new result replaces `analytics` on the `CallAnalytics` row.

---

## 5. Rendering analytics on the call list / detail pages

The shape of `CallAnalytics.analytics` is now **dynamic** — the set of `key_discoveries` fields depends on which template produced the row. Guidelines:

- Each row has `post_processing_template_id` (nullable). Legacy rows written before templates existed have `null` — treat those as "system default" for filter purposes.
- To render bucket filters / colors / counts, fetch the template the row was produced by (`GET /api/post-processing-templates/:id?include_content=true`) and read `content.qualification_buckets` for the full bucket list with labels and descriptions.
- **Cache template content client-side** by `template_id`. Templates don't change often; a Map/LRU keyed by id is fine.
- For `key_discoveries`, iterate the template's `data_points` to decide what to render (labels + types come from the template).
- Rows whose `template_id` doesn't match any current template (e.g. template was deleted) — fall back to displaying raw `analytics.verdict` / `analytics.key_discoveries` as-is.

---

## 6. Suggested frontend flows

### 6.1 First-time user
1. Load `/api/users/:user_uid/post-processing-templates`.
2. They'll see one row: the system default. `active_template_id` is `null`.
3. CTA: "Create your own template" (opens builder form) **or** "Keep using the default" (picks the system default explicitly via 4.6).

### 6.2 Template builder form
Sections, top to bottom:
1. **Name** (required) + **Description** (optional)
2. **Qualification buckets** — repeatable block; add/remove/reorder; each block has `label` (user-facing), `description`, optional confidence range (slider 0–100). Auto-derive `key` from label (lowercase, replace non-alphanum with `_`, trim to 40 chars) but let power users override.
3. **Data points** — repeatable block, same `key` auto-derivation, type selector.
4. **Custom instructions** — simple multi-line area, one pointer per line. Trim + filter empties on save.
5. Submit: build the JSON body exactly as in §3 and POST. On `400 { details }`, show each error next to its field.

### 6.3 Edit form
Same as 6.2 but prefill via `GET /api/post-processing-templates/:id?include_content=true` and PUT on save. If `is_system_default: true`, render in read-only mode.

### 6.4 Template picker (on settings page)
`GET /api/users/:user_uid/post-processing-templates` → radio list with system default pinned on top. Change selection → `PUT /api/users/:user_uid/post-processing-template`. Show a small "Why does this matter?" tooltip explaining that this applies to *all future calls* (and past calls remain as-they-were unless re-analyzed).

### 6.5 Iteration sandbox on a call detail
- Button on any `CallAnalytics` row: "Re-analyze"
- Opens a side panel with the current `analytics` on the left, and a template picker + preview on the right.
- User picks / edits template → "Preview" button → `POST /api/post-processing/reanalyze` with `commit: false` → show diffed output (new verdict, new key_discoveries) side-by-side.
- "Save" button → same call with `commit: true`.

---

## 7. Edge cases / gotchas

- **`name` is not unique per user** — intentional. Users can have two "Draft" templates if they want. Only `id` uniquely identifies.
- **Backend always injects** `call_quality` (`completed | abrupt_end | no_response | voicemail`) regardless of template. Treat it as system-level, not user-level.
- **Verdict keys from Gemini are validated** against the template's bucket keys — if Gemini hallucinates a key, backend snaps to the template's lowest-confidence bucket. Your filter UI should only show bucket keys that are in the template.
- **`analytics_history`** on `CallAnalytics` is an array of prior analyses (one entry per commit-re-analyze). Render as a timeline if you want to build an audit view; ignore otherwise.
- **Dry-run reanalyze is free of side effects** — feel free to let users hammer it for iteration. Only `commit: true` mutates DB.
- **Deleted templates** that were referenced by an old `CallAnalytics` row: the row keeps `post_processing_template_id` pointing to a no-longer-existing template. Guard your UI (`404` from `GET /api/post-processing-templates/:id` → show raw analytics).

---

## 8. Quick integration checklist

- [ ] Templates picker on user settings (calls 4.2 + 4.6)
- [ ] Template builder form (calls 4.1, validation from §3)
- [ ] Template edit / delete (4.4, 4.5) — disabled when `is_system_default`
- [ ] Call list/detail: render bucket + data_points using the template tied to the row (4.3 + client cache)
- [ ] Re-analyze side panel on call detail (4.8 dry-run, then commit)
- [ ] Empty state copy: "You're using the default qualification rules. [Customize →]"

---

## 9. Reference: system default template (shipped with every deployment)

Name: `Default (Generic Lead Qualification)`
Buckets: `likely_to_book`, `interested`, `not_interested`, `call_disconnected`
Data points: `service_type`, `price_quoted`, `customer_location`, `customer_name`, `customer_language`, `objections_raised`, `next_steps`

This is identical to our pre-template hardcoded prompt, so existing dashboards keep working unchanged until users opt into their own template.
