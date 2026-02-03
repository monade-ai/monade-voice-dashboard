/**
 * LiveKit Service - Handles LiveKit voice agent connections
 */

import { fetchJson } from '@/lib/http';

const LIVEKIT_DISPATCH_URL = process.env.LIVEKIT_DISPATCH_URL || 'https://monade-voice-agent-livekit-worker-1098621876975.us-central1.run.app';

export interface LiveKitConnectionDetails {
    roomName: string;
    participantToken: string;
    serverUrl: string;
}

export interface DispatchCallParams {
    phone_number: string;
    assistant_id: string;
    callee_info?: Record<string, string>;
}

/**
 * Request a LiveKit room connection for a voice call
 */
export async function dispatchCall(params: DispatchCallParams): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('[LiveKitService] Dispatching call:', params);

    const data = await fetchJson<any>(`${LIVEKIT_DISPATCH_URL}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: params.phone_number,
        assistant_id: params.assistant_id,
        callee_info: params.callee_info || {},
      }),
      retry: { retries: 0 },
    });
    console.log('[LiveKitService] Dispatch successful:', data);

    return { success: true, data };
  } catch (error) {
    console.error('[LiveKitService] Error dispatching call:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get agent connection details for a LiveKit room
 */
export async function getAgentConnectionDetails(roomName: string): Promise<LiveKitConnectionDetails | null> {
  try {
    return await fetchJson<LiveKitConnectionDetails>(
      `${LIVEKIT_DISPATCH_URL}/connection-details?roomName=${encodeURIComponent(roomName)}`,
    );
  } catch (error) {
    console.error('[LiveKitService] Error getting connection details:', error);

    return null;
  }
}

const livekitService = {
  dispatchCall,
  getAgentConnectionDetails,
};

export default livekitService;
