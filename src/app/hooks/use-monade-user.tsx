'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

interface MonadeUserContextType {
    userUid: string | null;
    email: string | null;
    apiKey: string | null;  // User's default API key for billing
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const MonadeUserContext = createContext<MonadeUserContextType>({
    userUid: null,
    email: null,
    apiKey: null,
    loading: true,
    error: null,
    refetch: async () => { },
});

export function useMonadeUser() {
    const context = useContext(MonadeUserContext);
    if (!context) {
        throw new Error('useMonadeUser must be used within a MonadeUserProvider');
    }
    return context;
}

interface MonadeUserProviderProps {
    children: React.ReactNode;
}

export function MonadeUserProvider({ children }: MonadeUserProviderProps) {
    const [userUid, setUserUid] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMonadeUser = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Get Supabase session
            const supabase = createClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('[MonadeUser] Supabase session error:', sessionError);
                setError('Failed to get session');
                setLoading(false);
                return;
            }

            if (!session?.user?.email) {
                console.log('[MonadeUser] No authenticated user');
                setUserUid(null);
                setEmail(null);
                setApiKey(null);
                setLoading(false);
                return;
            }

            const userEmail = session.user.email;
            setEmail(userEmail);
            console.log('[MonadeUser] Fetching user_uid for email:', userEmail);

            // Fetch user_uid from Monade API by email
            const response = await fetch(
                `${MONADE_API_CONFIG.BASE_URL}/api/users/email/${encodeURIComponent(userEmail)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    console.error('[MonadeUser] User not found in Monade DB for email:', userEmail);
                    setError('User account not found. Please contact admin.');
                } else {
                    console.error('[MonadeUser] API error:', response.status);
                    setError('Failed to fetch user account');
                }
                setLoading(false);
                return;
            }

            const data = await response.json();
            const uid = data.user_uid || data.user?.user_uid;

            if (uid) {
                console.log('[MonadeUser] Successfully fetched user_uid:', uid);
                setUserUid(uid);

                // Now fetch user's API keys
                try {
                    const keysResponse = await fetch(
                        `${MONADE_API_CONFIG.BASE_URL}/api/users/${uid}/api-keys`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (keysResponse.ok) {
                        const keysData = await keysResponse.json();
                        // Get the first active API key
                        const keys = Array.isArray(keysData) ? keysData : keysData.api_keys || [];
                        if (keys.length > 0) {
                            const firstKey = keys[0].key || keys[0].api_key || keys[0];
                            console.log('[MonadeUser] Found API key:', firstKey ? `${String(firstKey).substring(0, 20)}...` : 'none');
                            setApiKey(String(firstKey));
                        } else {
                            console.log('[MonadeUser] No API keys found for user');
                            setApiKey(null);
                        }
                    } else {
                        console.error('[MonadeUser] Failed to fetch API keys:', keysResponse.status);
                    }
                } catch (keyErr) {
                    console.error('[MonadeUser] Error fetching API keys:', keyErr);
                }
            } else {
                console.error('[MonadeUser] No user_uid in response:', data);
                setError('Invalid user data');
            }
        } catch (err) {
            console.error('[MonadeUser] Error fetching user:', err);
            setError('Failed to fetch user account');
        } finally {
            setLoading(false);
        }
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        fetchMonadeUser();

        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[MonadeUser] Auth state changed:', event);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchMonadeUser();
            } else if (event === 'SIGNED_OUT') {
                setUserUid(null);
                setEmail(null);
                setApiKey(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchMonadeUser]);

    return (
        <MonadeUserContext.Provider value={{ userUid, email, apiKey, loading, error, refetch: fetchMonadeUser }}>
            {children}
        </MonadeUserContext.Provider>
    );
}

