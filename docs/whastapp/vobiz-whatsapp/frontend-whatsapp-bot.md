# Frontend Guide: WhatsApp Inbound Bot

## Page Purpose

Build a WhatsApp Bot settings page where users can control inbound conversational replies per connected WhatsApp sender number.

Users should be able to:

- pick a connected WhatsApp channel
- enable or disable the inbound bot for that channel
- create and edit bot prompt files
- attach a prompt file to a channel bot
- choose the Gemini model
- tune simple generation settings
- save and reload the current bot config

This bot is for inbound WhatsApp messages. It is separate from post-call WhatsApp follow-up template flows.

## Recommended Layout

Use one page or a tab under WhatsApp settings:

```text
Connected number selector
Prompt file picker / editor
Bot enabled toggle
Model selector
Generation settings
Save button
```

Show the selected channel metadata near the top:

```text
Label | Display name | WhatsApp number | Channel ID | Status
```

## Load Data

First load connected channels:

```http
GET /api/users/:user_uid/vobiz-whatsapp/channels
```

Then load existing bot configs:

```http
GET /api/users/:user_uid/vobiz-whatsapp/bot-configs
```

Also load prompt files:

```http
GET /api/users/:user_uid/vobiz-whatsapp/bot-prompts
```

Each config is scoped to one `whatsapp_channel_connection_id`. If the selected channel has no config, render defaults:

```json
{
  "enabled": false,
  "whatsapp_bot_prompt_id": null,
  "model": "gemini-2.0-flash",
  "generation_config": {
    "temperature": 0.4,
    "top_p": 0.9,
    "max_output_tokens": 512
  }
}
```

## Prompt Files

Prompt text is stored in GCS under `whatsapp_bot_prompts/`. Postgres stores only metadata and the GCS URL.

### Create Prompt

```http
POST /api/users/:user_uid/vobiz-whatsapp/bot-prompts
```

```json
{
  "name": "Default Monade WhatsApp Bot Prompt",
  "filename": "monade-whatsapp-bot.txt",
  "prompt_text": "You are Monade's WhatsApp assistant. Answer briefly, be helpful, and ask one clear next question when needed."
}
```

### Edit Prompt

When opening an edit modal, fetch content from GCS through the backend:

```http
GET /api/users/:user_uid/vobiz-whatsapp/bot-prompts/:prompt_id?include_content=true
```

Then save edits:

```http
PUT /api/users/:user_uid/vobiz-whatsapp/bot-prompts/:prompt_id
```

```json
{
  "name": "Updated Monade WhatsApp Bot Prompt",
  "filename": "monade-whatsapp-bot-v2.txt",
  "prompt_text": "You are Monade's WhatsApp assistant. Keep replies concise, friendly, and grounded in the current chat."
}
```

### Delete Prompt

```http
DELETE /api/users/:user_uid/vobiz-whatsapp/bot-prompts/:prompt_id
```

Backend returns `409` if the prompt is attached to a bot config.

## Save Bot Config

API:

```http
PUT /api/users/:user_uid/vobiz-whatsapp/channels/:connection_id/bot-config
```

Basic body:

```json
{
  "enabled": true,
  "whatsapp_bot_prompt_id": "prompt-db-id",
  "model": "gemini-2.0-flash",
  "generation_config": {
    "temperature": 0.4,
    "top_p": 0.9,
    "max_output_tokens": 512
  }
}
```

## Model Choices

Allowed values:

```text
gemini-2.0-flash
gemini-2.5-flash
gemini-3.1-flash-lite
```

Default:

```text
gemini-2.0-flash
```

Frontend should use a model dropdown with these exact values.

## Generation Settings

Common settings for all models:

```json
{
  "temperature": 0.4,
  "top_p": 0.9,
  "max_output_tokens": 512
}
```

Validation:

```text
temperature: 0 to 2
top_p: > 0 to 1
max_output_tokens: 1 to 4096
```

## Thinking Settings

Gemini model families use different thinking controls.

Google's Gemini thinking docs say Gemini 3 models use `thinkingLevel`, while Gemini 2.5 models use `thinkingBudget`. Do not show the wrong control for the selected model.

### gemini-2.0-flash

Do not show thinking controls.

Example:

```json
{
  "whatsapp_bot_prompt_id": "prompt-db-id",
  "model": "gemini-2.0-flash",
  "generation_config": {
    "temperature": 0.4,
    "top_p": 0.9,
    "max_output_tokens": 512
  }
}
```

### gemini-2.5-flash

Show `thinking_budget`.

Recommended UI:

```text
Thinking mode:
- Off / fastest: 0
- Dynamic: -1
- Custom budget: 512 to 24576
```

Example:

```json
{
  "whatsapp_bot_prompt_id": "prompt-db-id",
  "model": "gemini-2.5-flash",
  "generation_config": {
    "temperature": 0.3,
    "top_p": 0.9,
    "max_output_tokens": 512,
    "thinking_budget": 0
  }
}
```

### gemini-3.1-flash-lite

Show `thinking_level`.

Valid values:

```text
minimal
low
medium
high
```

Recommended default for chat:

```text
minimal
```

Example:

```json
{
  "whatsapp_bot_prompt_id": "prompt-db-id",
  "model": "gemini-3.1-flash-lite",
  "generation_config": {
    "temperature": 0.3,
    "top_p": 0.9,
    "max_output_tokens": 512,
    "thinking_level": "minimal"
  }
}
```

## Error Handling

If backend returns `400 Invalid WhatsApp bot generation_config`, show the returned `details` list directly near the settings form.

Common errors:

```text
thinking_budget is only supported for gemini-2.5-flash
thinking_level is only supported for gemini-3.1-flash-lite
temperature must be between 0 and 2
```

## UX Notes

- Disable Save until a channel and prompt file are selected.
- Let users create/edit prompt files before attaching them to a channel.
- Keep bot enable/disable independent from post-call WhatsApp template flows.
- Save the full config on every update; the backend upserts by channel.
- If a user switches model, clear incompatible thinking settings before saving.

## Reference

Gemini thinking behavior is based on Google's official Gemini thinking documentation:

```text
https://ai.google.dev/gemini-api/docs/thinking
```
