// hooks/use-new-phone-assistant.ts
'use client';

import { useState, useCallback } from 'react';
import { initiateNewCall } from '@/lib/services/new-calling-service';

interface CalleeInfo {
  [key: string]: string;
}

interface UseNewPhoneAssistantProps {
  assistantId: string;
  assistantName: string;
}

interface UseNewPhoneAssistantReturn {
  isCallInProgress: boolean;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  startCall: (phoneNumber: string, calleeInfo: CalleeInfo) => Promise<void>;
  endCall: () => void;
  error: Error | null;
  errorMessage?: string | null;
}

export function useNewPhoneAssistant({
  assistantId,
  assistantName,
}: UseNewPhoneAssistantProps): UseNewPhoneAssistantReturn {
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed'>('idle');
  const [remainingTime, setRemainingTime] = useState(15);
  const [error, setError] = useState<Error | null>(null);

  // Real API call to initiate phone call
  const startCall = useCallback(async (phoneNumber: string, calleeInfo: CalleeInfo) => {
    console.log('[useNewPhoneAssistant] Initiating call to', phoneNumber, 'with assistant', assistantId, `(${assistantName})`, 'and calleeInfo:', calleeInfo);
    if (!phoneNumber) {
      setError(new Error('Phone number is required'));
      console.error('[useNewPhoneAssistant] No phone number provided');
      return;
    }

    try {
      setCallStatus('initiating');
      setRemainingTime(15);

      console.log('[useNewPhoneAssistant] Calling initiateNewCall with:', { phone_number: phoneNumber, callee_info: calleeInfo, assistant_id: assistantId });
      const response = await initiateNewCall({
        phone_number: phoneNumber,
        callee_info: calleeInfo,
        assistant_id: assistantId,
      });

      // Log response
      console.log('[useNewPhoneAssistant] initiateNewCall response:', response);

      if (response.ok) {
        setCallStatus('connecting');
        // Optionally, parse response for more status info
        // const data = await response.json();
        // handle data if needed
      } else {
        setCallStatus('failed');
        const errorText = await response.text();
        setError(new Error(errorText));
        console.error('[useNewPhoneAssistant] Call failed, response not ok:', errorText);
        return;
      }

      setError(null);
    } catch (err) {
      setCallStatus('failed');
      setError(err instanceof Error ? err : new Error('Unknown error initiating call'));
      console.error('[useNewPhoneAssistant] Error initiating phone call:', err);
    }
  }, [assistantId, assistantName]);

  // End the call
  const endCall = useCallback(() => {
    if (callStatus === 'idle' || callStatus === 'completed') {
      return;
    }
    console.log('[useNewPhoneAssistant] Ending call with assistant ' + assistantId);
    setCallStatus('completed');
    setRemainingTime(0);
  }, [assistantId, callStatus]);

  return {
    isCallInProgress: callStatus === 'connecting' || callStatus === 'connected',
    isCallInitiating: callStatus === 'initiating',
    callStatus,
    remainingTime,
    startCall,
    endCall,
    error,
    // Add a helper for error message
    errorMessage: error ? error.message : null,
  };
}