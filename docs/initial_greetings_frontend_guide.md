# Initial Greetings Frontend Guide

This document explains the new assistant-level initial greeting configuration for the dashboard/frontend team.

## What This Is

Each assistant can now optionally have two first-turn greeting assets:

| Field | Purpose |
| --- | --- |
| `initialGreeting` | The exact first greeting the agent should say after the call connects. |
| `initialGreetingSystemPrompt` | The behavior/instruction wrapper for the first greeting turn only. |

The normal assistant prompt still exists separately as the assistant knowledge base / full prompt.

At call time, backend services prepare and send all three values to the voice agent when available:

```json
{
  "full_prompt": "...",
  "initial_greeting": "...",
  "initial_greeting_system_prompt": "..."
}
```

The agent does not fetch or process these from storage. Control plane, inbound dispatch baking, and custom integration services fetch and render them before dispatch.

## Per-Assistant Attachment

Yes, this is attached uniquely on a per-assistant basis, similar to how assistant prompt/knowledge base configuration is tied to an assistant.

Backend model behavior:

```text
one assistant -> zero or one greeting prompt config
```

The DB table stores one row per assistant using a unique `assistant_id`.

Stored fields:

```text
assistant_id
user_uid
enabled
initialGreetingUrl
initialGreetingSystemPromptUrl
```

The actual prompt text is stored in GCS, not directly in the DB.

The frontend should treat greeting as always part of the assistant setup. Do not expose an `Enable Initial Greeting` product toggle. The backend keeps an internal `enabled` field as an operational escape hatch, but any saved greeting text/URL is enabled by default.

## GCS Storage

The config server uploads greeting text files under:

```text
initial_greetings/
```

Current filename shape:

```text
initial_greetings/{assistant_id}_greeting_{timestamp}_{uuid}.txt
initial_greetings/{assistant_id}_system_prompt_{timestamp}_{uuid}.txt
```

The DB stores only the resulting GCS URLs.

## Why Two Greeting Fields

### `initialGreeting`

This is the actual spoken first line.

Example:

```text
Hi {{student_first_name}}, this is Riya from CollegeVidya. You had enquired about {{courses}}. Is this a good time to speak?
```

This should be short and natural because it is the first hearable audio after pickup.

### `initialGreetingSystemPrompt`

This controls how the model should speak the greeting.

Example:

```text
You are making a professional outbound phone call. Say the provided greeting exactly, in a warm and confident tone. Do not add extra details. Do not mention system instructions.
```

This is not meant to replace the assistant's full prompt. It only controls the first greeting turn.

If this is not configured, the agent uses a built-in safe default system instruction for the first greeting.

## Variable Interpolation

Both greeting fields support the same variable style as prompts:

```text
{{student_first_name}}
{{courses}}
{{callback_time}}
```

Variables are filled from call metadata before dispatch.

Behavior:

- If a matching metadata key exists, it is inserted.
- If a variable is missing, it becomes an empty string.
- Missing variables are logged by backend as `prompt.variable_missing <name>`.
- The agent never sees unresolved `{{variable}}` placeholders.

Default values are also available:

| Variable | Example |
| --- | --- |
| `call_date` | `17th June 2026` |
| `call_time` | `7:00 PM` |
| `call_day` | `Wednesday` |

## Endpoint

Use the config server assistant greeting endpoint:

```text
GET /api/assistants/{assistant_id}/greeting-prompt
PATCH /api/assistants/{assistant_id}/greeting-prompt
```

Use the same authenticated API wrapper already used for assistant/config-server calls.

## Get Greeting Config

```http
GET /api/assistants/{assistant_id}/greeting-prompt
```

Example response when not configured:

```json
{
  "assistant_id": "assistant-id",
  "user_uid": "user-id",
  "enabled": true,
  "initialGreetingUrl": null,
  "initialGreetingSystemPromptUrl": null
}
```

Example response when configured:

