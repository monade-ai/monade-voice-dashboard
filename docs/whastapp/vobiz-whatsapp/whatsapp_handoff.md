# WhatsApp Feature — Frontend Handoff

> **Audience:** the next frontend developer, assumed to have **zero prior context**.
> Read this top-to-bottom once, then you can continue without re-investigating anything.
>
> **Repo:** `monade-voice-dashboard` (Next.js 16 App Router, React 19, TypeScript, Tailwind v4).
> **Goal:** ship **two new pages** for a new WhatsApp messaging feature.

---

## 1. What we are building (the big picture)

The backend added a "Vobiz WhatsApp" capability: users connect a WhatsApp Business
number, manage message templates, and configure automatic WhatsApp follow-ups that
fire after a call's post-processing finishes.

We are building **two pages** for this:

| Page | Route | Sidebar label | Icon | Purpose |
|------|-------|---------------|------|---------|
| **WhatsApp Setup** | `/whatsapp` | `WhatsApp` | `MessageCircle` | Connect numbers, manage/sync/create templates. Two tabs: *Connected Numbers* + *Templates*. |
| **WhatsApp Flows** | `/whatsapp-flows` | `WhatsApp Flows` | `Workflow` | Map post-processing outcomes → WhatsApp templates, per assistant. |

### Source-of-truth documents (READ THESE — they are the spec)
- `docs/whastapp/vobiz-whatsapp/frontend-whatsapp-setup-and-templates.md` — spec for the Setup page.
- `docs/whastapp/vobiz-whatsapp/frontend-whatsapp-flows.md` — spec for the Flows page.
- `unified-api-collection.json` (repo root) — Postman collection; search it for `vobiz-whatsapp` to see every route + example body. The routes were re-verified against this file.

### Product decisions already made (do not re-litigate)
1. **Sidebar grouping:** both pages go under a **new "Messaging" category** in the sidebar.
2. **Icons:** Setup = `MessageCircle`, Flows = `Workflow` (both from `lucide-react`).
3. **"Used by" column** on the Templates tab: backend shipped a **bulk flows endpoint**
   (`GET /api/users/:user_uid/vobiz-whatsapp/flows`) — use that, do **not** fan out per assistant.
4. **Out of scope for these two pages:** rendering the `whatsapp_followup` JSON on the
   call-history/analytics detail rows. It's mentioned in the flows doc but it's a separate
   surface — leave it as a future follow-up (see §9).

---

## 2. Status: what is DONE vs what is LEFT

### ✅ DONE — already committed to the working tree

| File | What it is |
|------|------------|
| `src/app/hooks/use-vobiz-whatsapp.ts` | Hook: channels CRUD + templates list/sync/create. |
| `src/app/hooks/use-whatsapp-flows.ts` | Hook: bulk flows + per-assistant flow get/save. |
| `src/app/(app)/whatsapp/components/status-badges.tsx` | `TemplateStatusBadge`, `ChannelStatusBadge`, `VerificationBadge`. |
| `src/app/(app)/whatsapp/components/connect-channel-dialog.tsx` | "Connect BYO WABA" form dialog. |
| `src/app/(app)/whatsapp/components/import-channel-dialog.tsx` | "Import existing Vobiz channel" dialog. |
| `src/app/(app)/whatsapp/components/template-form-dialog.tsx` | Create **and** Resubmit template dialog (one component, `resubmitFrom` prop). |
| `src/app/(app)/whatsapp/components/channels-tab.tsx` | "Connected Numbers" tab body (table + actions + dialogs). |
| `src/app/(app)/whatsapp/components/templates-tab.tsx` | "Templates" tab body (channel picker, status filter, table, "Used by"). |

### ⛔ LEFT TO DO — your job

| # | Task | File | Difficulty |
|---|------|------|-----------|
| 1 | **WhatsApp Setup page shell** — header + `Tabs` wiring the two tab components together. | `src/app/(app)/whatsapp/page.tsx` (CREATE) | Easy — §6 |
| 2 | **WhatsApp Flows page** — the whole outcome-mapping page. | `src/app/(app)/whatsapp-flows/page.tsx` (CREATE) | Hard — §7 |
| 3 | **Sidebar entries** — new "Messaging" category + 2 nav items. | `src/components/sidebar.tsx` (EDIT) | Easy — §8 |
| 4 | **Type-check + smoke test.** | — | §10 |
| 5 | (Optional) `whatsapp_followup` on call detail. | — | §9 |

