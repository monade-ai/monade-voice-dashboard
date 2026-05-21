# Frontend Guide: WhatsApp Flows

## Page Purpose

Build a separate WhatsApp Flows page where users map post-processing outcomes to WhatsApp templates for each assistant.

This page answers:

- Should this assistant send WhatsApp after post-processing?
- Which connected WhatsApp channel should it send from?
- Which post-processing template's outcomes are being mapped?
- Which WhatsApp template should be sent for each outcome bucket?

## Core Concept

A WhatsApp flow is one row:

```text
assistant + post_processing_template -> channel + enabled + mappings
```

The mapping is JSON keyed by post-processing outcome key:

```json
{
  "certain": {
    "template_name": "qualified_followup",
    "language": "en_US",
    "parameters": []
  },
  "uncertain": {
    "template_name": "callback_followup",
    "language": "en_US",
    "parameters": []
  }
}
```

No call direction is stored on the flow. To filter inbound/outbound flows, filter assistants:

- outbound flows: assistants with `call_direction = "outbound"` or `"both"`
- inbound flows: assistants with `call_direction = "inbound"` or `"both"`

## Page Layout

Recommended controls:

```text
Direction filter: All | Outbound | Inbound
Assistant selector
Post-processing template selector
WhatsApp channel selector
Enabled toggle
Outcome mapping table
```

Outcome mapping table:

```text
Outcome key | Outcome label | WhatsApp template | Language | Template status | Actions
```

Use `PostProcessingTemplate.outcome_keys` as the saved key list. Use `include_content=true` on the post-processing template API if labels/descriptions are needed.

Important frontend rule:

```text
Do not allow users to create arbitrary outcome keys.
Only render keys from the selected post-processing template.
```

The backend also validates that every mapping key exists in `outcome_keys`.

## Load Data

### 1. Load Assistants

```http
GET /api/assistants/user/:user_uid
```

Frontend filters:

```js
const outbound = assistants.filter(a => a.call_direction === 'outbound' || a.call_direction === 'both')
const inbound = assistants.filter(a => a.call_direction === 'inbound' || a.call_direction === 'both')
```

### 2. Load Post-Processing Templates

```http
GET /api/users/:user_uid/post-processing-templates
```

Each template row includes `outcome_keys` after the backend change. If a legacy row has `outcome_keys = null`, fetch full content:

```http
GET /api/post-processing-templates/:template_id?include_content=true
```

Then derive:

```js
content.qualification_buckets.map(bucket => bucket.key)
```

### 3. Load Connected WhatsApp Channels

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels
```

### 4. Load Live Templates For Selected Channel

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates
GET /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/templates?status=APPROVED
```

For mapping dropdowns, default to `APPROVED`, but allow viewing pending/rejected for diagnostics.

### 5. Load Existing Flow

For cross-assistant views like the Templates tab `Used by` column, load flows in bulk:

```http
GET /api/users/:user_uid/vobiz-whatsapp/flows
GET /api/users/:user_uid/vobiz-whatsapp/flows?whatsapp_channel_connection_id=:connection_id
```

Optional filters:

```text
assistant_id
post_processing_template_id
whatsapp_channel_connection_id
enabled=true|false
```

Each returned flow includes `assistant`, `whatsapp_channel_connection`, and `post_processing_template`. Use this once per page load to derive template usage by matching `template_name + language` inside each flow's `mappings`.

For the assistant edit screen, load the focused flow:

```http
GET /api/assistants/:assistant_id/whatsapp-flow?user_uid=:user_uid&post_processing_template_id=:template_id
```

Response:

```json
{
  "flows": [
    {
      "id": "flow-id",
      "user_uid": "user-id",
      "assistant_id": "assistant-id",
      "post_processing_template_id": "template-id",
      "whatsapp_channel_connection_id": "connection-id",
      "enabled": true,
      "mappings": {
        "certain": {
          "template_name": "qualified_followup",
          "language": "en_US",
          "parameters": []
        }
      },
      "whatsapp_channel_connection": {
        "channel_id": "ad89af91-a153-4e33-a3a7-84eca638dc44",
        "phone_number": "+91 80 6548 0578",
        "display_name": "Monade"
      },
      "post_processing_template": {
        "outcome_keys": ["certain", "uncertain", "interested"]
      }
    }
  ]
}
```

## Save Flow

API:

```http
PUT /api/assistants/:assistant_id/whatsapp-flow
```

Body:

```json
{
  "user_uid": "user-id",
  "post_processing_template_id": "template-id",
  "whatsapp_channel_connection_id": "connection-id",
  "enabled": true,
  "mappings": {
    "certain": {
      "template_name": "qualified_followup",
      "language": "en_US",
      "parameters": []
    },
    "uncertain": {
      "template_name": "callback_followup",
      "language": "en_US",
      "parameters": []
    }
  }
}
```

Backend validation:

- assistant must belong to `user_uid`
- channel must belong to `user_uid`
- post-processing template must belong to user or be system default
- mapping keys must be present in `PostProcessingTemplate.outcome_keys`
- each enabled mapping needs `template_name` and `language`

## Template Status In Flow Table

For every mapped template:

1. List live templates for selected channel.
2. Match by:

```text
template.name === mapping.template_name
template.language === mapping.language
```

3. Render status:

```text
APPROVED -> green, can send
PENDING -> yellow, will not send yet
REJECTED -> red, needs resubmission
missing -> gray/error, mapping is stale
```

Backend will also check live approval status before sending in the eventual sender.

## Send-Once Rule For Campaign Leads

When automatic send is implemented, backend checks if the same campaign lead already received a WhatsApp follow-up.

Preferred identity:

```text
campaign_id + contact_id
```

Fallback identity:

```text
campaign_id + phone_number
```

This avoids sending multiple WhatsApp messages when the same lead is retried multiple times in one campaign. A different campaign may send again.

## Call Record WhatsApp Delivery State

Call analytics rows now have:

```text
whatsapp_followup Json?
```

Example:

```json
{
  "status": "pending",
  "channel_id": "ad89af91-a153-4e33-a3a7-84eca638dc44",
  "template_name": "qualified_followup",
  "template_language": "en_US",
  "vobiz_message_id": "a42d615a-f427-4838-8882-1668f08dac9a",
  "meta_message_id": "wamid.HBgMOTE5MTIyODMzNzcyFQIAERgSOTIyMTcyMTEzRDM4MjFCREYzAA==",
  "conversation_id": "ca242d93-33e5-4337-a4bd-b2fac4d41e57",
  "sent_at": "2026-05-21T17:03:59.819537Z",
  "last_event_at": "2026-05-21T17:04:12.100Z",
  "error": null,
  "events": [
    {
      "status": "sent",
      "received_at": "2026-05-21T17:04:00.000Z",
      "raw": {}
    },
    {
      "status": "delivered",
      "received_at": "2026-05-21T17:04:12.100Z",
      "raw": {}
    }
  ]
}
```

Expected statuses over time:

```text
not_sent
skipped_template_not_approved
skipped_already_sent_for_campaign_lead
pending
sent
delivered
read
replied
failed
```

Webhook handling comes later. The UI should render this field when present on call analytics detail rows.

## Internal Readiness Check

The backend includes a helper for future sender/debugging:

```http
GET /api/internal/vobiz-whatsapp/send-readiness/:call_id
```

This returns whether a call is ready for WhatsApp based on:

- assistant ID from `billing_data.assistant_id`
- `post_processing_template_id`
- `analytics.verdict`
- saved WhatsApp flow
- campaign lead dedupe

This route is not a primary frontend route, but it is useful for admin/debug tooling.
