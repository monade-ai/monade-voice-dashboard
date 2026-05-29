# Frontend Guide: WhatsApp Qualification Tool Call

## What Changed

WhatsApp bot configs can now optionally enable a bot-flow action. When enabled, the bot can propose a `trigger_bot_flow` action from the conversation. The backend then runs a second verifier LLM before publishing a CRM webhook event.

The frontend does not call the verifier directly. It only saves `qualification_config` on the existing bot config endpoint and lets users register webhooks for `whatsapp.lead_qualified`.

## Pages To Update

### WhatsApp Bot Prompt / Bot Config Page

Add a section near the bot prompt/model settings:

```text
Bot Flow Webhook
  Enable bot-flow tool
  Minimum confidence
  Dedupe window
  Include WhatsApp conversation
  Include latest voice-call context
  Qualification criteria addendum
  Copy llms.txt helper
```

This feature should be visibly optional. Existing bots should continue to save with qualification disabled.

### Webhook / CRM Integration Page

Add `whatsapp.lead_qualified` to the event type picker. Users should be able to create a webhook endpoint that subscribes to:

```json
["whatsapp.lead_qualified"]
```

or both:

```json
["call_analytics.completed", "whatsapp.lead_qualified"]
```

## Save Bot Config

Use the existing endpoint:

```http
PUT /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/bot-config
```

Body with qualification disabled:

```json
{
  "enabled": true,
  "whatsapp_bot_prompt_id": "prompt-id",
  "model": "gemini-2.0-flash",
  "generation_config": {
    "temperature": 0.4,
    "top_p": 0.9,
    "max_output_tokens": 512
  },
  "qualification_config": {
    "enabled": false
  }
}
```

Body with qualification enabled:

```json
{
  "enabled": true,
  "whatsapp_bot_prompt_id": "prompt-id",
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
    "dedupe_window_seconds": 2592000,
    "include_conversation": true,
    "include_call_context": true,
    "criteria_addendum": "Only qualify if the user clearly confirms interest and wants follow-up."
  }
}
```

## Field Rules

```text
qualification_config.enabled: boolean
qualification_config.event_type: must be whatsapp.lead_qualified
qualification_config.min_confidence: 0 to 1, default 0.8
qualification_config.dedupe_window_seconds: 300 to 31536000, default 30 days
qualification_config.include_conversation: boolean, default true
qualification_config.include_call_context: boolean, default true
qualification_config.criteria_addendum: optional string, max 4000 chars
```

If `qualification_config` is omitted while updating an existing bot config, the backend preserves the existing qualification settings.

## Suggested UX Defaults

```json
{
  "enabled": false,
  "event_type": "whatsapp.lead_qualified",
  "min_confidence": 0.8,
  "dedupe_window_seconds": 2592000,
  "include_conversation": true,
  "include_call_context": true,
  "criteria_addendum": ""
}
```

Use a confidence slider or number input from `0.5` to `1.0`, default `0.8`. Use a select for dedupe window: `1 day`, `7 days`, `30 days`, `90 days`.

## Copyable llms.txt Helper

Show this as a copyable text block. The user can paste it into their main WhatsApp bot prompt, or send it to their AI prompt writer and ask it to merge these instructions into the final WhatsApp bot prompt.

```text
# WhatsApp bot-flow tool guidance

You are writing a WhatsApp bot prompt for a bot that can trigger a backend CRM flow.

When the conversation clearly satisfies one of the configured business criteria or outcome tags, instruct the bot to propose a bot-flow action.

Use this action name exactly:

trigger_bot_flow

The bot should return the action in this JSON shape when the backend flow should run:

{
  "reply_text": "customer-facing message",
  "actions": [
    {
      "type": "trigger_bot_flow",
      "outcome": "interested|not_interested|certain|uncertain|callback_requested|custom_outcome",
      "reason": "short reason grounded in the conversation",
      "fields": {
        "field_name": "value supported by the conversation"
      }
    }
  ]
}

Only propose the action when the user has explicitly matched the configured criteria. Examples:
- The user confirms interest in the product, service, course, appointment, or offer.
- The user asks for a callback, demo, admission/counselling call, purchase step, or human follow-up.
- The user provides enough context for CRM follow-up, such as name, course/product interest, location, timing, budget, or requirement.
- The user clearly matches a prompt-defined outcome tag such as interested, not_interested, certain, uncertain, callback_requested, or any custom tag your prompt defines.

Do not propose the action when:
- The user is only greeting, asking a vague question, or browsing casually.
- The user declines, is angry, asks to stop, or is not the actual lead.
- The user gives ambiguous information that does not satisfy the business criteria.
- You would need to invent missing facts.

If triggered, include a concise outcome label, reason, and extracted fields that are supported by the conversation.
If the backend flow should not run, return an empty actions array.
Never tell the customer about internal tools, webhooks, JSON, verification, or CRM automation.
```

## Webhook Payload

Client endpoints subscribed to `whatsapp.lead_qualified` receive:

```json
{
  "event_type": "whatsapp.lead_qualified",
  "timestamp": "2026-05-29T12:00:00.000Z",
  "data": {
    "user_uid": "user-id",
    "bot_config_id": "bot-config-id",
    "whatsapp_channel_connection_id": "connection-id",
    "channel_id": "vobiz-channel-id",
    "waba_id": "waba-id",
    "phone_number": "+919999999999",
    "thread_id": "user:waba:+919999999999",
    "conversation_id": "provider-conversation-id",
    "qualified_at": "2026-05-29T12:00:00.000Z",
    "summary": "Short CRM-ready summary.",
    "qualification_reason": "Why the verifier approved.",
    "confidence": 0.91,
    "extracted_fields": {
      "course": "Data Science",
      "preferred_time": "tomorrow morning"
    },
    "proposed_action": {
      "type": "trigger_bot_flow",
      "outcome": "callback_requested",
      "reason": "User asked for counselling callback."
    },
    "conversation": [],
    "call_context": {}
  }
}
```

`conversation` and `call_context` can be omitted when disabled in config.

## Notes For Frontend

- Do not expose the internal verifier endpoint in UI.
- Do show a warning that CRM delivery also requires a webhook endpoint subscribed to `whatsapp.lead_qualified`.
- The feature is idempotent per WhatsApp thread using Redis key `wa:qualification:{thread_id}`.
- The second LLM verifier uses the saved bot prompt plus stricter backend guardrails, so users do not need a separate verifier prompt.