Nothing in the DONE list needs changes — it's wired to consume what you build.
Tasks 1 and 3 are mechanical. **Task 2 (the Flows page) is the real work** — §7 is a near-complete spec with a skeleton.

---

## 3. How this codebase talks to the backend (CRITICAL — read before coding)

There is **no per-request auth token handling in page code**. The pattern is:

- The browser calls the backend **directly** at `MONADE_API_BASE`
  (`= https://service.monade.ai/db_services`, exported from `src/config.ts`).
- `fetchJson()` from `src/lib/http.ts` defaults to `credentials: 'include'`, so the
  **better-auth session cookie** rides along automatically. That cookie *is* the auth.
- The `db_services` segment in the base URL is the **ingress prefix**. So a doc route
  like `GET /api/users/:user_uid/...` becomes `` `${MONADE_API_BASE}/api/users/${uid}/...` ``.
- The current user's id comes from **`useMonadeUser()`** (`src/app/hooks/use-monade-user.tsx`)
  → `{ userUid, loading }`. Every data hook gates on `userUid`.
- **Do NOT** use `/api/proxy/...` — that route exists for a different (server-key) path and
  is not how the WhatsApp/templates/RAG features work.

Reference hooks that already follow this exact pattern (copy their style):
`src/app/hooks/use-post-processing-templates.ts`, `src/app/hooks/use-rag-corpus.ts`.

Errors: `fetchJson` throws `ApiError` (has `.status`, `.data`). The two new hooks already
catch + `toast.error(...)` and re-throw where the caller needs to react. Pages should just
`try/catch` and not double-toast.

### Providers — already mounted, nothing to add
`src/app/(app)/app-shell.tsx` wraps every `(app)` route with `MonadeUserProvider`,
`AssistantsProvider`, `KnowledgeBaseProvider`, etc. So `useMonadeUser()` and
`useAssistants()` work in any page under `src/app/(app)/` with no extra setup.

---

## 4. Design system / conventions (so the new pages match the existing ones)

Look at `src/app/(app)/template-library/page.tsx` and `src/app/(app)/knowledge-base/page.tsx`
("Library" in the sidebar) — those are the reference pages. Conventions:

- Every page is `'use client'`, starts with `<DashboardHeader />` (`@/components/dashboard-header`),
  then `<main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-...">`.
- Page wrapper: `<div className="min-h-screen bg-background flex flex-col font-sans">`.
- Page title block: `<h1 className="text-5xl font-medium tracking-tighter text-foreground">`
  + muted subtitle, inside a `border-b border-border/40 pb-8` row.
- Micro-labels everywhere: `text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground`.
- Primary action buttons: `className="bg-foreground text-background hover:bg-foreground/90"`,
  `h-9`/`h-10`, `text-[10px] font-bold uppercase tracking-[0.18em]`.
- Cards: `PaperCard` from `@/components/ui/paper-card` (`variant="default"` for plain,
  `variant="mesh"` for the shader-gradient look). The new tables use `variant="default"`.
