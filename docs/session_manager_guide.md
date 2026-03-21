# Session Manager Guide (Frontend / SDK)

## Purpose
Use Session Manager to:
- List active calls for a user
- Gracefully disconnect calls (agent says goodbye)
- Instantly disconnect calls (immediate drop)
- Disconnect by callee phone number (no room ID needed)

Base path: `/session-manager`

## Auth
Use existing auth (dashboard session cookie, API key, or service token).
No auth pattern changes were made.

## Data Model in Active Sessions
Each active session entry now includes:
- `call_id`
- `room_name`
- `phone_number`
- `target_phone_number` (callee/customer phone for outbound)
- `call_direction` (`outbound`, `inbound`, or `unknown`)
- `started_at`
- `duration_seconds`

If metadata is missing, values may be empty/`unknown`.
Billing continues normally.

## Endpoints

### 1) List Active Sessions for a User
`GET /session-manager/sessions/{user_id}`

Response includes:
- `active_sessions`
- `count`
- `stale_entries_removed` (auto-healed Redis references removed during read)

### 2) Graceful Disconnect All User Sessions
`POST /session-manager/sessions/{user_id}/disconnect/graceful`

Body:
```json
{
  "reason": "manual_disconnect"
}
```

Behavior:
- Sends `graceful_disconnect` signal to active rooms
- Agent handles farewell and normal shutdown flow

### 3) Instant Disconnect All User Sessions
`POST /session-manager/sessions/{user_id}/disconnect/instant`

Body:
```json
{
  "reason": "wallet_exhausted"
}
```

Behavior:
- Deletes room immediately via LiveKit API
- Cleans Redis call/session state

### 4) Disconnect One Active Call by Phone
`POST /session-manager/sessions/{user_id}/disconnect/by-phone/{phone_number}`

Body:
```json
{
  "mode": "instant",
  "reason": "user_requested"
}
```

`mode` values:
- `instant`: room delete + Redis cleanup
- `graceful`: signal only (agent farewell path)

Use this for dashboard UX where users know phone number, not room ID.

## Backward-Compatible Endpoints
These still work:
- `POST /session-manager/disconnect/{room_name}`
- `POST /session-manager/disconnect-by-phone/{phone_number}`

## Notes for Integrations
- Prefer sending `target_phone_number` and `call_direction` in billing `start_call`.
- If not provided, system falls back gracefully and does not block billing.
- For outbound dashboard actions, use the by-phone endpoint to avoid exposing room IDs.
