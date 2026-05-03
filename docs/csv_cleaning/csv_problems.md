The Problem (Issue CSV):

Each lead only had 1 actual call attempt (Attempt_1_Call_ID has a real Call ID)
But Attempt_2_Call_ID is also being populated — with the same Call ID as Attempt_1, and the same tag (e.g., "Uncertain" appears in both Attempt_1_Tag and Attempt_2_Tag)
Attempt_2_Call_Connected is also getting True even though no second call happened
All Attempt_2 Analytics columns are empty (correctly blank), but the ID/Tag/Connected fields are duplicated

The Correct CSV shows:

Attempt_1 has a real Call ID, Tag, and Call_Connected = True
Attempt_2 onwards are all NaN — clean and empty

Here's the prompt you can drop to your agent/developer:

PROMPT FOR YOUR AGENT:

Bug Fix: Duplicate Attempt Population in CSV Download
Issue:
When a lead has only 1 call attempt, the CSV is incorrectly populating Attempt_2_Call_ID, Attempt_2_Tag, and Attempt_2_Call_Connected with the same values as Attempt_1. All subsequent attempt fields (Attempt_2 through Attempt_6) should be completely empty/null if no actual second call was made.
Root Cause to Investigate:
The logic that maps call attempts to their respective numbered columns (Attempt_1, Attempt_2, etc.) appears to be running a duplicate write — either the last attempt's data is being written twice (once to Attempt_1, once to Attempt_2), or the loop iterating over call attempts has an off-by-one issue and is processing Attempt_1's record a second time.
Expected Behavior:

Attempt_N_Call_ID, Attempt_N_Tag, and Attempt_N_Call_Connected should only be populated if a real, distinct call was made for that attempt number.
A lead with 1 call attempt should have data only in Attempt_1_* columns. Attempt_2_* through Attempt_6_* must all be null/empty.
The Call ID in Attempt_2_Call_ID must never be the same as Attempt_1_Call_ID — each Call ID is unique per call event.

Fix Rule:
Before writing to Attempt_N columns, verify that the Call ID for that slot is distinct and different from all previously written attempt Call IDs. If no new unique Call ID exists for that slot, leave all Attempt_N_* fields blank.

---

Frontend Update / Reply Back To Team

What we changed in the current code:

1. Duplicate attempt slot protection
- The CSV export pivot logic now deduplicates attempts by real call ID before filling `Attempt_1` to `Attempt_6`.
- If a later slot has no real call ID, or repeats the same call ID as an earlier slot, that slot is skipped entirely.
- This directly targets the bug where `Attempt_2_Call_ID`, `Attempt_2_Tag`, and `Attempt_2_Call_Connected` were being populated even though only one real call happened.

2. Unanswered-call analytics gate
- If an attempt has explicit `call_connected = false`, export now treats it as `Did not pick-up` even if transcript-like content exists.
- For those unanswered attempts, enrichment output must stay blank:
  - `Uncertain_Tag`
  - `Uncertain_Reason`
  - `Uncertain_Feedback for agent`
  - any attempt-level analytics verdict fields
- This prevents voicemail / prompt / non-connected rows from being incorrectly labeled as meaningful uncertain outcomes.

3. Safer transcript source selection
- During export, if `enhanced_transcript_url` is present we now prefer it.
- If it is missing, we safely fall back to `transcript_url`.
- This keeps the export aligned with the best available transcript without breaking older records.

4. CSV character encoding improvement
- CSV download now adds a UTF-8 BOM.
- This is meant to reduce spreadsheet-app issues where Hindi or other non-ASCII transcript characters appear garbled even though they render correctly inside the dashboard UI.

What we validated locally:

- We created and ran a small Node smoke test against the export logic with sample attempt rows.
- Result:
  - one real attempt + empty extra row -> only `Attempt_1_*` is populated
  - one real attempt + duplicate same call ID -> only `Attempt_1_*` is populated
  - two distinct real attempts -> `Attempt_1_*` and `Attempt_2_*` are both populated

What we expect to see now in real CSV downloads:

- Leads with only one real call should have values only in `Attempt_1_*`.
- `Attempt_2_*` onward should remain blank unless there is a distinct second call.
- Leads with `Attempt_N_Call_Connected = false` should have no `Uncertain_*` or `Not Interested_*` enrichment output coming from that unanswered attempt.
- Export should use enhanced transcript text when available, otherwise original transcript text.
- Transcript text should open more cleanly in Excel-like tools because of the UTF-8 BOM addition.

What still needs live verification:

- One real CSV download from the actual campaign UI should be tested after deploy/push.
- We especially want to confirm:
  - no duplicate `Attempt_2_*` population
  - `Did not pick-up` attempts have zero values in `Uncertain_Tag`, `Uncertain_Reason`, `Uncertain_Feedback for agent`, and attempt analytics verdict fields
  - enhanced transcript is preferred when present
  - fallback to original transcript still works
  - Hindi / special characters open correctly in the downloaded CSV

Important note:

- For this fix, we treated the existing code path as the source of truth and patched the live export flow directly.
- We did not rely on older docs as authoritative behavior because the implementation has changed over time.
