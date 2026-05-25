'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

export interface WhatsappInboxThread {
  thread_id: string;
  user_uid?: string;
  waba_id?: string | null;
  channel_id?: string | null;
  whatsapp_channel_connection_id?: string | null;
  phone: string;
  last_message_at?: string | null;
  last_direction?: string | null;
  last_sender?: 'user' | 'bot' | 'template' | 'status' | string | null;
  last_status?: string | null;
  last_text?: string | null;
  channel?: {
    id?: string;
    label?: string | null;
    display_name?: string | null;
    phone_number?: string | null;
    channel_id?: string | null;
    waba_id?: string | null;
    connection_status?: string | null;
  } | null;
}

export interface WhatsappInboxMessage {
  id: string;
  thread_id: string;
  user_uid?: string;
  waba_id?: string | null;
  channel_id?: string | null;
  direction?: 'inbound' | 'outbound' | string | null;
  sender?: 'user' | 'bot' | 'template' | 'status' | string | null;
  text?: string | null;
  message_type?: string | null;
  status?: string | null;
  provider_message_id?: string | null;
  meta_message_id?: string | null;
  conversation_id?: string | null;
  created_at?: string | null;
}

export interface InboxPagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface InboxThreadFilters {
  connection_id?: string;
  waba_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

const normalizeThread = (raw: any): WhatsappInboxThread => ({
  thread_id: raw?.thread_id ?? raw?.threadId,
  user_uid: raw?.user_uid ?? raw?.userUid,
  waba_id: raw?.waba_id ?? raw?.wabaId ?? null,
  channel_id: raw?.channel_id ?? raw?.channelId ?? null,
  whatsapp_channel_connection_id: raw?.whatsapp_channel_connection_id ?? raw?.whatsappChannelConnectionId ?? null,
  phone: raw?.phone ?? raw?.customer_phone ?? '',
  last_message_at: raw?.last_message_at ?? raw?.lastMessageAt ?? null,
  last_direction: raw?.last_direction ?? raw?.lastDirection ?? null,
  last_sender: raw?.last_sender ?? raw?.lastSender ?? null,
  last_status: raw?.last_status ?? raw?.lastStatus ?? null,
  last_text: raw?.last_text ?? raw?.lastText ?? null,
  channel: raw?.channel ?? null,
});

const normalizeMessage = (raw: any): WhatsappInboxMessage => ({
  id: raw?.id ?? raw?.message_id,
  thread_id: raw?.thread_id ?? raw?.threadId,
  user_uid: raw?.user_uid ?? raw?.userUid,
  waba_id: raw?.waba_id ?? raw?.wabaId ?? null,
  channel_id: raw?.channel_id ?? raw?.channelId ?? null,
  direction: raw?.direction ?? null,
  sender: raw?.sender ?? null,
  text: raw?.text ?? raw?.body ?? null,
  message_type: raw?.message_type ?? raw?.messageType ?? null,
  status: raw?.status ?? null,
  provider_message_id: raw?.provider_message_id ?? raw?.providerMessageId ?? null,
  meta_message_id: raw?.meta_message_id ?? raw?.metaMessageId ?? null,
  conversation_id: raw?.conversation_id ?? raw?.conversationId ?? null,
  created_at: raw?.created_at ?? raw?.createdAt ?? null,
});

const normalizePagination = (raw: any): InboxPagination => ({
  total: Number(raw?.total ?? 0),
  limit: Number(raw?.limit ?? 0),
  offset: Number(raw?.offset ?? 0),
  has_more: Boolean(raw?.has_more ?? raw?.hasMore),
});

export function useWhatsappInbox() {
  const { userUid } = useMonadeUser();
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [clearingThreadId, setClearingThreadId] = useState<string | null>(null);

  const fetchThreads = useCallback(async (
    filters?: InboxThreadFilters,
  ): Promise<{ threads: WhatsappInboxThread[]; pagination: InboxPagination | null }> => {
    if (!userUid) return { threads: [], pagination: null };

    try {
      setLoadingThreads(true);
      const params = new URLSearchParams();
      if (filters?.connection_id) params.set('connection_id', filters.connection_id);
      if (filters?.waba_id) params.set('waba_id', filters.waba_id);
      if (filters?.q) params.set('q', filters.q);
      if (typeof filters?.limit === 'number') params.set('limit', String(filters.limit));
      if (typeof filters?.offset === 'number') params.set('offset', String(filters.offset));
      const query = params.toString();
      const data = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/inbox/threads${query ? `?${query}` : ''}`,
        { retry: { retries: 1 } },
      );

      return {
        threads: Array.isArray(data?.threads) ? data.threads.map(normalizeThread) : [],
        pagination: data?.pagination ? normalizePagination(data.pagination) : null,
      };
    } catch (error) {
      console.error('[useWhatsappInbox] fetchThreads error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load WhatsApp inbox threads');

      return { threads: [], pagination: null };
    } finally {
      setLoadingThreads(false);
    }
  }, [userUid]);

  const fetchMessages = useCallback(async (
    threadId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ messages: WhatsappInboxMessage[]; pagination: InboxPagination | null }> => {
    if (!userUid || !threadId) return { messages: [], pagination: null };

    try {
      setLoadingMessages(true);
      const params = new URLSearchParams();
      if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
      if (typeof options?.offset === 'number') params.set('offset', String(options.offset));
      const query = params.toString();
      const data = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/inbox/threads/${encodeURIComponent(threadId)}/messages${query ? `?${query}` : ''}`,
        { retry: { retries: 1 } },
      );

      const list = Array.isArray(data?.messages)
        ? data.messages
        : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));

      return {
        messages: list.map(normalizeMessage),
        pagination: data?.pagination ? normalizePagination(data.pagination) : null,
      };
    } catch (error) {
      console.error('[useWhatsappInbox] fetchMessages error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load WhatsApp messages');

      return { messages: [], pagination: null };
    } finally {
      setLoadingMessages(false);
    }
  }, [userUid]);

  const clearThreadById = useCallback(async (threadId: string): Promise<void> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setClearingThreadId(threadId);
      await fetchJson(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/inbox/threads/${encodeURIComponent(threadId)}`,
        {
          method: 'DELETE',
          retry: { retries: 0 },
        },
      );
      toast.success('Chat context cleared');
    } catch (error) {
      console.error('[useWhatsappInbox] clearThreadById error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear thread');
      throw error;
    } finally {
      setClearingThreadId(null);
    }
  }, [userUid]);

  const clearThreadByChannelPhone = useCallback(async (connectionId: string, phone: string): Promise<void> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setClearingThreadId(`${connectionId}:${phone}`);
      await fetchJson(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/inbox/channels/${encodeURIComponent(connectionId)}/phones/${encodeURIComponent(phone)}`,
        {
          method: 'DELETE',
          retry: { retries: 0 },
        },
      );
      toast.success('Chat context cleared');
    } catch (error) {
      console.error('[useWhatsappInbox] clearThreadByChannelPhone error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear thread');
      throw error;
    } finally {
      setClearingThreadId(null);
    }
  }, [userUid]);

  return {
    loadingThreads,
    loadingMessages,
    clearingThreadId,
    fetchThreads,
    fetchMessages,
    clearThreadById,
    clearThreadByChannelPhone,
  };
}
