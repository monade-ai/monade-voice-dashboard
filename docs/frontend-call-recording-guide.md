# Call Recording Playback — Frontend Integration Guide

## Overview

Two endpoints. No WebSocket. No special audio player. No auth token handling.

The backend downloads recordings from the telephony provider, uploads them to cloud storage, and returns a time-limited signed URL. The browser's native `<audio>` element handles streaming, seeking, and playback.

---

## Endpoints

### 1. `POST /api/analytics/:call_id/recording/prepare`

Kicks off the recording preparation pipeline. Returns immediately.

**Response:**

| `status` | Meaning |
|---|---|
| `"processing"` | Pipeline started, poll `/status` for updates |
| `"ready"` | Already prepared (cache hit), `url` field contains the signed URL |
| `"failed"` | Previous attempt failed, `error` field has details |

```json
// Processing (first click)
{ "status": "processing" }

// Cache hit (repeat click within 30min)
{
  "status": "ready",
  "url": "https://storage.googleapis.com/...signed...",
  "download_url": "https://storage.googleapis.com/...signed-attachment..."
}
```

### 2. `GET /api/analytics/:call_id/recording/status`

Poll this every 2-3 seconds after receiving `"processing"`.

**Response:**

```json
// Still working
{ "status": "processing" }

// Done — use url as audio src, download_url for save-to-disk
{
  "status": "ready",
  "url": "https://storage.googleapis.com/...signed...",
  "download_url": "https://storage.googleapis.com/...signed-attachment..."
}

// Error
{ "status": "failed", "error": "Recording not yet available from Vobiz" }

// Never prepared (prepare was not called)
{ "status": "not_started" }
```

---

## Example Integration

```js
async function playRecording(callId, audioElement, setLoading, setError) {
  setLoading(true);
  setError(null);

  try {
    // Step 1: Request preparation
    const prepRes = await fetch(`/api/analytics/${callId}/recording/prepare`, {
      method: 'POST',
    });
    const prepData = await prepRes.json();

    // Instant cache hit — play immediately
    if (prepData.status === 'ready') {
      audioElement.src = prepData.url;
      audioElement.play();
      setLoading(false);
      return;
    }

    if (prepData.status === 'failed') {
      setError(prepData.error || 'Recording preparation failed');
      setLoading(false);
      return;
    }

    // Step 2: Poll for status
    const poll = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/analytics/${callId}/recording/status`);
        const statusData = await statusRes.json();

        if (statusData.status === 'ready') {
          clearInterval(poll);
          audioElement.src = statusData.url;
          audioElement.play();
          setLoading(false);
        } else if (statusData.status === 'failed') {
          clearInterval(poll);
          setError(statusData.error || 'Recording preparation failed');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(poll);
        setError('Network error while checking recording status');
        setLoading(false);
      }
    }, 3000);

    // Safety timeout — stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(poll);
      setLoading(false);
      setError('Recording preparation timed out');
    }, 120_000);

  } catch (err) {
    setError('Failed to start recording preparation');
    setLoading(false);
  }
}
```

### React Hook Example

```jsx
function useCallRecording(callId) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [url, setUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);

  const prepare = useCallback(async () => {
    setStatus('loading');
    setError(null);

    const res = await fetch(`/api/analytics/${callId}/recording/prepare`, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'ready') {
      setUrl(data.url);
      setDownloadUrl(data.download_url);
      setStatus('ready');
      return;
    }

    // Poll
    const interval = setInterval(async () => {
      const r = await fetch(`/api/analytics/${callId}/recording/status`);
      const d = await r.json();
      if (d.status === 'ready') {
        clearInterval(interval);
        setUrl(d.url);
        setDownloadUrl(d.download_url);
        setStatus('ready');
      } else if (d.status === 'failed') {
        clearInterval(interval);
        setError(d.error);
        setStatus('error');
      }
    }, 3000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [callId]);

  return { status, url, downloadUrl, error, prepare };
}

// Usage in component
function RecordingPlayer({ callId }) {
  const { status, url, downloadUrl, error, prepare } = useCallRecording(callId);

  return (
    <div>
      <button onClick={prepare} disabled={status === 'loading'}>
        {status === 'loading' ? 'Preparing...' : 'Play Recording'}
      </button>
      {status === 'ready' && (
        <>
          <audio src={url} controls autoPlay />
          <a href={downloadUrl} download>Download Recording</a>
        </>
      )}
      {status === 'error' && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## Notes

- **Two URLs returned:** `url` is for streaming playback (`<audio src>`), `download_url` triggers a browser save-as dialog (`<a href={download_url} download>`).
- **Signed URLs expire after 30 minutes.** Repeat clicks within that window return the cached URL instantly (no re-download).
- **Audio formats:** `.mp3` (most common) and `.wav` are both supported. The browser handles decoding natively.
- **Seeking works.** GCS signed URLs support HTTP range requests — the `<audio>` element's seek bar works out of the box.
- **Preparation takes 15-40 seconds** depending on file size. Show a loading spinner/skeleton.
- **Auth:** These endpoints are protected by the same auth as all other `/api/analytics/*` routes (session cookie or API key). No extra auth setup needed.
