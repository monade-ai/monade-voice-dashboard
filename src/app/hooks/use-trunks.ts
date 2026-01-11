'use client';

import { useState, useEffect, useCallback } from 'react';

// Trunk API base URL
const TRUNK_API_BASE = '/api/proxy-trunks';

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
}

// Fallback numbers when API is unavailable
const FALLBACK_NUMBERS: PhoneNumberOption[] = [
    { number: '+13157918262', trunkName: 'Twilio', trunkId: 'twilio-default' },
    { number: '918071387364', trunkName: 'Vobiz', trunkId: 'vobiz-default' },
];

export function useTrunks() {
    const [trunks, setTrunks] = useState<SipTrunk[]>([]);
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberOption[]>(FALLBACK_NUMBERS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrunks = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${TRUNK_API_BASE}/trunks`);

            if (!response.ok) {
                // API unavailable, use fallback
                console.log('[useTrunks] API unavailable, using fallback numbers');
                setPhoneNumbers(FALLBACK_NUMBERS);
                setLoading(false);
                return;
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setTrunks(data);

                // Extract all phone numbers from all trunks
                const numbers: PhoneNumberOption[] = [];
                data.forEach((trunk: SipTrunk) => {
                    trunk.numbers?.forEach((num: string) => {
                        numbers.push({
                            number: num,
                            trunkName: trunk.name,
                            trunkId: trunk.id,
                        });
                    });
                });

                // If we got numbers from API, use them; otherwise use fallback
                setPhoneNumbers(numbers.length > 0 ? numbers : FALLBACK_NUMBERS);
            } else {
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
    }, []);

    useEffect(() => {
        fetchTrunks();
    }, [fetchTrunks]);

    return {
        trunks,
        phoneNumbers,
        loading,
        error,
        refetch: fetchTrunks,
    };
}

// Make outbound call via trunk
export async function makeCallViaTrunk(
    phoneNumber: string,
    trunkName: string,
    assistantName: string,
    metadata?: Record<string, unknown>
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${TRUNK_API_BASE}/calls`, {
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
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || data.message || 'Failed to initiate call' };
        }

        return { success: true, message: data.message || 'Call initiated' };
    } catch (error) {
        console.error('[makeCallViaTrunk] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to initiate call' };
    }
}
