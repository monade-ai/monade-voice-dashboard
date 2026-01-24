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
  apiKey: string | null;  // User's API key for billing
}

interface UseNewPhoneAssistantReturn {
  isCallInProgress: boolean;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  startCall: (phoneNumber: string, calleeInfo: CalleeInfo, trunkName: string) => Promise<void>;
  endCall: () => void;
  error: Error | null;
  errorMessage?: string | null;
}

export function useNewPhoneAssistant({
  assistantId,
  assistantName,
  apiKey,
}: UseNewPhoneAssistantProps): UseNewPhoneAssistantReturn {
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed'>('idle');
  const [remainingTime, setRemainingTime] = useState(15);
  const [error, setError] = useState<Error | null>(null);

  // Real API call to initiate phone call
  const startCall = useCallback(async (phoneNumber: string, calleeInfo: CalleeInfo, trunkName: string) => {
    console.log('[useNewPhoneAssistant] Initiating call to', phoneNumber, 'with assistant', assistantId, `(${assistantName})`, 'trunk:', trunkName);

    if (!phoneNumber) {
      setError(new Error('Phone number is required'));
      console.error('[useNewPhoneAssistant] No phone number provided');
      return;
    }

    if (!apiKey) {
      setError(new Error('API key is required for billing. Please ensure you have an API key configured.'));
      console.error('[useNewPhoneAssistant] No API key provided');
      setCallStatus('failed');
      return;
    }

    if (!trunkName) {
      setError(new Error('Please select a trunk (Twilio or Vobiz) to make the call.'));
      console.error('[useNewPhoneAssistant] No trunk selected');
      setCallStatus('failed');
      return;
    }

    try {
      setCallStatus('initiating');
      setRemainingTime(15);
      setError(null);

      console.log('[useNewPhoneAssistant] Calling initiateNewCall with:', {
        phone_number: phoneNumber,
        callee_info: calleeInfo,
        assistant_id: assistantId,
        trunk_name: trunkName,
        api_key: apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT PROVIDED'
      });

      const response = await initiateNewCall({
        phone_number: phoneNumber,
        callee_info: calleeInfo,
        assistant_id: assistantId,
        trunk_name: trunkName,  // 'twilio' or 'vobiz'
        api_key: apiKey,        // User's API key for billing
      });

      console.log('[useNewPhoneAssistant] initiateNewCall response:', response);

      if (response.ok) {
        setCallStatus('connecting');
        // Parse response for call details
        try {
          const data = await response.json();
          console.log('[useNewPhoneAssistant] Call initiated successfully:', data);
        } catch {
          // Response might not be JSON, that's ok
        }
      } else {
        setCallStatus('failed');
        const errorText = await response.text();
        setError(new Error(errorText));
        console.error('[useNewPhoneAssistant] Call failed, response not ok:', errorText);
        return;
      }

    } catch (err) {
      setCallStatus('failed');
      setError(err instanceof Error ? err : new Error('Unknown error initiating call'));
      console.error('[useNewPhoneAssistant] Error initiating phone call:', err);
    }
  }, [assistantId, assistantName, apiKey]);

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
    errorMessage: error ? error.message : null,
  };
}