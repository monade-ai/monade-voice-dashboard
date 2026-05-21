# Lightweight Vobiz WhatsApp Plan

## Goal

Add WhatsApp follow-up after voice-call post-processing without turning this into a second messaging platform.

Vobiz should remain the source of truth for:

- WhatsApp channels
- Meta template status
- template approval/rejection state
- existing templates synced from Meta
- message IDs and provider delivery status

Our DB should store only the minimum needed to connect the right user/assistant/outcome to the right Vobiz channel/template.

## Confirmed From POC

The WABA ID is not the send channel ID.

Example from the test account:

- `waba_id`: `1345061194213831`
- `channel_id`: `ad89af91-a153-4e33-a3a7-84eca638dc44`
- sender number: `+91 80 6548 0578`

Sending requires the Vobiz `channel_id` UUID. The WABA ID is useful metadata and may be required in some template payloads, but it is not the primary route key.

Also confirmed: the working API base for this environment is:

```text
https://api.vobiz.ai/api/v1/messaging
```

## Product Flow

Frontend BYO WABA connection:

1. User opens WhatsApp integration settings.
2. UI explains: create/prepare a Meta WhatsApp Business Account and provide BYO credentials.
3. User submits:
   - Vobiz auth ID/token, or we use platform-owned Vobiz credentials if this remains centrally managed
   - WABA ID
   - Meta phone number ID
   - WhatsApp sender phone number
   - Meta system-user access token
   - display name
4. Backend calls Vobiz:

```http
POST /channels/whatsapp
```

5. Backend stores only the returned connected channel metadata needed by our app.

Template management:

1. List templates by calling Vobiz live:

```http
GET /channels/{channel_id}/templates
GET /channels/{channel_id}/templates?status=APPROVED
```

2. Create/resubmit templates by calling Vobiz:

```http
POST /channels/{channel_id}/templates
```

3. Pull already-existing Meta templates by calling:

```http
POST /channels/{channel_id}/templates/sync
```

4. Frontend refreshes Vobiz status on page open and on user-triggered Refresh/Sync actions. Do not aggressively poll; approval can take 1-2 days.

Outcome follow-up:

1. Assistant has a toggle: send WhatsApp after post-processing.
2. Assistant chooses one connected WhatsApp channel.
3. For the assistant's active post-processing template, frontend shows current `qualification_buckets`.
4. User maps bucket keys to Vobiz template identity:
   - template `name`
   - `language`
   - optional parameter mapping
5. After post-processing, backend checks the assistant toggle, outcome bucket, and mapping.
6. Before sending, backend asks Vobiz for current template status. Send only when `APPROVED`.

## Minimal DB Proposal

### 1. Connected Channel

Store one row per connected Vobiz WhatsApp channel.

Suggested model:

```text
WhatsappChannelConnection
  id
  user_uid
  label
  vobiz_auth_id
  encrypted_vobiz_auth_token
  channel_id
  waba_id
  phone_number_id
  phone_number
  display_name
  status
  raw_provider_snapshot Json?
  created_at
  updated_at
```

Why keep this:

- We need tenant-level ownership.
- We need the Vobiz `channel_id` for every send/list/template call.
- We need credentials or a way to select credentials.
- We need a sender number/display name for UI.

What we do not store:

- Full template catalog.
- Template approval history.
- Delivery event history in Sprint 1.

### 2. Assistant WhatsApp Settings

Either add two fields directly to `Assistant`, or keep a small one-to-one settings table.

Preferred lightweight table:

```text
AssistantWhatsappSetting
  assistant_id
  user_uid
  enabled Boolean
  whatsapp_channel_connection_id
  created_at
  updated_at
```

Why table instead of adding columns:

- Keeps the assistant model from becoming a dumping ground.
- Easy to delete/replace if the feature changes.
- Cleaner for frontend settings endpoints.

If we want the absolute smallest migration, use direct assistant fields:

```text
Assistant.sendWhatsappAfterPostProcessing Boolean
Assistant.whatsapp_channel_connection_id String?
```

### 3. Outcome Mapping

Store only the mapping from dynamic post-processing bucket to Vobiz template identity.

```text
WhatsappOutcomeTemplateMapping
  id
  user_uid
  assistant_id
  post_processing_template_id
  bucket_key
  template_name
  template_language
  enabled
  parameter_mapping Json?
  created_at
  updated_at
```

Why store template name/language instead of local template ID:

- Vobiz/Meta template IDs may change during resubmission/reapproval.
- Template `name + language` is what the send API needs.
- Status can be fetched live from Vobiz.

### 4. Optional Minimal Send Log

This can be skipped for the first demo, but I recommend a small log because it will save debugging time.

```text
WhatsappSendAttempt
  id
  user_uid
  assistant_id
  call_id
  phone_number
  bucket_key
  channel_id
  template_name
  template_language
  status
  vobiz_message_id?
  meta_message_id?
  error?
  created_at
```

Keep it narrow. No full provider mirror.

## Backend Routes

Create folder:

```text
monade-voice-config-server/routes/vobiz-whatsapp
```

Proposed endpoints:

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels
```

Connect BYO WABA to Vobiz and store the minimal channel connection.

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels
```

List stored channel connections from our DB.

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/sync
```

Refresh channel status from Vobiz and update the stored snapshot.

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates
```

Proxy live Vobiz template list. Supports `?status=APPROVED|PENDING|REJECTED`.

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates
```

Create or resubmit a template in Vobiz.

```http
POST /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates/sync
```

Trigger Vobiz sync from Meta.

```http
GET /api/assistants/:assistant_id/whatsapp-settings
PUT /api/assistants/:assistant_id/whatsapp-settings
```

Toggle assistant WhatsApp behavior and selected channel.

```http
GET /api/assistants/:assistant_id/whatsapp-outcome-mappings
PUT /api/assistants/:assistant_id/whatsapp-outcome-mappings
```

Store bucket-to-template mappings.

## Post-Processing Send Flow

This is the only part that touches the post-processing lifecycle.

1. Post-processing writes analytics as it does today.
2. A backend helper resolves:
   - call analytics row
   - assistant ID from `billing_data.assistant_id`
   - assistant WhatsApp settings
   - post-processing template ID used for that call
   - `analytics.verdict`
3. If disabled, stop.
4. Find mapping for:

```text
assistant_id + post_processing_template_id + bucket_key
```

5. Fetch live template list/status from Vobiz.
6. If template is not `APPROVED`, skip and optionally log.
7. Send template message via:

```http
POST /messages
```

## Frontend Readiness

Screens needed:

- WhatsApp channel connection form
- Connected channels list
- Template list/status page with sync button
- Template create/resubmit form
- Assistant settings toggle
- Outcome mapping panel based on active post-processing template buckets

Frontend should not need to know Vobiz auth details after connection. It should work with our `connection_id`.

## Sprint 1 Recommendation

Keep Sprint 1 to:

- BYO WABA connect channel
- list connected channels
- live template list/status
- create/resubmit template
- sync templates from Meta
- assistant toggle and selected channel
- outcome bucket mapping stored locally

Do not implement automatic post-processing sends until the frontend mapping workflow is reviewed, unless we want one internal-only test endpoint.

## What To Avoid For Now

- No embedded signup.
- No Meta OAuth.
- No local template mirror table.
- No full delivery-status storage.
- No broad message inbox.
- No complex retry engine.
- No schema for every provider field.

## Open Questions

1. Are Vobiz auth credentials platform-level for all users, or does every user bring their own Vobiz auth credentials?
2. Do we want the assistant to choose a WhatsApp channel, or should the user account have one default channel?
3. Should a rejected template resubmission reuse the same template name, or should the frontend force a new name/version?
4. Do we need parameter mapping in Sprint 1, or are first templates static enough to avoid variables?
