# Frontend Enhanced Transcript Guide

## Goal
Add an "Enhance Transcript" action that feels fast for users and does not repeat expensive backend work once the enhanced transcript already exists.

Backend routes:
- `POST /db_services/api/analytics/:call_id/enhanced-transcript`
- `GET /db_services/api/analytics/:call_id/enhanced-transcript`

Auth:
- send `Authorization: Bearer <api_key>`

## Expected flow
1. User clicks `Enhance Transcript`.
2. Frontend calls `POST /db_services/api/analytics/:call_id/enhanced-transcript`.
3. Handle response by `status`:
   - `ready`: render transcript immediately
   - `processing`: show loading state and begin polling `GET`
   - `failed`: show error and allow retry
4. While processing, poll `GET /db_services/api/analytics/:call_id/enhanced-transcript` every 2-3 seconds.
5. Stop polling when status becomes `ready` or `failed`.

## Important behavior
- If the transcript was already enhanced before, `POST` returns `ready` immediately.
- If another request is already processing the same call, `POST` returns `processing` immediately.
- Final enhanced transcripts are permanent.
- Do not expect the frontend to regenerate on every open or refresh.
- If the call row includes `enhanced_transcript_url`, you can show an "Enhanced Transcript Ready" state even before the user clicks.

## Response shapes
### Ready
```json
{
  "status": "ready",
  "call_id": "AJ_xxx",
  "enhanced_transcript_url": "https://storage.googleapis.com/...",
  "metadata": {
    "call_id": "AJ_xxx",
    "user_uid": "user_xxx",
    "phone_number": "+9198...",
    "sip_call_id": "7tvh...",
    "assistant_name": "Riya Sharma",
    "customer_name": null,
    "source": "gemini_enhanced_audio_transcript",
    "model": "gemini-2.0-flash",
    "generated_at": "2026-04-07T12:00:00.000Z",
    "original_transcript_url": "https://storage.googleapis.com/..."
  },
  "transcript": [
    {
      "timestamp": "2026-03-15T20:15:30.338646",
      "end_timestamp": "2026-03-15T20:15:33.000000",
      "sender": "assistant",
      "speaker_name": "Riya Sharma",
      "text": "Thank you for calling Zostel! This is Riya. How can I help you today?"
    }
  ]
}
```

### Processing
```json
{
  "status": "processing",
  "call_id": "AJ_xxx"
}
```

### Failed
```json
{
  "status": "failed",
  "call_id": "AJ_xxx",
  "error": "Recording not yet available from Vobiz"
}
```

### Not started
```json
{
  "status": "not_started",
  "call_id": "AJ_xxx"
}
```

## UI guidance
- Button label before first trigger: `Enhance Transcript`
- While processing: disable button and show `Enhancing transcript...`
- On ready: replace raw transcript view with enhanced transcript if available
- Keep a retry button for `failed`
- Prefer rendering from the inline `transcript` array returned by the API instead of fetching the JSONL separately
- Keep the original transcript as fallback if enhancement fails

## Suggested frontend logic
```ts
async function startEnhancedTranscript(callId: string) {
  const res = await fetch(`/db_services/api/analytics/${callId}/enhanced-transcript`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await res.json();

  if (data.status === 'ready') {
    return data;
  }

  if (data.status === 'processing') {
    return await pollEnhancedTranscript(callId);
  }

  throw new Error(data.error || 'Failed to enhance transcript');
}

async function pollEnhancedTranscript(callId: string) {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const res = await fetch(`/db_services/api/analytics/${callId}/enhanced-transcript`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const data = await res.json();

    if (data.status === 'ready') return data;
    if (data.status === 'failed') {
      throw new Error(data.error || 'Enhanced transcript failed');
    }
  }
}
```

## Edge cases to handle
- `404`: analytics row missing or call has no `sip_call_id`
- `503`: cloud storage, Redis, or Vobiz config unavailable
- `failed`: backend attempted processing but could not complete
- `warning` on a ready response: the URL is valid, but inline parsing failed on the backend; frontend can still choose to fetch the file directly if needed
