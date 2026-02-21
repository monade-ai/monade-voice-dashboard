# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-02-21 (Platform Upgrades)

### Added
- **Call Recording Playback System**
  - **Why:** The dashboard had static "AudioPill" and play buttons that did not function. We needed to wire them up to the actual Vobiz backend recording API.
  - **What:** 
    - Created `useCallRecording` hook located at `src/app/hooks/use-call-recording.ts` providing robust client-side edge-caching for recording URLs and a global singleton audio system (ensuring only one recording plays at a time).
    - Updated the `CallAnalytics` interface in `src/app/hooks/use-analytics.ts` to understand `sip_call_id`, `recording_url`, and `recording_duration_ms`.
    - Fully rewrote the `AudioPill` UI component (`src/components/ui/audio-pill.tsx`) from a static mock to a real, functional player with loading states, error handling, progress seeking, and duration formatting.
    - Wired the Dashboard table `TranscriptRow` (`src/app/(app)/dashboard/page.tsx`) to trigger the real audio playback instead of mock actions.
    - Wired the `TranscriptViewer` (`src/components/transcript-viewer.tsx`) to pass actual telemetry to its `AudioPill`.
- **Live Session Management Page (`/sessions`)**
  - **Why:** Administrators need a way to monitor ongoing live phone calls and forcefully disconnect them if necessary.
  - **What:**
    - Created a new page at `src/app/(app)/sessions/page.tsx`.
    - Added a live-updating UI with cards for each active call displaying the room name, phone number, and a dynamically ticking duration counter.
    - Included a red "Disconnect Call" action button with loading states.
    - Added a 10-second auto-refresh polling mechanism using a new `useSessions` hook (`src/app/hooks/use-sessions.ts`).
    - Added a new Next.js API route `src/app/api/proxy-sessions/[...path]/route.ts` to securely proxy traffic to the internal Session Manager service at `http://35.200.254.189/session-manager/`.
- **User SIP Trunk Management Page (`/trunks`)**
  - **Why:** Allow users to connect their own SIP provider trunks (Outbound/Inbound) entirely self-serve via the dashboard GUI, saving data immediately via the PostgreSQL DB routes.
  - **What:**
    - Created a new page at `src/app/(app)/trunks/page.tsx`.
    - Built a robust `useUserTrunks` hook (`src/app/hooks/use-user-trunks.ts`) performing full CRUD operations via the existing `/api/proxy` (mapping to the PostgreSQL DB Trunk routes).
    - Implemented a modern, accordion-style expandable Trunk Card UI: 
      - Rather than popping up a modal, clicking a trunk expands it to reveal inline editing.
      - Input fields (Name, Base URI, Phone Numbers, Auth credentials) are pre-filled upon expansion.
      - Added a secure inline "Unlink Trunk" flow that requires confirmation to prevent accidental removals, while noting the trunk remains globally in LiveKit.
      - Displays all currently configured trunks under an "Outbound Trunks" category wrapper for immediate clarity.
- **Sidebar Navigation Updates**
  - Added new navigation entry for **Sessions** (with a live pulse indicator) under the `Operations` category.
  - Added new navigation entry for **Trunks** under the `Connectivity` category.
