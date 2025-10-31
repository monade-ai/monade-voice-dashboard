# Calling Features Changelog

## Version 1.0.0 - New Calling Flow Implementation
**Date:** 2025-10-15

### New Features

#### Enhanced Phone Calling with Callee Information
- **New Phone Dialog Component**: Added [NewPhoneDialog](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/new-phone-dialog.tsx#L17-L280) component with additional callee information fields
- **Dynamic Metadata Support**: Users can now add custom key-value pairs for callee information
- **Automatic Phone Number Formatting**: Automatically adds +91 prefix for Indian numbers if not provided
- **New Calling Service**: Implemented [new-calling-service.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/lib/services/new-calling-service.ts) to handle API calls through a proxy endpoint
- **New Hook**: Created [use-new-phone-assistant.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/hooks/use-new-phone-assistant.ts) for managing the new calling flow state
- **Proxy API Route**: Created [src/app/api/calling/route.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/api/calling/route.ts) to handle CORS issues and communicate with the external calling service
- **Enhanced Logging**: Added detailed console logging to track API requests and responses throughout the calling flow

## LiveKit Web Assistant Implementation
### New Features

#### LiveKit Integration for Web Assistant
- **LiveKit Service**: Implemented [livekit-service.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/lib/services/livekit-service.ts) to handle LiveKit dispatch creation
- **LiveKit API Route**: Created [src/app/api/livekit-dispatch/route.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/api/livekit-dispatch/route.ts) to handle LiveKit dispatch requests
- **LiveKit Web Assistant Hook**: Created [use-livekit-web-assistant.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/hooks/use-livekit-web-assistant.ts) for managing LiveKit web assistant sessions
- **LiveKit Web Assistant Dialog**: Created [livekit-web-assistant-dialog.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/livekit-web-assistant-dialog.tsx) component for the LiveKit web assistant UI
- **LiveKit Assistant Dual Button**: Created [livekit-assistant-dual-button.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/livekit-assistant-dual-button.tsx) component that combines phone and LiveKit web assistant functionality

### Enhanced LiveKit Implementation with Assistant Prompt Integration

#### Automatic Prompt Fetching
- **Assistant Data Retrieval**: The LiveKit service now automatically fetches all assistants from the assistants API
- **Current Assistant Identification**: Identifies the current assistant by ID to retrieve its knowledge base URL
- **Prompt Extraction**: Automatically fetches the knowledge base prompt and includes it in the metadata sent to LiveKit
- **Fallback Handling**: Gracefully handles cases where no knowledge base is associated with an assistant

### Technical Implementation Details

#### LiveKit Dispatch Architecture
To integrate LiveKit for web assistant sessions, we implemented a dispatch system:

1. The frontend collects user metadata in the web assistant dialog
2. When the user starts a session, a request is sent to `/api/livekit-dispatch`
3. The Next.js API route creates a LiveKit dispatch using the AgentDispatchClient
4. The dispatch instructs a LiveKit agent to join a room with the provided metadata

#### Enhanced Metadata with Prompt
The metadata sent to LiveKit now includes:
- All user-provided information (name, company, etc.)
- The assistant's prompt fetched from its knowledge base

#### Environment Configuration
Added new environment variables for LiveKit configuration:
- `LIVEKIT_URL` - The LiveKit server URL
- `LIVEKIT_API_KEY` - The LiveKit API key
- `LIVEKIT_API_SECRET` - The LiveKit API secret

#### File Structure
New files created:
- [src/lib/services/livekit-service.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/lib/services/livekit-service.ts)
- [src/app/api/livekit-dispatch/route.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/api/livekit-dispatch/route.ts)
- [src/app/hooks/use-livekit-web-assistant.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/hooks/use-livekit-web-assistant.ts)
- [src/app/assistants/components/livekit-web-assistant-dialog.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/livekit-web-assistant-dialog.tsx)
- [src/app/assistants/components/livekit-assistant-dual-button.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/livekit-assistant-dual-button.tsx)

### How to Switch Between Implementations

#### To Use the LiveKit Implementation (Currently Active)
The LiveKit implementation is currently active in the UI. No additional steps needed.

#### To Switch Back to the Previous Implementation
1. Edit [src/app/assistants/components/assistant-tabs.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/assistant-tabs.tsx)
2. Replace the component usage:
   ```typescript
   // Change this line:
   <LiveKitAssistantDualButton assistant={currentAssistant} />
   
   // To this:
   <NewAssistantDualButton assistant={currentAssistant} />
   ```

#### To Switch to the LiveKit Implementation (if reverted back)
1. Edit [src/app/assistants/components/assistant-tabs.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/assistant-tabs.tsx)
2. Replace the component usage:
   ```typescript
   // Change this line:
   <NewAssistantDualButton assistant={currentAssistant} />
   
   // To this:
   <LiveKitAssistantDualButton assistant={currentAssistant} />
   ```

### Backward Compatibility
All original files and implementations have been preserved:
- Original [PhoneDialog](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/phone-dialog.tsx#L17-L180) component remains unchanged
- Original [AssistantDualButton](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/assistant-dual-button.tsx#L27-L83) component remains unchanged
- Original [usePhoneAssistant](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/hooks/use-phone-assistant.ts#L16-L78) hook remains unchanged
- Original [exotel-service.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/lib/services/exotel-service.ts) remains unchanged
- New calling implementation files remain unchanged for future use

This ensures that if any issues arise with the LiveKit implementation, the system can be quickly reverted to the previous working version.

### Testing the LiveKit Implementation
1. Navigate to the Assistants page
2. Select an assistant
3. Click on the "Web assistant" mode in the dual button
4. Optionally add user information using the "Add" button
5. Click "Start Session"
6. The system will make a POST request to `/api/livekit-dispatch` which creates a LiveKit dispatch with the provided metadata and assistant prompt

### Curl Example (LiveKit Dispatch)
```bash
curl -X POST "http://localhost:3000/api/livekit-dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "assistant-room-123",
    "agentName": "Test Assistant",
    "calleeInfo": {
      "name": "John Doe",
      "company": "Acme Corp",
      "priority": "high"
    },
    "assistantId": "assistant-uuid"
  }'
```