Context you need before touching any code:
The analytics field in each call record is a JSON string that needs parsing before use — JSON.parse(record.analytics) before reading any field off it. The code is already doing this but confirm before assuming it's available as an object.

The display logic — implement in this exact priority order:
1. Provider data available (record.cdr?.status exists)
   → use it as-is, already working, do not touch

2. Provider data missing/null AND analytics exists
   → parse analytics JSON
   → if analytics.call_status === "not_picked_up"  → show "Not Answered"
   → if analytics.call_status === "picked_up" AND analytics.voicemail === true → show "Voicemail"
   → otherwise → fall through to step 3

3. Everything above is unavailable or fields are missing (legacy records)
   → show "Not Available"
   → no errors, no crashes, just that label

Write a single helper function, use it everywhere call status is rendered:
jsfunction resolveCallStatus(record) {
  // Priority 1 — provider data
  if (record.cdr?.status) {
    return { label: record.cdr.status, source: "provider" }
  }

  // Priority 2 — our analytics fields (may not exist on legacy records)
  try {
    const analytics = typeof record.analytics === "string"
      ? JSON.parse(record.analytics)
      : record.analytics

    if (analytics?.call_status === "not_picked_up") {
      return { label: "Not Answered", source: "analytics" }
    }
    if (analytics?.call_status === "picked_up" && analytics?.voicemail === true) {
      return { label: "Voicemail", source: "analytics" }
    }
  } catch {
    // analytics missing or unparseable — fall through
  }

  // Priority 3 — legacy or all fallbacks failed
  return { label: "Not Available", source: "none" }
}
Wrap the analytics parse in try/catch — never let a malformed or missing analytics field reach the render layer as an error.

Two things to never do:

Never crash or throw if analytics is null, undefined, or an unparseable string — always fall through to "Not Available"
Never touch the existing provider data rendering path — it is working, leave it alone