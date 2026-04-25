# Assistant Voice Selection — Frontend Guide

Small, additive change: each assistant can now carry a Gemini voice name. The
backend forwards it to the LiveKit dispatch metadata; the voice agent applies
it when the call starts.

## What changed
- `Assistant.voice` (already present in the schema, `String?`) is now wired
  end-to-end. Previously it was stored but ignored by the agent.
- Unset / null / empty voice → the agent uses its built-in default, **`Kore`**.
  No DB migration required. Existing assistants keep behaving exactly as before
  until a voice is explicitly set.

## How to update it

You can use **either** endpoint — both update the same `Assistant.voice` column.
Pick whichever is more convenient for the screen you're on.

### Option A (preferred for the assistant editor): generic update

The existing `PATCH /db_services/api/assistants/:assistant_id` already accepts
`voice` in its allowed-fields list — same route the editor uses for `name`,
`model`, `voice`, `speakingAccent`, etc. So if you're saving a whole assistant
form, just include `voice` in the body alongside the other fields. No new
endpoint call needed.

```bash
curl -X PATCH \
  https://service.monade.ai/db_services/api/assistants/<assistant_id> \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"voice":"Puck","speakingAccent":"British"}'
```

### Option B (single-field UI, e.g. an inline voice picker): dedicated route

`PATCH /db_services/api/assistants/:assistant_id/voice` — same shape as the
existing `/accent` route. Use this if you want a tighter request, explicit
null-to-clear semantics, and 64-char validation.

```bash
curl -X PATCH \
  https://service.monade.ai/db_services/api/assistants/<assistant_id>/voice \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"voice":"Puck"}'
```

**Body** for either route
```json
{ "voice": "Kore" }
```

- `voice` — string, max 64 chars. Pass `null` (or `""` on the dedicated route)
  to clear and fall back to the agent default.

**Responses**
- `200 OK` — returns the updated assistant row.
- `400` — `voice` field missing or malformed (dedicated route only; the
  generic route silently ignores unknown/invalid fields).
- `404` — assistant not found.

## Supported Gemini voice names (as of this writing)
`Kore`, `Puck`, `Charon`, `Fenrir`, `Aoede`, `Leda`, `Orus`, `Zephyr`.

The backend does not validate the voice name against an allowlist — any string
up to 64 chars is accepted, so new Google voices work without a backend
deploy. If a voice name is unsupported at call time, Gemini Live will reject
the session; surface that failure to the user in the UI.

## Suggested UX
- Add a dropdown on the assistant editor pre-filled from `assistant.voice`.
- "Default (Kore)" should map to `null` in the PATCH body, not the literal
  string "Kore" — keeps the assistant on the global default if we ever change
  it.
- Show the current voice on the assistant list card.

## How it flows (for your debugging)
1. Frontend `PATCH .../voice` → `monade-voice-config-server` updates
   `assistants.voice`.
2. Outbound call initiated → control-plane fetches assistant config, reads
   `voice`, and adds it to LiveKit dispatch metadata as `voice`.
3. Voice agent reads `dispatch_metadata.voice`; falls back to `Kore` when
   missing.

## Migration answer
None required. `voice` is nullable and the agent fallback is `Kore`, which is
what every call has been using today. You can leave existing assistants alone
and only populate `voice` for new ones the user explicitly customizes.
