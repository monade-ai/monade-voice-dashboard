'use client';

import { useState, useEffect, useCallback } from 'react';

import { ApiError, fetchJson } from '@/lib/http';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

// Trunk API base URL
const TRUNK_API_BASE = '/api/proxy-trunks';
const API_BASE_URL = MONADE_API_CONFIG.BASE_URL;

export interface SipTrunk {
    id: string;
    name: string;
    address: string;
    numbers: string[];
    auth_username?: string;
}

export interface PhoneNumberOption {
    number: string;
    trunkName: string;
    trunkId: string;
    assignedAssistantId?: string | null;
    assignedAssistantName?: string | null;
}

// Fallback numbers when API is unavailable
const FALLBACK_NUMBERS: PhoneNumberOption[] = [
  { number: '+13157918262', trunkName: 'Twilio', trunkId: 'twilio-default', assignedAssistantId: null, assignedAssistantName: null },
  { number: '918071387364', trunkName: 'Vobiz', trunkId: 'vobiz-default', assignedAssistantId: null, assignedAssistantName: null },
];

// Helper to check if a phone number is assigned to an assistant
async function getPhoneAssignment(phoneNumber: string): Promise<{ assistantId: string; assistantName: string } | null> {
  try {
    const assistant = await fetchJson<any>(
      `${API_BASE_URL}/api/assistants/phone/${encodeURIComponent(phoneNumber)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      assistantId: assistant.id,
      assistantName: assistant.name,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    console.log('[useTrunks] Phone not assigned:', phoneNumber);

    return null;
  }
}

// Deallocate a phone number from an assistant (set it to empty string)
export async function deallocatePhoneNumber(assistantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[useTrunks] Deallocating phone from assistant:', assistantId);
    await fetchJson(`${API_BASE_URL}/api/assistants/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber: '' }),
      retry: { retries: 0 },
    });

    return { success: true };
  } catch (err) {
    console.error('[useTrunks] Deallocation error:', err);

    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function useTrunks(options?: { checkAssignments?: boolean }) {
  const shouldCheckAssignments = options?.checkAssignments !== false;
  const [trunks, setTrunks] = useState<SipTrunk[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberOption[]>(FALLBACK_NUMBERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingAssignments, setCheckingAssignments] = useState(false);

  // Check phone number assignments (runs in background)
  const checkAssignmentsForNumbers = useCallback(async (numbers: PhoneNumberOption[]) => {
    setCheckingAssignments(true);
    console.log('[useTrunks] Checking assignments for', numbers.length, 'phone numbers...');

    try {
      // Check assignments in parallel (limit concurrency to avoid overwhelming API)
      const assignmentPromises = numbers.map(async (phone) => {
        const assignment = await getPhoneAssignment(phone.number);

        return {
          ...phone,
          assignedAssistantId: assignment?.assistantId || null,
          assignedAssistantName: assignment?.assistantName || null,
        };
      });

      const numbersWithAssignments = await Promise.all(assignmentPromises);
      console.log('[useTrunks] Assignment check complete:', numbersWithAssignments);
      setPhoneNumbers(numbersWithAssignments);
    } catch (err) {
      console.error('[useTrunks] Error checking assignments:', err);
    } finally {
      setCheckingAssignments(false);
    }
  }, []);

  const fetchTrunks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<any>(`${TRUNK_API_BASE}/trunks`);

      // Handle both array and object response formats
      const trunksList = Array.isArray(data) ? data : (data.trunks && Array.isArray(data.trunks) ? data.trunks : []);

      if (trunksList.length > 0 || (data.trunks && Array.isArray(data.trunks))) {
        setTrunks(trunksList);

        // Extract all phone numbers from all trunks
        const numbers: PhoneNumberOption[] = [];
        trunksList.forEach((trunk: SipTrunk) => {
          trunk.numbers?.forEach((num: string) => {
            numbers.push({
              number: num,
              trunkName: trunk.name,
              trunkId: trunk.id,
              assignedAssistantId: null,
              assignedAssistantName: null,
            });
          });
        });

        // If we got numbers from API, use them; otherwise use fallback
        const phoneList = numbers.length > 0 ? numbers : FALLBACK_NUMBERS;
        setPhoneNumbers(phoneList);

        if (shouldCheckAssignments) {
          // Check assignments in background (don't block UI)
          checkAssignmentsForNumbers(phoneList);
        }
      } else {
        console.log('[useTrunks] No trunks found in response:', data);
        setPhoneNumbers(FALLBACK_NUMBERS);
      }
    } catch (err) {
      console.error('[useTrunks] Error fetching trunks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trunks');
      // Use fallback on error
      setPhoneNumbers(FALLBACK_NUMBERS);
    } finally {
      setLoading(false);
    }
  }, [checkAssignmentsForNumbers]);

  // Refresh assignments only (without re-fetching trunks)
  const refreshAssignments = useCallback(() => {
    if (!shouldCheckAssignments) return;
    checkAssignmentsForNumbers(phoneNumbers);
  }, [phoneNumbers, checkAssignmentsForNumbers, shouldCheckAssignments]);

  useEffect(() => {
    fetchTrunks();
  }, [fetchTrunks]);

  return {
    trunks,
    phoneNumbers,
    loading,
    error,
    checkingAssignments,
    refetch: fetchTrunks,
    refreshAssignments,
  };
}

// Make outbound call via trunk
export async function makeCallViaTrunk(
  phoneNumber: string,
  trunkName: string,
  assistantName: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const data = await fetchJson<any>(`${TRUNK_API_BASE}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        trunk_name: trunkName,
        assistant_name: assistantName,
        metadata: metadata || {},
      }),
      retry: { retries: 0 },
    });

    return { success: true, message: data.message || 'Call initiated' };
  } catch (error) {
    console.error('[makeCallViaTrunk] Error:', error);

    return { success: false, error: error instanceof Error ? error.message : 'Failed to initiate call' };
  }
}
