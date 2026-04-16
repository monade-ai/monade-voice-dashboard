# Background Audio — Frontend Integration Guide

A short guide for wiring background ambient audio into the assistant editor UI. This feature adds a looping ambient track (office ambience, keyboard typing) mixed into the live call audio so the caller hears a realistic environment behind the agent.

---

## TL;DR

- **No new schema.** Config lives inside the existing `Assistant.toolsConfig` JSON field under a top-level `background_audio` key.
- **Ambient audio is NOT a function tool.** It's independent of the `enableTools` master toggle — you can turn it on even when all tools are disabled.
- **Outbound path only for now.** Inbound parity will come later; don't rely on it yet.
- **Two endpoints available** — use whichever fits your UI:
  - Dedicated: `PATCH /api/assistants/:id/background-audio` (recommended for a toggle/slider UI)
  - Full config: `PATCH /api/assistants/:id/tools-config` (send entire `toolsConfig` if you already manage tools together)

---

## Data shape

`toolsConfig.background_audio` is an object with three fields:

```json
{
  "enabled": true,
  "ambient_clip": "OFFICE_AMBIENCE",
  "ambient_volume": 8.0
}
```

| Field            | Type      | Required | Valid values                                                 | Default            | Notes                                                                 |
| ---------------- | --------- | -------- | ------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------- |
| `enabled`        | `boolean` | yes      | `true` / `false`                                             | `false`            | Master switch for ambient audio                                       |
| `ambient_clip`   | `string`  | no       | `"OFFICE_AMBIENCE"`, `"KEYBOARD_TYPING"`, `"KEYBOARD_TYPING2"` | `"OFFICE_AMBIENCE"` | Built-in LiveKit clips. Unknown values fall back to `OFFICE_AMBIENCE` |
| `ambient_volume` | `number`  | no       | `0` – `50`                                                   | `8.0`              | Telephony (G.711) compresses dynamic range — typical range `6`–`10`   |

---

## Recommended endpoint — `PATCH /background-audio`

Use this when the UI has just a toggle + dropdown + volume slider for ambient audio. The server merges into `toolsConfig`, preserving any RAG / end_call tools already configured.

**Request**

```http
PATCH /db_services/api/assistants/{assistant_id}/background-audio
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "enabled": true,
  "ambient_clip": "OFFICE_AMBIENCE",
  "ambient_volume": 8.0
}
```

**Response**

```json
{
  "id": "…",
  "name": "…",
  "enableTools": true,
  "toolsConfig": { "...": "…", "background_audio": { "enabled": true, "ambient_clip": "OFFICE_AMBIENCE", "ambient_volume": 8.0 } },
  "background_audio": { "enabled": true, "ambient_clip": "OFFICE_AMBIENCE", "ambient_volume": 8.0 }
}
```

**Validation errors (400)**

- `enabled must be a boolean (true/false)`
- `ambient_clip must be one of: OFFICE_AMBIENCE, KEYBOARD_TYPING, KEYBOARD_TYPING2`
- `ambient_volume must be a number between 0 and 50`

### Minimal React example

```jsx
async function saveBackgroundAudio(assistantId, { enabled, clip, volume }) {
  const res = await fetch(
    `/db_services/api/assistants/${assistantId}/background-audio`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        enabled,
        ambient_clip: clip,
        ambient_volume: volume,
      }),
    },
  );
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
```

### Reading current state

Fetch the assistant via `GET /api/assistants/:id` (or `GET /api/assistants/:id/tools-config` which already returns `toolsConfig`) and read `toolsConfig.background_audio`. If absent, treat as `{ enabled: false, ambient_clip: "OFFICE_AMBIENCE", ambient_volume: 8.0 }`.

---

## Alternative — `PATCH /tools-config`

If your UI edits everything (RAG + end_call + background audio) in one save, keep using this endpoint and include `background_audio` alongside `tools`:

```json
{
  "toolsConfig": {
    "max_tool_steps": 1,
    "tools": [
      { "type": "vertex_rag", "enabled": false, "config": { "rag_corpus": "", "similarity_top_k": 10, "vector_distance_threshold": 0.3 } },
      { "type": "end_call", "enabled": false }
    ],
    "background_audio": {
      "enabled": true,
      "ambient_clip": "OFFICE_AMBIENCE",
      "ambient_volume": 8.0
    }
  }
}
```

Same validation rules apply.

---

## UI suggestions

- **Toggle** controls `enabled`.
- **Dropdown** for `ambient_clip` — only 3 options today, but keep the UI extensible.
- **Slider** for `ambient_volume` — range `0`–`20` covers 99% of real-world use (server accepts up to `50` as a safety margin). Step `0.5`.
- When `enabled === false`, dim the clip/volume controls but keep their values — don't reset on toggle-off. That way users can flip it back without retyping.
- Show a **preview hint** next to the clip dropdown: "Callers will hear this behind the agent's voice."
- `enableTools` has **no effect** on background audio — don't couple them in the UI.

---

## How this reaches the agent

For your situational awareness (frontend doesn't need to do anything here):

1. Frontend `PATCH`es `toolsConfig.background_audio` onto the assistant record.
2. On an outbound call, [control-plane/src/api/outbound_call.py](../control-plane/src/api/outbound_call.py) fetches the assistant, extracts `toolsConfig.background_audio`, and (if `enabled`) forwards it as a **top-level** key inside the dispatch metadata JSON sent to LiveKit:
   ```json
   {
     "call_type": "outbound",
     "assistant_id": "…",
     "full_prompt": "…",
     "tools_config": { … },
     "enable_tools": true,
     "background_audio": { "enabled": true, "ambient_clip": "OFFICE_AMBIENCE", "ambient_volume": 8.0 },
     "metadata": { /* user per-call personalization */ }
   }
   ```
3. The agent ([agent/src/agent.py](../agent/src/agent.py)) reads `dispatch_metadata["background_audio"]` and, if enabled, constructs a `BackgroundAudioPlayer` with the chosen clip + volume and publishes it as a second microphone-source track into the room. The SIP bridge mixes it into the phone audio.
4. On call teardown, the player is `aclose()`'d as part of the shutdown callback chain — no frontend or backend action required.

---

## Gotchas

- **Don't put background audio in the `tools` array.** It's a top-level sibling of `tools`, not a function tool. Putting it in `tools` will fail validation.
- **Inbound calls don't get ambient audio yet.** The inbound dispatch-rule builder ([provider-trunk-configs/inbound_trunk_api.py](../provider-trunk-configs/inbound_trunk_api.py)) does not forward `background_audio` today. Setting it on an inbound-only assistant is a no-op until that's wired. Plan to follow up.
- **Volume is counter-intuitive.** Telephony (G.711 codec) heavily compresses dynamic range; volumes like `1.0` are inaudible on a phone call. Start at `8.0` and let users tune from there.
- **"Thinking" sound is not exposed.** LiveKit's `BackgroundAudioPlayer` also supports a `thinking_sound`, but Gemini Live skips the THINKING state (LISTENING → SPEAKING directly), so it's a no-op in our stack. We've deliberately left it out of the dispatch contract.
- **Defaults if you send nothing.** If `toolsConfig.background_audio` is absent on the assistant record, the agent will not publish any ambient track — existing assistants behave exactly as before.
