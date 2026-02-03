// hooks/use-livekit-web-assistant.ts
'use client';

import { useState, useCallback } from 'react';

interface CalleeInfo {
  [key: string]: string;
}

interface UseLiveKitWebAssistantProps {
  assistantId: string;
  assistantName: string;
}

interface UseLiveKitWebAssistantReturn {
  isConnecting: boolean;
  isConnected: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected';
  startSession: (calleeInfo: CalleeInfo) => Promise<void>;
  endSession: () => void;
  error: Error | null;
  errorMessage?: string | null;
}

export function useLiveKitWebAssistant({
  assistantId,
  assistantName,
}: UseLiveKitWebAssistantProps): UseLiveKitWebAssistantReturn {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected'>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Start LiveKit session
  const startSession = useCallback(async (calleeInfo: CalleeInfo) => {
    console.log('[useLiveKitWebAssistant] Starting session with assistant', assistantId, `(${assistantName})`, 'and calleeInfo:', calleeInfo);
    
    try {
      setConnectionStatus('connecting');
      
      // Generate a unique room name (you might want to use a more sophisticated approach)
      const roomName = `assistant-${assistantId}-${Date.now()}`;
      
      console.log('[useLiveKitWebAssistant] Calling createLiveKitDispatch with:', { 
        roomName, 
        agentName: assistantName,
        calleeInfo,
      });
      
      const response = await fetch('/api/livekit-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          agentName: assistantName,
          calleeInfo,
          assistantId,
        }),
      });

      console.log('[useLiveKitWebAssistant] LiveKit dispatch response:', response);

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to create LiveKit dispatch';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[useLiveKitWebAssistant] LiveKit dispatch created successfully:', data);
      
      setConnectionStatus('connected');
      setError(null);
      
      // Here you would typically initialize the LiveKit client to connect to the room
      // For now, we'll just simulate a successful connection
      
    } catch (err) {
      setConnectionStatus('failed');
      setError(err instanceof Error ? err : new Error('Unknown error starting LiveKit session'));
      console.error('[useLiveKitWebAssistant] Error starting LiveKit session:', err);
    }
  }, [assistantId, assistantName]);

  // End the session
  const endSession = useCallback(() => {
    console.log('[useLiveKitWebAssistant] Ending session with assistant ' + assistantId);
    setConnectionStatus('disconnected');
  }, [assistantId]);

  return {
    isConnecting: connectionStatus === 'connecting',
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    startSession,
    endSession,
    error,
    // Add a helper for error message
    errorMessage: error ? error.message : null,
  };
}