// hooks/use-phone-assistant.ts
'use client';

import { useState, useCallback } from 'react';

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
}

export function usePhoneAssistant({
  assistantId,
  assistantName
}: UsePhoneAssistantProps): UsePhoneAssistantReturn {
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed'>('idle');
  const [remainingTime, setRemainingTime] = useState(15);
  const [error, setError] = useState<Error | null>(null);

  // Simulate API call to initiate phone call
  const startCall = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber) {
      setError(new Error('Phone number is required'));
      return;
    }

    try {
      setCallStatus('initiating');
      
      // Countdown simulation (would be replaced with actual API call)
      setRemainingTime(15);
      
      // Simulate API call
      console.log(`Initiating call to ${phoneNumber} with assistant ${assistantId} (${assistantName})`);
      
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful response
      const mockResponse = {
        success: true,
        callId: `call-${Date.now()}`,
        status: 'connecting'
      };
      
      if (mockResponse.success) {
        setCallStatus('connecting');
        
        // After a delay, simulate connected call
        setTimeout(() => {
          setCallStatus('connected');
        }, 5000);
      } else {
        throw new Error('Failed to initiate call');
      }
      
      setError(null);
    } catch (err) {
      setCallStatus('failed');
      setError(err instanceof Error ? err : new Error('Unknown error initiating call'));
      console.error('Error initiating phone call:', err);
    }
  }, [assistantId, assistantName]);

  // End the call
  const endCall = useCallback(() => {
    if (callStatus === 'idle' || callStatus === 'completed') {
      return;
    }
    
    console.log(`Ending call with assistant ${assistantId}`);
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
    error
  };
}