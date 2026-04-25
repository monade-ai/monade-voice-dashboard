# Post-Processing Studio + Prompt Templates Library — Frontend Plan

## Objective

Add a new user-facing area for configuring post-processing templates without disturbing the current analytics, hot leads, call logs, or dashboard rendering. The feature should feel native to the existing Monade dashboard and follow the same visual grammar already used in:

- `Assistants` for the studio/editor experience
- `Knowledge Base` for the library/archive view
- `Hot Leads` for filter chips, summary cards, and list-driven analysis

This rollout should be additive. Existing screens should keep working for legacy analytics rows and for users who never configure a template.

---

## Recommended IA

### New nav items

Add a new category in the sidebar called `Intelligence`.

- `Qualification Studio`
  Purpose: create, edit, preview, and activate post-processing templates
- `Template Library`
  Purpose: browse saved prompt templates in a knowledgebase-style archive

This keeps the feature separate from `Analytics`, `Hot Leads`, and `Call Logs`, which should remain focused on reading outcomes rather than authoring rules.

### Why two screens instead of one

- `Qualification Studio` matches the step-based editor pattern from assistant studio
- `Template Library` matches the collection + search + archive behavior from knowledge base
- Keeping authoring and browsing separate reduces the chance of overloading settings or analytics views

---

## Naming Recommendations

Use terms that are clearer than the backend nouns without hiding the actual data model.

### Primary product names

- Page title: `Qualification Studio`
- Secondary page title: `Template Library`
- Feature umbrella label: `Call Qualification Rules`

### Replace technical labels in the UI

- `Post-processing template` → `Qualification Template`
- `Qualification buckets` → `Outcome Buckets`
- `Data points` → `Captured Fields`
- `Custom instructions` → `Analyzer Guidance`
- `Active template` → `Live Ruleset`
- `System default` → `Default Monade Rules`
- `Re-analyze` → `Preview with Different Rules` for dry-run
- `Commit preview` → `Apply to This Call`

### Good bucket language

Each bucket should have:

- `label`: user-facing, readable
- `key`: advanced/internal, editable but secondary
- `description`: what qualifies a call for this bucket

Example outcome bucket labels:

- `Booked`
- `Qualified Interest`
- `Needs Follow-Up`
- `Not a Fit`
- `Disconnected`

### Good captured field language

Examples:

- `Interest Score`
- `Qualification Score`
- `Budget Mentioned`
- `Preferred Date`
- `Decision Maker`
- `Next Step`

If the user wants numeric filtering, these should be strongly encouraged as `number` fields in the template builder.

---

## Page Structure

## 1. Qualification Studio

This should visually borrow from `assistant-studio.tsx`: sequential, editorial, roomy, and confidence-building.

### Header

- Title: `Qualification Studio`
- Subtitle: `Define how Monade scores, classifies, and extracts insight from every call.`
- Top-right actions:
  - `Save Template`
  - `Set as Live Ruleset`
  - `Preview on a Past Call` when editing an existing template

### Suggested sections

1. `Identity`
   Fields:
   - Template name
   - Optional description
   - Status badge: `Live`, `Draft`, or `Default`

2. `Outcome Buckets`
   Repeatable cards:
   - Label
   - Internal key
   - Description
   - Optional confidence range
   - Drag/reorder if easy, otherwise simple move up/down later

3. `Captured Fields`
   Repeatable cards:
   - Field label
   - Internal key
   - Description
   - Type selector: `Text`, `Number`, `List`, `Yes / No`

4. `Analyzer Guidance`
   One instruction per line, using a workshop-like text area

5. `Live Behavior`
   Small informational card:
   - `These rules apply to all future calls once activated.`
   - `Past calls stay unchanged unless you preview and apply them manually.`

### Important UX decisions

- Auto-generate snake_case keys from labels, but keep the key editable in an advanced reveal
- Show validation inline at the card level, not only in a global error toast
- Read-only mode for default templates
- Keep save actions local to the studio; do not auto-save

---

## 2. Template Library

This should visually borrow from `knowledge-base/page.tsx`: searchable archive, highlighted items, and clear metadata.

### Header

- Title: `Template Library`
- Subtitle: `Your saved qualification rule sets and reusable extraction schemas.`
- Actions:
  - Search
  - `Create Template`
  - optional `Show Live Only` chip

### Top section: Live ruleset

Pinned card for the currently active template:

- Template name
- Short description
- Source badge: `Default Monade Rules` or `Custom`
- Counts:
  - outcome buckets
  - captured fields
  - guidance lines
- Quick actions:
  - `Open in Studio`
  - `Clear Live Ruleset` if custom

### Main grid/list

Render templates as cards first, archive rows second if the list grows.

Each card should show:

- Name
- Description
- Last updated date
- `Default` badge if system template
- Mini stat strip:
  - `4 Outcomes`
  - `6 Fields`
  - `3 Rules`
- Action affordance

On hover or expand:

- Show bucket labels
- Show top captured fields
- Show whether it is currently live

