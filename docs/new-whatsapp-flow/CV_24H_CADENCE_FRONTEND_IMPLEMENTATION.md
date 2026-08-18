# CV 24-hour cadence — frontend implementation note

## What changed

- The existing WhatsApp Flows screen now calls
  `GET /api/users/:user_uid/vobiz-whatsapp/flow-capabilities`.
- The two-mode control is shown only when the backend advertises
  `cv_24h_cadence` for the account. All other accounts remain on Standard mode.
- Flow reads now understand `flow_mode`, `cadence_config`, and
  `cadence_draft_errors`. A missing mode still normalizes to `standard`.
- Cadence mode has dedicated configuration for:
  - the ten N1/N2/N3, U1/U2a/U2b/U3, T1, M1, and M2 template slots;
  - the full backend-provided schedule;
  - the optional no-name template variant;
  - the expected Meta category, body, buttons, and footer returned by the
    capability endpoint.
- Only approved WhatsApp templates can be newly selected. Before activation,
  the UI checks all ten assignments, English language, expected Meta category,
  schedule windows, numeric ranges, and the fixed `Asia/Kolkata` timezone.
- Backend `details` and `cadence_draft_errors` are displayed in the cadence
  editor.

## Save and activation behavior

- **Save disabled draft** uses the existing assistant flow `PUT` route with
  `flow_mode: "cv_24h_cadence"` and always sends `enabled: false`.
- **Enable cadence** is a separate action and sends the same payload with
  `enabled: true` only after local checks pass. The backend remains the final
  validator, including bot and interactive-reply prerequisites.
- **Disable cadence** sends `enabled: false` immediately through the same route.
- Cadence configuration is saved on the existing assistant/template flow. No
  second flow is created.
- Existing Standard outcome `mappings` are retained byte-for-shape while a
  cadence draft is saved or enabled. Switching back to Standard continues to
  use those mappings.

## Files changed

- `src/app/hooks/use-whatsapp-flows.ts`
- `src/app/(app)/whatsapp-flows/page.tsx`
- `src/app/(app)/whatsapp-flows/components/cadence-editor.tsx`

## Verification performed

- Confirmed request/response shapes against the backend route implementation,
  including `available_modes`, `schedule_defaults`, `template_slots`, draft
  errors, and the existing `PUT` route.
- `git diff --check` passes.
- A repository TypeScript check reports existing errors in unrelated modules,
  but reports no errors in the three files changed for this implementation.
- The scoped ESLint command did not complete within 60 seconds in this mounted
  workspace and produced no diagnostics before timeout.

## Suggested team verification

1. Sign in as College Vidya and confirm both modes appear; sign in as another
   account and confirm only Standard behavior is available.
2. Save an incomplete cadence and confirm the stored flow is disabled and the
   returned draft errors appear.
3. Assign the ten approved templates and verify Utility for N/U/T1 and Marketing
   for M1/M2.
4. Enable the WhatsApp bot and interactive replies, then activate the cadence
   and confirm the existing flow row changes mode without creating another row.
5. Disable it, switch back to Standard, and confirm the original outcome
   mappings are still present.