- Toasts: `import { toast } from 'sonner'`.
- Theme: everything must work in light + dark. Use semantic tokens (`bg-background`,
  `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.) — the
  status badges use `dark:` variants; never hardcode raw hex.

### UI primitives available (in `src/components/ui/`)
`Button`, `Input`, `Label`, `Textarea`, `Badge`, `Select` (+ `SelectTrigger/Content/Item/Value`),
`Dialog` (+ `DialogContent/Header/Footer/Title/Description`), `Tabs` (+ `TabsList/Trigger/Content`),
`Table` (+ `TableHeader/Body/Row/Head/Cell`), `Card`, `Tooltip`, `Popover`, `Skeleton`.

> ⚠️ **There is no `Switch` component.** The Flows page "Enabled" toggle must be a small
> hand-rolled `<button role="switch">` — skeleton provided in §7.

---

## 5. API reference (everything the two pages touch)

Base = `MONADE_API_BASE`. `:user_uid` from `useMonadeUser()`. All via `fetchJson`.

### WhatsApp channels
```
GET   /api/users/:user_uid/vobiz-whatsapp/channels
POST  /api/users/:user_uid/vobiz-whatsapp/channels                       (Connect BYO WABA)
POST  /api/users/:user_uid/vobiz-whatsapp/channels/import                (Import existing)
POST  /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/sync   (Refresh status; body {})
```

### WhatsApp templates (Vobiz is source of truth — never cache status as permanent)
```
GET   /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates
GET   .../templates?status=APPROVED | PENDING | REJECTED
POST  .../templates/sync                                                 (Sync from Meta; body {})
POST  .../templates                                                      (Create / Resubmit)
```

### WhatsApp flows
```
GET   /api/users/:user_uid/vobiz-whatsapp/flows                          (BULK — for "Used by")
        optional filters: ?whatsapp_channel_connection_id= &assistant_id= &post_processing_template_id= &enabled=true|false
GET   /api/assistants/:assistant_id/whatsapp-flow?user_uid=:user_uid&post_processing_template_id=:template_id
PUT   /api/assistants/:assistant_id/whatsapp-flow                        (Save flow)
```

### Supporting endpoints (already have hooks — reuse them, don't re-fetch raw)
```
Assistants               -> useAssistants()  (gives call_direction)
Post-processing templates-> usePostProcessingTemplates()  (gives outcome buckets via fetchTemplate)
```

### Key payloads/shapes
**Connect BYO WABA** body: `{ label?, waba_id, phone_number_id, phone_number, display_name?, access_token }`
→ response `{ channel: {...}, provider_response: {} }`. Use the local `channel.id` for later routes.

**Import** body: `{ channel_id, label? }`. **A `409` means the channel belongs to another user.**

**Create/Resubmit template** body:
```json
{ "name": "qualified_followup", "language": "en_US", "category": "UTILITY",
  "components": [ { "type": "BODY", "text": "Hi {{1}}, ...",
    "example": { "body_text": [["Customer"]] } } ] }
```
Template list items vary — handle both `items` and `data` arrays (the hook already does).

**Save flow** body:
```json
{ "user_uid": "...", "post_processing_template_id": "...",
  "whatsapp_channel_connection_id": "...", "enabled": true,
  "mappings": { "certain": { "template_name": "qualified_followup", "language": "en_US", "parameters": [] } } }
```
Backend validation: mapping keys MUST be a subset of the post-processing template's
`outcome_keys`; each enabled mapping needs `template_name` + `language`.

> **Assumptions baked into the hooks that backend should confirm** (flag if anything 500s):
> channel list may come back as a bare array or `{channels}`/`{data}` — normalized defensively;
> template list may be `{items}` or `{data}`; flows list may be array or `{flows}`. All handled
> in the normalizers. If a real response differs, fix the `normalize*` function in the hook.

---

## 6. TASK 1 — WhatsApp Setup page shell

**Create `src/app/(app)/whatsapp/page.tsx`.** This is just a shell — the two tab bodies
(`channels-tab.tsx`, `templates-tab.tsx`) are already built. Call `useVobizWhatsapp()`
**exactly once here** and pass it down (calling the hook in both tabs would double-fetch).

```tsx
'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useVobizWhatsapp } from '@/app/hooks/use-vobiz-whatsapp';

import { ChannelsTab } from './components/channels-tab';
import { TemplatesTab } from './components/templates-tab';

export default function WhatsAppSetupPage() {
  const whatsapp = useVobizWhatsapp();          // single shared instance
  const [tab, setTab] = useState('channels');

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground flex items-center gap-3">
              <MessageCircle className="text-primary" size={40} />
              WhatsApp
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Connect WhatsApp Business numbers and manage message templates.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="channels">Connected Numbers</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="channels">
            <ChannelsTab whatsapp={whatsapp} />
          </TabsContent>
          <TabsContent value="templates">
            <TemplatesTab whatsapp={whatsapp} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
```

That's the whole task. Both tab components accept a single prop `whatsapp` typed as
`ReturnType<typeof useVobizWhatsapp>`.

---

## 7. TASK 2 — WhatsApp Flows page (the hard one)

**Create `src/app/(app)/whatsapp-flows/page.tsx`.**

### 7.1 Concept
A flow = one row: `assistant + post_processing_template → channel + enabled + mappings`.
`mappings` is JSON keyed by **post-processing outcome key**:
```json
{ "certain": { "template_name": "qualified_followup", "language": "en_US", "parameters": [] } }
```
The user picks an assistant + a post-processing template, picks a WhatsApp channel,
toggles enabled, and for **each outcome of that template** picks which WhatsApp template
to send. There is **no call direction on the flow** — the direction filter only filters
the *assistant dropdown*.

### 7.2 Hooks to use
```ts
const { assistants } = useAssistants();                          // @/app/hooks/use-assistants-context
const { templates, fetchTemplate } = usePostProcessingTemplates(); // @/app/hooks/use-post-processing-templates
const { channels, fetchTemplates } = useVobizWhatsapp();         // @/app/hooks/use-vobiz-whatsapp
const { fetchAssistantFlow, saveFlow, savingFlow } = useWhatsappFlows(); // @/app/hooks/use-whatsapp-flows
```

### 7.3 State
```ts
const [direction, setDirection]   = useState<'all'|'outbound'|'inbound'>('all');
const [assistantId, setAssistantId] = useState('');
const [templateId, setTemplateId]   = useState('');   // post-processing template id
const [connectionId, setConnectionId] = useState(''); // whatsapp channel id (local channel.id)
const [enabled, setEnabled]         = useState(false);
const [mappings, setMappings]       = useState<Record<string, { template_name: string; language: string }>>({});
const [buckets, setBuckets]         = useState<QualificationBucket[]>([]); // outcome defs (key+label)
const [waTemplates, setWaTemplates] = useState<WhatsappTemplate[]>([]);    // channel's WA templates
const [loadingFlow, setLoadingFlow] = useState(false);
```
`QualificationBucket` is exported from `use-post-processing-templates.ts`
(`{ key, label, description, confidence_range? }`).

### 7.4 Derived values
```ts
// Assistants: drop local drafts (id starts with "local-"); they cannot have flows.
const publishedAssistants = assistants.filter(a => !a.id.startsWith('local-'));
// Direction filter is purely a dropdown filter (see frontend-whatsapp-flows.md §"Core Concept").
const visibleAssistants = publishedAssistants.filter(a =>
  direction === 'all' ||
  (direction === 'outbound' && (a.call_direction === 'outbound' || a.call_direction === 'both')) ||
  (direction === 'inbound'  && (a.call_direction === 'inbound'  || a.call_direction === 'both')));
```

### 7.5 Effects (order matters)
1. **templateId → load outcome buckets.** When `templateId` set:
   `fetchTemplate(templateId)` → `setBuckets(result?.content?.qualification_buckets ?? [])`.
   (The summary list from `usePostProcessingTemplates().templates` does NOT reliably carry
   outcome keys — you must `fetchTemplate` to get `content.qualification_buckets`, which
   gives both the `key` AND the human `label` for the table.)
2. **assistantId + templateId → load existing flow.** When both set, `setLoadingFlow(true)`,
   `fetchAssistantFlow(assistantId, templateId)`:
   - if a flow returns → `setConnectionId(flow.whatsapp_channel_connection_id)`,
     `setEnabled(flow.enabled)`, `setMappings(flow.mappings)`.
   - if `null` → reset: `setConnectionId('')`, `setEnabled(false)`, `setMappings({})`.
3. **connectionId → load that channel's WhatsApp templates.** When `connectionId` set,
   `fetchTemplates(connectionId)` (no status arg = all statuses) → `setWaTemplates(...)`.
   Load **all** statuses: APPROVED ones populate the dropdown, the full list is needed to
   show the live status of an already-saved mapping.

Effect 2 setting `connectionId` naturally triggers effect 3 — that's intended.

### 7.6 Layout
`<DashboardHeader />` + standard `<main>`; title `WhatsApp Flows` with `<Workflow>` icon;
subtitle "Send a WhatsApp follow-up automatically after a call is qualified."

**Controls row** (a `PaperCard` with selects):
- Direction filter — segmented `All | Outbound | Inbound` (copy the segmented-control markup
  from `templates-tab.tsx`'s status filter, or `knowledge-base/page.tsx`'s date filter).
- Assistant `Select` — options `visibleAssistants` (`a.id` / `a.name`).
- Post-processing template `Select` — options `templates` (`t.id` / `t.name`).
- WhatsApp channel `Select` — options `channels` (`c.id` / `c.label||display_name||phone_number`).
- Enabled toggle (see skeleton below).

**Outcome mapping table** — only render once `assistantId && templateId` are chosen.
Columns per `frontend-whatsapp-flows.md`:
```
Outcome key | Outcome label | WhatsApp template | Language | Template status | Actions
```
- One row per `bucket` in `buckets`. **Do not allow arbitrary keys** — only render
  `buckets`. (Backend rejects unknown keys anyway.)
- *WhatsApp template* cell: a `Select`. Options = `waTemplates` filtered to
  `status === 'APPROVED'`, plus a "— None —" option to clear. Option value encodes both
  name + language, e.g. `` `${name}__${language}` ``. If the saved mapping references a
  template not in the APPROVED list, still show it as the current value (append it as an
  extra option so the Select can display it).
- *Language* cell: read-only text = `mappings[key]?.language` (derived from the chosen WA template).
- *Template status* cell: find `waTemplates.find(t => t.name===m.template_name && t.language===m.language)`
  → `<TemplateStatusBadge status={found?.status} />` (no match → renders "Missing", grey).
  Import it: `import { TemplateStatusBadge } from '../whatsapp/components/status-badges';`
  (cross-route imports are an accepted pattern here — `dashboard-header.tsx` already does it.)
- *Actions* cell: a "Clear" ghost button → removes `mappings[key]`.

On WhatsApp-template select change: parse the value → `setMappings(m => ({ ...m, [key]: { template_name, language } }))`.
On "None"/clear → delete the key from `mappings`.

**Save button** (sticky footer or end of card): disabled unless `assistantId && templateId && connectionId`.
Calls:
```ts
await saveFlow(assistantId, {
  post_processing_template_id: templateId,
  whatsapp_channel_connection_id: connectionId,
  enabled,
  mappings: Object.fromEntries(
    Object.entries(mappings).map(([k, v]) => [k, { ...v, parameters: [] }])),
});
```
(`parameters` is always `[]` for v1 — no parameter editor. See §9 for the future version.)

**Guard / empty states:**
- no assistant or no template selected → centered prompt "Pick an assistant and a
  post-processing template to begin."
- template chosen but `buckets.length === 0` → "This template has no outcomes yet."
- mapping dropdowns disabled (and a hint) until `connectionId` is set.
- `loadingFlow` → spinner.

### 7.7 Enabled toggle skeleton (no `Switch` primitive exists)
```tsx
<button
  type="button"
  role="switch"
  aria-checked={enabled}
  onClick={() => setEnabled(v => !v)}
  className={cn('relative h-6 w-11 rounded-full transition-colors',
    enabled ? 'bg-primary' : 'bg-muted')}
>
  <span className={cn(
    'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
    enabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
</button>
```

### 7.8 Page skeleton to start from
```tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Workflow, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { usePostProcessingTemplates, type QualificationBucket } from '@/app/hooks/use-post-processing-templates';
import { useVobizWhatsapp, type WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';
import { useWhatsappFlows } from '@/app/hooks/use-whatsapp-flows';
import { TemplateStatusBadge } from '../whatsapp/components/status-badges';

export default function WhatsAppFlowsPage() {
  // ...state from §7.3, effects from §7.5, derived from §7.4...
  // ...render controls + outcome mapping table + save button...
}
```

Build it incrementally: selects first, then load+display buckets, then the mapping
dropdowns, then save. Test each step in the browser.

---

## 8. TASK 3 — Sidebar entry

**Edit `src/components/sidebar.tsx`.**

1. Add `MessageCircle` and `Workflow` to the `lucide-react` import block (top of file).
2. Add a new category. The sidebar is a flat list of `<CategoryLabel>` + `<NavItem>`s.
   Insert a **"Messaging"** block — recommended placement: right **after the "Intelligence"
   block** (which ends with the `/template-library` NavItem) and before "Archive":

```tsx
<CategoryLabel>Messaging</CategoryLabel>
<NavItem
  href="/whatsapp"
  icon={<MessageCircle />}
  label="WhatsApp"
  isActive={pathname === '/whatsapp'}
/>
<NavItem
  href="/whatsapp-flows"
  icon={<Workflow />}
  label="WhatsApp Flows"
  isActive={pathname === '/whatsapp-flows'}
/>
```

`NavItem` clones the icon and forces `size={18}` — just pass `<MessageCircle />` bare,
no size prop. No routing config needed beyond this: App Router picks up
`src/app/(app)/whatsapp/page.tsx` and `src/app/(app)/whatsapp-flows/page.tsx` automatically.

---

## 9. Known gaps / future work (NOT required for this handoff)

- **`whatsapp_followup` on call detail.** `frontend-whatsapp-flows.md` §"Call Record
  WhatsApp Delivery State" describes a `whatsapp_followup` JSON field now present on call
  analytics rows (statuses: `pending/sent/delivered/read/replied/failed/...`). Rendering it
  belongs on the **call-history / analytics detail page**, not on either of our two pages.
  Leave for a follow-up ticket.
- **Template parameters editor.** Flows `mappings` entries carry `parameters: []`. v1 always
  saves an empty array. A future version may let users bind dynamic parameters.
- **Internal readiness check** `GET /api/internal/vobiz-whatsapp/send-readiness/:call_id`
  is admin/debug only — not a user-facing route, skip it.
- **No polling.** Template approval takes 1–2 days; the Templates tab has manual
  Refresh / Sync buttons by design. Do not add auto-polling.

---

## 10. How to verify your work

```bash
cd monade-voice-dashboard
npx tsc -p tsconfig.json --noEmit   # type-check — must be clean
npm run lint                        # eslint
npm run dev                         # http://localhost:3000
```

Manual smoke test (needs a logged-in session):
1. Sidebar shows a "Messaging" group with **WhatsApp** + **WhatsApp Flows**.
2. `/whatsapp` → both tabs render; "Connected Numbers" lists channels (or empty state);
   open "Connect BYO WABA" + "Import" dialogs; "Templates" tab: pick a channel, table
   loads, status filter works, "Create template" dialog opens.
3. `/whatsapp-flows` → pick assistant + post-processing template → outcome rows appear;
   pick a channel → WhatsApp-template dropdowns enable; map an outcome; **Save**; reload
   the page with the same assistant+template → the saved mapping is restored.
4. Toggle light/dark — status badges and cards stay legible.

### Hook API quick reference (so you don't need to open the hook files)

`useVobizWhatsapp()` →
`{ channels, loadingChannels, saving, fetchChannels(), connectChannel(payload),
   importChannel(payload), syncChannel(connId), fetchTemplates(connId, status?),
   syncTemplates(connId), createTemplate(connId, payload) }`
— auto-fetches `channels` on mount.

`useWhatsappFlows()` →
`{ savingFlow, fetchFlows(filters?), fetchAssistantFlow(assistantId, ppTemplateId),
   saveFlow(assistantId, payload) }`
— does **not** auto-fetch; call explicitly.

All payload/return types are exported from the two hook files
(`ConnectChannelPayload`, `ImportChannelPayload`, `CreateTemplatePayload`,
`WhatsappChannel`, `WhatsappTemplate`, `WhatsappFlow`, `SaveWhatsappFlowPayload`, etc.).

---

## 11. File map (quick orientation)

```
src/
  config.ts                                  # MONADE_API_BASE
  lib/http.ts                                # fetchJson + ApiError
  components/sidebar.tsx                     # << EDIT (task 3)
  components/dashboard-header.tsx            # used by every page
  components/ui/*                            # primitives (no Switch!)
  app/(app)/app-shell.tsx                    # providers (no change)
  app/hooks/
    use-monade-user.tsx                      # userUid
    use-assistants-context.tsx               # useAssistants() -> call_direction
    use-post-processing-templates.ts         # usePostProcessingTemplates() -> fetchTemplate
    use-vobiz-whatsapp.ts                    # ✅ DONE
    use-whatsapp-flows.ts                    # ✅ DONE
  app/(app)/whatsapp/
    page.tsx                                 # << CREATE (task 1)
    components/
      status-badges.tsx                      # ✅ DONE
      connect-channel-dialog.tsx             # ✅ DONE
      import-channel-dialog.tsx              # ✅ DONE
      template-form-dialog.tsx               # ✅ DONE
      channels-tab.tsx                       # ✅ DONE
      templates-tab.tsx                      # ✅ DONE
  app/(app)/whatsapp-flows/
    page.tsx                                 # << CREATE (task 2)
```

**Reference pages to imitate:** `src/app/(app)/template-library/page.tsx`,
`src/app/(app)/knowledge-base/page.tsx`.

---

*End of handoff. Once tasks 1–4 are done, the original author will verify the full feature.*