---

## Analytics + Call Rendering Strategy

Do not rewrite current analytics or hot lead rendering wholesale. Add template-aware enhancements behind safe fallbacks.

### Safe rendering principle

Current pages should continue to work when:

- `post_processing_template_id` is `null`
- template fetch fails
- template was deleted after analytics rows were created
- analytics rows are legacy and use the old default shape

### Rendering approach

Keep the existing summary/verdict/confidence structure, then progressively enrich it:

1. Verdict label
   - If template exists and contains a matching bucket key, render its `label`
   - Otherwise fall back to current verdict heuristics

2. Key discoveries
   - If template exists, render fields in the order of `content.data_points`
   - Otherwise render current raw key discoveries as-is

3. Filters
   - Existing `Hot Leads` filters should remain exactly as they are for legacy/default rows
   - Add template-aware filters only when the screen is explicitly switched into template mode

This avoids breaking the current revenue-driving views.

---

## Filtering Model

Yes, custom filtering based on template schema is a good idea, but it should be introduced in a controlled way.

### Recommended filter architecture

Split filters into three layers:

1. `System Filters`
   Stable across all calls:
   - Date
   - Call quality
   - Confidence score
   - Template used

2. `Outcome Filters`
   Derived from `qualification_buckets`
   - One chip per bucket label
   - Count badge if available

3. `Field Filters`
   Derived from `data_points`
   Render based on field type:
   - `number` → min/max or threshold controls
   - `boolean` → yes/no/all
   - `list` → multi-select tokens
   - `string` → contains/exact search

### Example

If the user defines:

- `interest_score` as number
- `qualification_score` as number
- `decision_maker` as boolean

Then the UI can safely generate:

- `Interest Score >= 70`
- `Qualification Score >= 80`
- `Decision Maker = Yes`

### Where these filters belong

Not on the current global `Hot Leads` page at first.

Recommended rollout:

1. Add them to a new `Qualified Calls Explorer` or template-aware call list later
2. Keep `Hot Leads` stable for now
3. Reuse the filter bar pattern from `hot-leads/page.tsx` once the new explorer exists

This is the lowest-risk path.

---

## Data Layer Plan

Create dedicated hooks instead of overloading `use-analytics.ts`.

### Proposed hooks

- `use-post-processing-templates.ts`
  - list user templates
  - fetch one template with content
  - create
  - update
  - delete
  - set active
  - resolve active

- `use-template-cache.ts`
  - in-memory map by `template_id`
  - shared lookup for analytics/detail rendering

- `use-reanalyze-call.ts`
  - preview dry-run
  - commit result

### Extend analytics types carefully

Add optional fields to `CallAnalytics`:

- `post_processing_template_id?: string | null`
- `analytics_history?: unknown[]`

Do not replace the existing fields. That keeps current pages stable.

---

## API Integration Notes

There is one important backend contract mismatch to resolve before coding heavily:

- The guide says create/update bodies should send fields at the top level
- The Postman collection examples still show a `content` wrapper in some examples

Before implementation, confirm the live contract on:

- `POST /api/post-processing-templates`
- `PUT /api/post-processing-templates/:id`

Recommended frontend strategy until confirmed:

- build a single normalizer/serializer layer in the hook
- keep all route-specific payload shaping inside that hook
- do not spread this uncertainty into page components

---

## Release Order

### Phase 1: Safe foundation

- Add hooks and types
- Add template cache
- Add sidebar entries
- Add `Template Library`
- Add `Qualification Studio`

### Phase 2: Live ruleset management

- List templates
- Create/edit/delete templates
- Set active template
- Resolve active template card

### Phase 3: Template-aware rendering

- Add label mapping for verdicts where template metadata exists
- Add captured field rendering in call detail first
- Keep current analytics and hot leads logic as fallback

### Phase 4: Iteration workflow

- Re-analyze side panel on call detail
- Dry-run preview vs existing analytics
- Commit flow

### Phase 5: Advanced filtering

- Add schema-driven filters on a dedicated template-aware explorer
- Only later decide whether any of that belongs in hot leads

---

## Guardrails

- Do not refactor existing analytics cards unless required for template metadata injection
- Do not replace existing hot leads heuristics until template-aware filtering has proven stable
- Do not mix template authoring into settings; it deserves a dedicated area
- Always treat deleted/missing templates as a non-fatal case
- Cache template metadata aggressively client-side
- Keep default templates visible but read-only

---

## Recommended First Build

If we want the cleanest low-risk first implementation, build exactly this:

1. New sidebar items for `Qualification Studio` and `Template Library`
2. Library page with search, active template panel, and template cards
3. Studio page with sections for identity, outcome buckets, captured fields, and analyzer guidance
4. Active template selection
5. Template-aware rendering on call detail only

Leave these for the next pass:

- re-analyze commit flow
- schema-driven filtering on hot leads
- analytics page redesign

That gives users immediate control over qualification rules without risking regression in the current analytics surfaces.