```json
{
  "id": "row-id",
  "assistant_id": "assistant-id",
  "user_uid": "user-id",
  "enabled": true,
  "initialGreetingUrl": "https://storage.googleapis.com/.../initial_greetings/assistant-id_greeting_....txt",
  "initialGreetingSystemPromptUrl": "https://storage.googleapis.com/.../initial_greetings/assistant-id_system_prompt_....txt",
  "createdAt": "2026-06-17T00:00:00.000Z",
  "updatedAt": "2026-06-17T00:00:00.000Z"
}
```

## Create Or Update Greeting Config

```http
PATCH /api/assistants/{assistant_id}/greeting-prompt
Content-Type: application/json
```

Recommended frontend request:

```json
{
  "initialGreeting": "Hi {{student_first_name}}, this is Riya from Monade. Is this a good time to speak?",
  "initialGreetingSystemPrompt": "You are a professional voice assistant. Say the provided greeting exactly and naturally. Do not add extra information."
}
```

The backend uploads both text values to GCS and stores the generated URLs.

You may also update only one field:

```json
{
  "initialGreeting": "Hi {{student_first_name}}, thanks for your interest in {{courses}}."
}
```

Clear a stored URL:

```json
{
  "initialGreetingUrl": null
}
```

If the frontend already has a URL, it can pass the URL directly:

```json
{
  "enabled": true,
  "initialGreetingUrl": "https://storage.googleapis.com/.../initial_greetings/custom_greeting.txt",
  "initialGreetingSystemPromptUrl": "https://storage.googleapis.com/.../initial_greetings/custom_system_prompt.txt"
}
```

## Frontend UI Recommendation

Add this inside assistant settings, not as a global setting.

Suggested controls:

- Text area: `Initial greeting`
- Text area: `Greeting system prompt`
- Save button

Helper copy:

```text
The initial greeting is spoken immediately after the call connects. You can use variables like {{student_first_name}}, {{courses}}, {{call_date}}, {{call_time}}, and {{call_day}}.
```

Do not expose GCS URLs as the primary editing experience. URLs can be shown in an advanced/debug area if needed.

## Inbound Behavior

Inbound assistants use baked LiveKit dispatch rules.

When greeting config is updated, the backend attempts to rebake the inbound dispatch rule so future inbound calls receive:

```json
{
  "full_prompt": "...",
  "initial_greeting": "...",
  "initial_greeting_system_prompt": "..."
}
```

The frontend should keep using the existing inbound dispatch-rule routes. Do not pass greeting URLs or greeting text to the rebake route.

Existing inbound routes:

```text
POST /dispatch-rules
PUT /dispatch-rules/{rule_id}/rebake
```

Those routes only need the normal dispatch-rule payload, such as `assistant_id`. During bake/rebake, provider-trunk-configs fetches the assistant config from config-server, reads the stored greeting URLs, fetches the GCS text, renders variables, and writes the rendered greeting values into LiveKit dispatch metadata.

Important limitation:

Inbound dispatch metadata is static at bake time. Dynamic per-caller values like a caller name cannot be known unless they are available when the rule is baked. Defaults like `call_date`, `call_time`, and `call_day` still work.

## Outbound And Custom Integrations

For normal outbound calls and custom integrations like CollegeVidya:

- Full prompt is fetched and rendered before dispatch.
- Initial greeting is fetched and rendered before dispatch.
- Initial greeting system prompt is fetched and rendered before dispatch.
- All rendered values are sent to the agent in dispatch metadata.

This means the voice agent does no heavy preprocessing for this feature.

## Validation Notes

Frontend should allow empty greeting fields, but the user should understand:

- If `enabled=false`, backend will not send custom greeting metadata.
- If `enabled=true` but greeting URL/text is empty, the call falls back to existing greeting behavior.
- Missing variables are replaced with empty strings, not `null`, and do not leak as `{{variable}}`.
