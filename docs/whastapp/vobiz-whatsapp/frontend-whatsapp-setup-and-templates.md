# Frontend Guide: WhatsApp Setup And Templates

## Page Purpose

Build one WhatsApp settings page where users can:

- connect a Bring Your Own WABA WhatsApp number through Vobiz
- see connected WhatsApp sender numbers
- sync templates already present in Meta/Vobiz
- submit new templates for approval
- refresh template status: `PENDING`, `APPROVED`, `REJECTED`
- inspect rejection reasons when Vobiz returns them
- resubmit/recreate a template after rejection
- see whether a template is currently used by any assistant WhatsApp flow

Do not ask users for Vobiz auth credentials. Backend uses `VOBIZ_AUTH_ID` and `VOBIZ_AUTH_TOKEN` from server secrets.

## Page Layout

Recommended tabs on one page:

- `Connected Numbers`
- `Templates`

### Connected Numbers Tab

Show a table:

```text
Label | Display name | WhatsApp number | WABA ID | Channel ID | Connection status | Verification | Actions
```

Actions:

- `Refresh`
- `Import existing Vobiz channel`
- `Connect BYO WABA`

### Templates Tab

User picks a connected number/channel first. Then show:

```text
Template name | Language | Category | Status | Used by | Last synced/provider updated | Actions
```

Actions:

- `Sync from Meta`
- `Create template`
- `Refresh status`
- `Resubmit`

For `Used by`, derive usage by loading WhatsApp flows and checking each flow's `mappings` JSON for matching `template_name + language`.

## Connect BYO WABA Form

Frontend copy:

```text
Connect a WhatsApp Business number

Create or prepare your Meta WhatsApp Business Account first. Then paste the WABA ID,
phone number ID, sender phone number, and Meta system-user access token here.
Monade will connect it to Vobiz and store only the channel metadata needed to send messages.
```

Fields:

- `label` optional internal label
- `waba_id` required
- `phone_number_id` required
- `phone_number` required, E.164 preferred
- `display_name` optional
- `access_token` required, sensitive input

API:

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels
```

Body:

```json
{
  "label": "College Vidya WhatsApp",
  "waba_id": "1345061194213831",
  "phone_number_id": "1084153438123146",
  "phone_number": "+918065480578",
  "display_name": "Monade",
  "access_token": "EAAG..."
}
```

Response shape:

```json
{
  "channel": {
    "id": "local-db-id",
    "user_uid": "user-id",
    "label": "College Vidya WhatsApp",
    "channel_id": "ad89af91-a153-4e33-a3a7-84eca638dc44",
    "waba_id": "1345061194213831",
    "phone_number_id": "1084153438123146",
    "phone_number": "+91 80 6548 0578",
    "display_name": "Monade",
    "connection_status": "active",
    "verification_status": "verified"
  },
  "provider_response": {}
}
```

Use the local `channel.id` for later frontend routes. The Vobiz `channel_id` is displayed for debugging but should not be hand-edited by users.

## Import Existing Channel

Use this when a channel is already visible in the Vobiz account.

API:

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/import
```

Body:

```json
{
  "channel_id": "ad89af91-a153-4e33-a3a7-84eca638dc44",
  "label": "Existing Monade WhatsApp"
}
```

If the channel is already attached to another user, backend returns `409`.

## List Stored Channels

API:

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels
```

Use this to populate channel pickers on both WhatsApp pages.

## Refresh Channel Status

API:

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/sync
```

Use when a user clicks refresh or when opening the page after a long gap.

## Template List And Status

API:

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates?status=APPROVED
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates?status=PENDING
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates?status=REJECTED
```

Vobiz is the source of truth. Do not cache template status in frontend as permanent state.

Expected provider item shape can vary slightly, but generally:

```json
{
  "items": [
    {
      "id": "tpl_abc123",
      "name": "qualified_followup",
      "language": "en_US",
      "category": "UTILITY",
      "status": "APPROVED",
      "components": [
        { "type": "BODY", "text": "Hi {{1}}, thanks for speaking with us." }
      ],
      "rejection_reason": null
    }
  ]
}
```

Frontend must handle both `items` and `data` arrays defensively.

## Sync Templates From Meta

API:

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates/sync
```

Use this after a user creates/edits templates outside Monade or after approval status changes in Meta.

## Create Template

API:

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates
```

Body:

```json
{
  "name": "qualified_followup",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{1}}, thanks for speaking with us. Our team will follow up shortly.",
      "example": {
        "body_text": [["Customer"]]
      }
    }
  ]
}
```

After create, route user back to the template table and show it as pending when returned by Vobiz. Do not run aggressive polling; approval can take 1-2 days. Provide a manual Refresh/Sync button and refresh on page open.

## Resubmit Rejected Template

For Sprint 1, treat resubmission as creating a corrected template payload through the same create-template endpoint.

Recommended frontend behavior:

- Show rejected template details and reason.
- Pre-fill name/language/category/components from the rejected template.
- Let user edit body/examples.
- Submit through the same `POST /templates` endpoint.
- If Vobiz rejects duplicate names, ask user to create a new versioned name such as `qualified_followup_v2`.

Do not assume provider template IDs survive resubmission. WhatsApp flows should map by `template_name + language`.

## Template Usage: "In Use"

Templates are not mirrored locally. To show usage:

1. Load channels.
2. Load templates for selected channel.
3. Load all WhatsApp flows for the user in one call:

```http
GET /api/users/:user_uid/vobiz-whatsapp/flows
```

Optionally narrow to the selected channel:

```http
GET /api/users/:user_uid/vobiz-whatsapp/flows?whatsapp_channel_connection_id=:connection_id
```

4. For each template, scan flow mappings:

```json
{
  "certain": { "template_name": "qualified_followup", "language": "en_US" }
}
```

If a mapping points to the template, display:

```text
Used by: Assistant Name / Outcome key
```

For inbound/outbound filtering, use assistant `call_direction`:

- inbound: assistant `call_direction` is `inbound` or `both`
- outbound: assistant `call_direction` is `outbound` or `both`

The WhatsApp flow itself does not store call direction. Users map the correct template on the assistant they choose.
