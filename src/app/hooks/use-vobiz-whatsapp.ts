'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

export type WhatsappTemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | string;

export interface WhatsappChannel {
  id: string;
  user_uid?: string | null;
  label?: string | null;
  channel_id?: string;
  waba_id?: string;
  phone_number_id?: string;
  phone_number?: string;
  display_name?: string | null;
  connection_status?: string;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsappTemplateComponent {
  type: string;
  text?: string;
  example?: { body_text?: string[][] } & Record<string, unknown>;
  [key: string]: unknown;
}

export interface WhatsappTemplate {
  id?: string;
  name: string;
  language: string;
  category?: string;
  status?: WhatsappTemplateStatus;
  components?: WhatsappTemplateComponent[];
  rejection_reason?: string | null;
  updated_at?: string;
  provider_updated_at?: string;
}

export interface ConnectChannelPayload {
  label?: string;
  waba_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name?: string;
  access_token: string;
}

export interface ImportChannelPayload {
  channel_id: string;
  label?: string;
}

export interface CreateTemplatePayload {
  name: string;
  language: string;
  category: string;
  components: WhatsappTemplateComponent[];
}

const normalizeChannel = (raw: any): WhatsappChannel => ({
  id: raw?.id ?? raw?.connection_id ?? raw?.channel_id,
  user_uid: raw?.user_uid ?? raw?.userUid ?? null,
  label: raw?.label ?? null,
  channel_id: raw?.channel_id ?? raw?.channelId,
  waba_id: raw?.waba_id ?? raw?.wabaId,
  phone_number_id: raw?.phone_number_id ?? raw?.phoneNumberId,
  phone_number: raw?.phone_number ?? raw?.phoneNumber,
  display_name: raw?.display_name ?? raw?.displayName ?? null,
  connection_status: raw?.connection_status ?? raw?.connectionStatus,
  verification_status: raw?.verification_status ?? raw?.verificationStatus,
  created_at: raw?.created_at ?? raw?.createdAt,
  updated_at: raw?.updated_at ?? raw?.updatedAt,
});

const normalizeChannelList = (data: any): WhatsappChannel[] => {
  const list = Array.isArray(data)
    ? data
    : (data?.channels ?? data?.data ?? data?.items ?? []);

  return Array.isArray(list) ? list.map(normalizeChannel) : [];
};

const normalizeTemplate = (raw: any): WhatsappTemplate => ({
  id: raw?.id ?? raw?.template_id,
  name: raw?.name,
  language: raw?.language ?? raw?.language_code ?? 'en_US',
  category: raw?.category,
  status: raw?.status,
  components: Array.isArray(raw?.components) ? raw.components : [],
  rejection_reason: raw?.rejection_reason ?? raw?.rejectionReason ?? null,
  updated_at: raw?.updated_at ?? raw?.updatedAt,
  provider_updated_at: raw?.provider_updated_at ?? raw?.providerUpdatedAt,
});

// Provider responses vary: handle both `items` and `data` arrays defensively.
const normalizeTemplateList = (data: any): WhatsappTemplate[] => {
  const list = Array.isArray(data)
    ? data
    : (data?.items ?? data?.data ?? data?.templates ?? []);

  return Array.isArray(list) ? list.filter(Boolean).map(normalizeTemplate) : [];
};

/**
 * Vobiz WhatsApp channels + templates.
 *
 * Auth/ingress: calls the backend directly through `MONADE_API_BASE`
 * (the `db_services` ingress prefix) with the better-auth session cookie,
 * exactly like `usePostProcessingTemplates` / `useRagCorpus`.
 */
export function useVobizWhatsapp() {
  const { userUid, loading: authLoading } = useMonadeUser();
  const [channels, setChannels] = useState<WhatsappChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchChannels = useCallback(async (): Promise<WhatsappChannel[]> => {
    if (!userUid) {
      setChannels([]);
      setLoadingChannels(false);

      return [];
    }

    try {
      setLoadingChannels(true);
      const data = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels`,
        { retry: { retries: 1 } },
      );
      const list = normalizeChannelList(data);
      setChannels(list);

      return list;
    } catch (err) {
      console.error('[useVobizWhatsapp] fetchChannels error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load WhatsApp channels');

      return [];
    } finally {
      setLoadingChannels(false);
    }
  }, [userUid]);

  const connectChannel = useCallback(async (payload: ConnectChannelPayload): Promise<WhatsappChannel | null> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          retry: { retries: 0 },
        },
      );
      toast.success('WhatsApp number connected');
      await fetchChannels();

      return result?.channel ? normalizeChannel(result.channel) : null;
    } catch (err) {
      console.error('[useVobizWhatsapp] connectChannel error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to connect WhatsApp number');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userUid, fetchChannels]);

  const importChannel = useCallback(async (payload: ImportChannelPayload): Promise<WhatsappChannel | null> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          retry: { retries: 0 },
        },
      );
      toast.success('Channel imported');
      await fetchChannels();

      return result?.channel ? normalizeChannel(result.channel) : null;
    } catch (err) {
      console.error('[useVobizWhatsapp] importChannel error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to import channel');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userUid, fetchChannels]);

  const syncChannel = useCallback(async (connectionId: string): Promise<void> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      await fetchJson(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels/${encodeURIComponent(connectionId)}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          retry: { retries: 0 },
        },
      );
      toast.success('Channel status refreshed');
      await fetchChannels();
    } catch (err) {
      console.error('[useVobizWhatsapp] syncChannel error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh channel');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userUid, fetchChannels]);

  const fetchTemplates = useCallback(async (
    connectionId: string,
    status?: WhatsappTemplateStatus,
  ): Promise<WhatsappTemplate[]> => {
    if (!userUid || !connectionId) return [];

    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await fetchJson<any>(
      `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels/${encodeURIComponent(connectionId)}/templates${query}`,
      { retry: { retries: 1 } },
    );

    return normalizeTemplateList(data);
  }, [userUid]);

  const syncTemplates = useCallback(async (connectionId: string): Promise<void> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      await fetchJson(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels/${encodeURIComponent(connectionId)}/templates/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          retry: { retries: 0 },
        },
      );
      toast.success('Templates synced from Meta');
    } catch (err) {
      console.error('[useVobizWhatsapp] syncTemplates error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sync templates');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userUid]);

  const createTemplate = useCallback(async (
    connectionId: string,
    payload: CreateTemplatePayload,
  ): Promise<WhatsappTemplate | null> => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      const result = await fetchJson<any>(
        `${API_BASE}/api/users/${encodeURIComponent(userUid)}/vobiz-whatsapp/channels/${encodeURIComponent(connectionId)}/templates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          retry: { retries: 0 },
        },
      );
      toast.success('Template submitted for approval');

      return result?.template ? normalizeTemplate(result.template) : (result ? normalizeTemplate(result) : null);
    } catch (err) {
      console.error('[useVobizWhatsapp] createTemplate error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit template');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userUid]);

  useEffect(() => {
    if (!authLoading) {
      fetchChannels().catch(() => undefined);
    }
  }, [authLoading, fetchChannels]);

  return {
    channels,
    loadingChannels,
    saving,
    fetchChannels,
    connectChannel,
    importChannel,
    syncChannel,
    fetchTemplates,
    syncTemplates,
    createTemplate,
  };
}
