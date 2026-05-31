# Frontend Handoff: WhatsApp Outcome-Based Bot Prompts

## Purpose

This document explains the new WhatsApp bot configuration model for the frontend team.

The goal is to let users configure a different WhatsApp bot prompt for each post-processing outcome bucket, while also controlling whether that outcome can trigger CRM/webhook delivery.

## What Exists Today

### Post-Call WhatsApp Template Flow

Voice call post-processing produces an outcome bucket such as:

```text
interested
not_interested
uncertain
certain
did_not_pick_up
```

The existing WhatsApp template flow maps those bucket keys to approved WhatsApp templates:

```json
{
  "interested": {
    "template_name": "interested_followup",
    "language": "en"
  },
  "not_interested": {
    "template_name": "not_interested_followup",
    "language": "en"
  }
}
```

When a template is sent, the backend stores the bucket key in WhatsApp thread memory:

```json
{
  "raw": {
    "bucket_key": "interested",
    "bucket_key_source": "analytics.verdict"
  }
}
```

### WhatsApp Bot Prompt Flow

Previously, the inbound WhatsApp bot had one general prompt per channel:

```json
{
  "whatsapp_bot_prompt_id": "default-prompt-id"
}
```

All inbound WhatsApp replies used that same prompt.

## What Is New

The WhatsApp bot can now select its prompt by the lead's original post-processing outcome bucket.

Example:

```text
Lead outcome = interested
  -> user receives interested WhatsApp template
  -> user replies on WhatsApp
  -> bot uses interested prompt

Lead outcome = not_interested
  -> user receives not_interested WhatsApp template
  -> user replies on WhatsApp
  -> bot uses not_interested prompt
```

Each outcome mapping also controls whether the bot is allowed to trigger CRM delivery.

## Runtime Selection Logic

Backend prompt selection works like this:

```text
1. Bot receives inbound WhatsApp message.
2. Bot loads recent Redis thread memory.
3. If memory contains a template message with raw.bucket_key, use that bucket.
4. If Redis memory expired, config-server looks up latest call analytics for the phone number.
5. Config-server resolves the bucket using the same logic as WhatsApp template sending.
6. If qualification_config.outcome_prompt_mappings[bucket] exists and is enabled, use that prompt.
7. Otherwise, if outcome_prompt_mappings.default exists, use default.
8. Otherwise, fall back to whatsapp_bot_prompt_id.
```

This gives resilience when Redis thread memory expires.

## No New Frontend Endpoint

Use the existing bot config save endpoint:

```http
PUT /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/bot-config
```

Use the existing prompt CRUD endpoints:

```http
GET    /api/users/:user_uid/vobiz-whatsapp/bot-prompts
POST   /api/users/:user_uid/vobiz-whatsapp/bot-prompts
GET    /api/users/:user_uid/vobiz-whatsapp/bot-prompts/:prompt_id?include_content=true
PUT    /api/users/:user_uid/vobiz-whatsapp/bot-prompts/:prompt_id
DELETE /api/users/:user_uid/vobiz-whatsapp/bot-prompts/:prompt_id
```

The API collection was updated only for the existing bot config endpoint example. No new route was added.

## Bot Config Shape

Frontend should save outcome prompt mappings inside `qualification_config`.

```json
{
  "enabled": true,
  "whatsapp_bot_prompt_id": "fallback-prompt-id",
  "model": "gemini-2.0-flash",
  "generation_config": {
    "temperature": 0.4,
    "top_p": 0.9,
    "max_output_tokens": 512
  },
  "qualification_config": {
    "enabled": true,
    "event_type": "whatsapp.lead_qualified",
    "min_confidence": 0.8,
    "criteria_addendum": "",
    "outcome_prompt_mappings": {
      "interested": {
        "enabled": true,
        "whatsapp_bot_prompt_id": "interested-prompt-id",
        "tool_call_enabled": true
      },
      "not_interested": {
        "enabled": true,
        "whatsapp_bot_prompt_id": "not-interested-prompt-id",
        "tool_call_enabled": true
      },
      "uncertain": {
        "enabled": true,
        "whatsapp_bot_prompt_id": "uncertain-prompt-id",
        "tool_call_enabled": true
      }
    }
  }
}
```

`whatsapp_bot_prompt_id` is still required as a fallback/legacy prompt.

## Field Rules

