# Background Audio — Frontend Integration Guide

A short guide for wiring background ambient audio into the assistant editor UI. This feature adds a looping ambient track (office ambience, keyboard typing) mixed into the live call audio so the caller hears a realistic environment behind the agent.

---

## TL;DR

- **No new schema.** Config lives inside the existing `Assistant.toolsConfig` JSON field under a top-level `background_audio` key.
- **Ambient audio is NOT a function tool.** It's independent of the `enableTools` master toggle — you can turn it on even when all tools are disabled.
- **Outbound and inbound both supported.** Inbound has one extra step — see the "Inbound calls" section below.
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

## Interaction with RAG / end_call (read carefully)

All routes that write `toolsConfig` now follow one rule: **touch only the block you own, preserve every other top-level key and every other tool entry**. This matters because `toolsConfig` is a shared JSON document — if a route replaced it wholesale, unrelated features like ambient audio would get silently wiped.

- `PATCH /api/assistants/:id/background-audio` — writes only the `background_audio` block. RAG, end_call, `max_tool_steps`, and any unknown sibling keys are preserved.
- `PATCH /api/assistants/:id/attach-rag` — writes only the `vertex_rag` entry inside `tools`. `background_audio`, `end_call`, other tool entries, and unknown sibling keys are preserved. Always sets `enableTools: true` (the user just opted into a function tool).
- `PATCH /api/assistants/:id/detach-rag` — flips only the `vertex_rag` entry to `enabled: false` and clears its `rag_corpus`. All other tools and top-level keys are preserved. `enableTools` is set based on whether **any other function tool is still enabled** — it is no longer blindly forced to `false`. `background_audio` is not a function tool and never affects `enableTools`.
- `background_audio` stays independent of `enableTools` in every flow — don't couple them in the UI.

**Practical implication for the frontend:** you can save background-audio settings, then attach or detach RAG, and the ambient audio settings will still be intact. Same in the other direction. No need to save everything in one bundle.

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
3. On an inbound call, the path is baked: [provider-trunk-configs/inbound_trunk_api.py](../provider-trunk-configs/inbound_trunk_api.py) `_build_dispatch_metadata()` reads `toolsConfig.background_audio` from the assistant at dispatch-rule creation (or rebake) time and embeds it as the same top-level `background_audio` key inside the dispatch rule's baked metadata. LiveKit replays that baked metadata for every inbound call. Same dispatch contract as outbound — the agent doesn't distinguish.
4. The agent ([agent/src/agent.py](../agent/src/agent.py)) reads `dispatch_metadata["background_audio"]` and, if enabled, constructs a `BackgroundAudioPlayer` with the chosen clip + volume and publishes it as a second microphone-source track into the room. The SIP bridge mixes it into the phone audio.
5. On call teardown, the player is `aclose()`'d as part of the shutdown callback chain — no frontend or backend action required.

---

## Inbound calls — important: rebake after changing ambient settings

Inbound dispatch metadata is **pre-baked at dispatch-rule creation time** (see [provider-trunk-configs/inbound_trunk_api.py](../provider-trunk-configs/inbound_trunk_api.py)). The baked copy is what LiveKit hands to the agent on every inbound call; it does NOT re-read the assistant row each time.

So the flow for inbound is:

1. `PATCH /api/assistants/:id/background-audio` — saves new ambient settings on the assistant (same endpoint as outbound).
2. **`PUT /dispatch-rules/{rule_id}/rebake`** — re-bakes the existing inbound dispatch rule with the updated assistant data. Without this step, inbound callers keep hearing the *old* baked settings (or silence, if there was nothing baked before).

Rule of thumb: every time you change anything on an inbound-connected assistant's `toolsConfig.background_audio` (or prompt, or KB), hit rebake. Outbound has no equivalent step — it reads fresh on every call.

The UI can hide this behind a single "Save & apply to inbound" button that calls `PATCH /background-audio` and then `PUT /dispatch-rules/{rule_id}/rebake` for each dispatch rule tied to this assistant.

---

## Gotchas

- **Don't put background audio in the `tools` array.** It's a top-level sibling of `tools`, not a function tool. Putting it in `tools` will fail validation.
- **Inbound requires a rebake after settings change** (see section above). Outbound is fresh-read on every call, so no rebake needed there.
- **Volume is counter-intuitive.** Telephony (G.711 codec) heavily compresses dynamic range; volumes like `1.0` are inaudible on a phone call. Start at `8.0` and let users tune from there.
- **"Thinking" sound is not exposed.** LiveKit's `BackgroundAudioPlayer` also supports a `thinking_sound`, but Gemini Live skips the THINKING state (LISTENING → SPEAKING directly), so it's a no-op in our stack. We've deliberately left it out of the dispatch contract.
- **Defaults if you send nothing.** If `toolsConfig.background_audio` is absent on the assistant record, the agent will not publish any ambient track — existing assistants behave exactly as before.
