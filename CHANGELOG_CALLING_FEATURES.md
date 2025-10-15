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

### Technical Implementation Details

#### Proxy API Architecture
To avoid CORS issues when calling the external service from the browser, we implemented a proxy API route:

1. The frontend calls `/api/calling` with the phone number and callee information
2. The Next.js API route forwards the request to `http://34.47.175.17:8000/outbound-call/{phone_number}`
3. The response is returned to the frontend through the same channel

#### New API Endpoint
- **URL**: `/api/calling` (proxy to `http://34.47.175.17:8000/outbound-call/{phone_number}`)
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Payload Structure**:
  ```json
  {
    "phone_number": "+919122833772",
    "callee_info": {
      "key1": "value1",
      "key2": "value2"
      // ... additional key-value pairs
    }
  }
  ```

#### Environment Configuration
- Added new environment variable: `NEXT_PUBLIC_CALLING_SERVICE_URL`
- Default value: `http://34.47.175.17:8000`
- Can be overridden in environment configuration

#### File Structure
New files created:
- [src/app/assistants/components/new-phone-dialog.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/new-phone-dialog.tsx)
- [src/app/assistants/components/new-assistant-dual-button.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/new-assistant-dual-button.tsx)
- [src/app/hooks/use-new-phone-assistant.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/hooks/use-new-phone-assistant.ts)
- [src/lib/services/new-calling-service.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/lib/services/new-calling-service.ts)
- [src/app/api/calling/route.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/api/calling/route.ts)

### How to Switch Between Implementations

#### To Use the New Implementation (Currently Active)
The new implementation is currently active in the UI. No additional steps needed.

#### To Switch Back to the Old Implementation
1. Edit [src/app/assistants/components/assistant-tabs.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/assistant-tabs.tsx)
2. Find the import statement:
   ```typescript
   import NewAssistantDualButton from './new-assistant-dual-button';
   ```
3. Replace the component usage:
   ```typescript
   // Change this line:
   <NewAssistantDualButton assistant={currentAssistant} />
   
   // To this:
   <AssistantDualButton assistant={currentAssistant} />
   ```

#### To Switch to the New Implementation (if reverted back)
1. Edit [src/app/assistants/components/assistant-tabs.tsx](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/assistant-tabs.tsx)
2. Ensure the import statement exists:
   ```typescript
   import NewAssistantDualButton from './new-assistant-dual-button';
   ```
3. Replace the component usage:
   ```typescript
   // Change this line:
   <AssistantDualButton assistant={currentAssistant} />
   
   // To this:
   <NewAssistantDualButton assistant={currentAssistant} />
   ```

### Backward Compatibility
All original files and implementations have been preserved:
- Original [PhoneDialog](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/phone-dialog.tsx#L17-L180) component remains unchanged
- Original [AssistantDualButton](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/assistants/components/assistant-dual-button.tsx#L27-L83) component remains unchanged
- Original [usePhoneAssistant](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/app/hooks/use-phone-assistant.ts#L16-L78) hook remains unchanged
- Original [exotel-service.ts](file:///mnt/e/monade_dashboard/monade-voice-dashboard/src/lib/services/exotel-service.ts) remains unchanged

This ensures that if any issues arise with the new implementation, the system can be quickly reverted to the previous working version.

### Testing the New Implementation
1. Navigate to the Assistants page
2. Select an assistant
3. Click on the "Phone assistant" mode in the dual button
4. Enter a phone number (e.g., 9122833772 or +919122833772)
5. Optionally add callee information using the "Add" button
6. Click "Call"
7. The system will make a POST request to `/api/calling` which forwards to `http://34.47.175.17:8000/outbound-call/+919122833772` with the metadata payload

### Debugging API Responses

To see the actual API responses in the console:

1. Open the browser's developer tools (F12)
2. Go to the Console tab
3. Look for log messages with the following prefixes:
   - `[NewCallingService]` - Frontend service logs
   - `[Calling API Route]` - Backend proxy API logs

These logs will show:
- Request payloads being sent
- Response statuses received
- Response bodies from the calling service
- Error messages if any occur

### Curl Example (Direct)
```bash
curl -X POST "http://34.47.175.17:8000/outbound-call/+9122833772" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "Amol",
      "company": "Acme Corp",
      "priority": "high"
    }
  }'
```

### Curl Example (Through Proxy API)
```bash
curl -X POST "http://localhost:3000/api/calling" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+919122833772",
    "callee_info": {
      "name": "Amol",
      "company": "Acme Corp",
      "priority": "high"
    }
  }'
```