```text
qualification_config.enabled: boolean
qualification_config.event_type: must be whatsapp.lead_qualified
qualification_config.min_confidence: 0 to 1, default 0.8
qualification_config.criteria_addendum: optional string, max 4000 chars
qualification_config.outcome_prompt_mappings: object keyed by outcome
qualification_config.outcome_prompt_mappings[key].enabled: boolean
qualification_config.outcome_prompt_mappings[key].whatsapp_bot_prompt_id: prompt ID owned by same user
qualification_config.outcome_prompt_mappings[key].tool_call_enabled: boolean
```

If `qualification_config` is omitted while saving an existing bot config, backend preserves existing qualification settings.

## Frontend UX Recommendation

On the WhatsApp bot settings page, add a section like:

```text
Outcome-Based Bot Prompts

Outcome key        Prompt                 CRM tool
interested         Interested prompt       Enabled
not_interested     Not interested prompt   Enabled
uncertain          Uncertain prompt        Enabled
certain            Certain prompt          Enabled
```

Recommended controls:

```text
- outcome key input or dropdown
- prompt picker from existing bot prompts
- mapping enabled toggle
- CRM tool enabled toggle
- add/remove outcome mapping
```

Use the same outcome keys shown in the WhatsApp template mapping UI when possible.

## Tool Calling Behavior

The internal action name remains:

```text
trigger_bot_flow
```

If `tool_call_enabled` is false for the selected outcome:

```text
bot replies normally
no verifier call
no CRM webhook
```

If `tool_call_enabled` is true:

```text
bot can propose trigger_bot_flow
backend verifier checks the selected outcome prompt
approved event publishes whatsapp.lead_qualified
webhook-service delivers to subscribed CRM endpoint
```

For product flexibility, enable tool calling for all outcomes if users may change their mind during WhatsApp conversation. For example, a `not_interested` lead can later become interested; the `not_interested` prompt can be written to trigger CRM only when conversion is clear.

## Prompt Writing Guidance

Each outcome prompt should be a full prompt for that bucket. It should tell the bot:

```text
- how to talk to leads from this outcome
- what facts to collect
- what counts as a meaningful CRM update
- when to trigger backend action
- what fields to extract
```

When tool calling is enabled, include instructions like:

```text
When the lead clearly gives a CRM-worthy update, asks for a callback, changes their mind, confirms interest, shares preferences, or requests human follow-up, propose a backend action named trigger_bot_flow.

Return JSON:
{
  "reply_text": "customer-facing WhatsApp reply",
  "actions": [
    {
      "type": "trigger_bot_flow",
      "outcome": "interested",
      "reason": "short reason grounded in the conversation",
      "fields": {
        "preferred_callback_time": "Monday 2 PM"
      }
    }
  ]
}

If no CRM update is needed, return the same JSON shape with an empty actions array.
Never mention tools, JSON, CRM automation, webhooks, or verification to the customer.
```

## CRM Webhook

Users register CRM endpoints on the existing webhook page by subscribing to:

```json
["whatsapp.lead_qualified"]
```

CRM payload is compact:

```json
{
  "event_type": "whatsapp.lead_qualified",
  "timestamp": "2026-05-31T12:00:00.000Z",
  "data": {
    "user_uid": "user-id",
    "bot_config_id": "bot-config-id",
    "whatsapp_channel_connection_id": "connection-id",
    "channel_id": "vobiz-channel-id",
    "waba_id": "waba-id",
    "phone_number": "+919999999999",
    "thread_id": "user:waba:+919999999999",
    "conversation_id": "provider-conversation-id",
    "qualified_at": "2026-05-31T12:00:00.000Z",
    "summary": "Full CRM-ready summary of the WhatsApp conversation so far.",
    "qualification_reason": "Why this CRM update was approved now.",
    "confidence": 0.91,
    "extracted_fields": {
      "course": "Data Science",
      "preferred_time": "tomorrow morning"
    },
    "proposed_action": {
      "type": "trigger_bot_flow",
      "outcome": "interested",
      "reason": "User asked for counselling callback.",
      "fields": {}
    }
  }
}
```

The payload does not include full conversation history, call context, or verifier metadata.

## Notes For Frontend

- Do not call or expose the internal verifier endpoint.
- Do not add a new frontend route for this feature.
- No schema migration is needed for outcome prompt mappings.
- Prompt deletion may return `409` if a prompt is used by a bot config or outcome mapping.
- CRM delivery requires both `qualification_config.enabled = true` and a webhook endpoint subscribed to `whatsapp.lead_qualified`.
