// hooks/use-phone-assistant.ts
'use client';

import { useState, useCallback } from 'react';
import { initiateExotelCall } from '@/lib/services/exotel-service';

interface UsePhoneAssistantProps {
  assistantId: string;
  assistantName: string;
}

interface UsePhoneAssistantReturn {
  isCallInProgress: boolean;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  startCall: (phoneNumber: string) => Promise<void>;
  endCall: () => void;
  error: Error | null;
  errorMessage?: string | null;
}

export function usePhoneAssistant({
  assistantId,
  assistantName,
}: UsePhoneAssistantProps): UsePhoneAssistantReturn {
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed'>('idle');
  const [remainingTime, setRemainingTime] = useState(15);
  const [error, setError] = useState<Error | null>(null);

  // Real API call to initiate phone call
  const startCall = useCallback(async (phoneNumber: string) => {
    console.log('[usePhoneAssistant] Initiating call to', phoneNumber, 'with assistant', assistantId, `(${assistantName})`);
    if (!phoneNumber) {
      setError(new Error('Phone number is required'));
      console.error('[usePhoneAssistant] No phone number provided');
      return;
    }

    try {
      setCallStatus('initiating');
      setRemainingTime(15);

      // Always use the real callback URL from env or fallback
      const callbackUrl =
        typeof window !== 'undefined' && process.env.NEXT_PUBLIC_EXOTEL_CALLBACK_URL
          ? process.env.NEXT_PUBLIC_EXOTEL_CALLBACK_URL
          : (typeof window !== 'undefined'
              ? window.location.origin + '/api/exotel/hook'
              : 'https://your-callback-url.example.com/exotel-hook');
      console.log('[usePhoneAssistant] Calling initiateExotelCall with:', { phone_number: phoneNumber, callback_url: callbackUrl });
      const response = await initiateExotelCall({
        phone_number: phoneNumber,
        callback_url: callbackUrl,
      });

      // Log response
      console.log('[usePhoneAssistant] initiateExotelCall response:', response);

      if (response.ok) {
        setCallStatus('connecting');
        // Optionally, parse response for more status info
        // const data = await response.json();
        // handle data if needed
      } else {
        setCallStatus('failed');
        const errorText = await response.text();
        setError(new Error(errorText));
        console.error('[usePhoneAssistant] Call failed, response not ok:', errorText);
        return;
      }

      setError(null);
    } catch (err) {
      setCallStatus('failed');
      setError(err instanceof Error ? err : new Error('Unknown error initiating call'));
      console.error('[usePhoneAssistant] Error initiating phone call:', err);
    }
  }, [assistantId, assistantName]);

  // End the call
  const endCall = useCallback(() => {
    if (callStatus === 'idle' || callStatus === 'completed') {
      return;
    }
    console.log('[usePhoneAssistant] Ending call with assistant ' + assistantId);
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
