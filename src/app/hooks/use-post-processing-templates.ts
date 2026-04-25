'use client';

import { useCallback, useEffect, useState } from 'react';

import { MONADE_API_BASE } from '@/config';
import { ApiError, fetchJson } from '@/lib/http';

import { useMonadeUser } from './use-monade-user';

const TEMPLATE_CACHE_TTL_MS = 60_000;

export type TemplateFieldType = 'string' | 'number' | 'list' | 'boolean';

export interface QualificationBucket {
  key: string;
  label: string;
  description: string;
  confidence_range?: [number, number] | null;
}

export interface DataPointDefinition {
  key: string;
  label: string;
  description: string;
  type: TemplateFieldType;
}

export interface PostProcessingTemplateContent {
  user_uid?: string;
  name: string;
  description?: string;
  qualification_buckets: QualificationBucket[];
  data_points?: DataPointDefinition[];
  custom_instructions?: string[];
}

export interface PostProcessingTemplateSummary {
  id: string;
  user_uid?: string | null;
  name: string;
  description?: string | null;
  url?: string | null;
  is_system_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PostProcessingTemplate extends PostProcessingTemplateSummary {
  content?: PostProcessingTemplateContent;
}

export interface ResolvedPostProcessingTemplate {
  template_id: string | null;
  name: string;
  description?: string | null;
  url?: string | null;
  is_system_default?: boolean;
  resolved_via?: 'user_active' | 'system_default';
  content: PostProcessingTemplateContent;
}

interface TemplateListCacheEntry {
  templates: PostProcessingTemplateSummary[];
  activeTemplateId: string | null;
  cachedAt: number;
}

interface TemplateCacheEntry {
  template: PostProcessingTemplate;
  cachedAt: number;
}

interface ResolvedTemplateCacheEntry {
  template: ResolvedPostProcessingTemplate;
  cachedAt: number;
}

const templateListsByUser = new Map<string, TemplateListCacheEntry>();
const templatesById = new Map<string, TemplateCacheEntry>();
const resolvedTemplatesByUser = new Map<string, ResolvedTemplateCacheEntry>();
const listRequestsByUser = new Map<string, Promise<{ templates: PostProcessingTemplateSummary[]; activeTemplateId: string | null }>>();
const templateRequestsById = new Map<string, Promise<PostProcessingTemplate>>();
const resolvedRequestsByUser = new Map<string, Promise<ResolvedPostProcessingTemplate>>();

const isCacheFresh = (cachedAt: number) => Date.now() - cachedAt < TEMPLATE_CACHE_TTL_MS;

const normalizeTemplateResponse = (template: any): PostProcessingTemplate => ({
  id: template.id,
  user_uid: template.user_uid ?? template.userUid ?? null,
  name: template.name,
  description: template.description ?? null,
  url: template.url ?? null,
  is_system_default: Boolean(template.is_system_default ?? template.isSystemDefault),
  created_at: template.created_at ?? template.createdAt,
  updated_at: template.updated_at ?? template.updatedAt,
  content: template.content,
});

const normalizeTemplateListResponse = (response: any) => ({
  activeTemplateId: response?.active_template_id ?? response?.activeTemplateId ?? null,
  templates: Array.isArray(response?.templates)
    ? response.templates.map(normalizeTemplateResponse)
    : [],
});

const normalizeResolvedTemplateResponse = (response: any): ResolvedPostProcessingTemplate => ({
  template_id: response?.template_id ?? response?.templateId ?? null,
  name: response?.name ?? 'Default Monade Rules',
  description: response?.description ?? null,
  url: response?.url ?? null,
  is_system_default: Boolean(response?.is_system_default ?? response?.isSystemDefault),
  resolved_via: response?.resolved_via ?? response?.resolvedVia ?? 'system_default',
  content: response?.content ?? {
    name: response?.name ?? 'Default Monade Rules',
    description: response?.description ?? undefined,
    qualification_buckets: [],
    data_points: [],
    custom_instructions: [],
  },
});

const invalidateUserCaches = (userUid: string) => {
  templateListsByUser.delete(userUid);
  resolvedTemplatesByUser.delete(userUid);
};

const buildTemplateBodies = (userUid: string, payload: PostProcessingTemplateContent) => {
  const normalizedPayload = {
    user_uid: userUid,
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    qualification_buckets: payload.qualification_buckets,
    data_points: payload.data_points || [],
    custom_instructions: payload.custom_instructions || [],
  };

  return [
    normalizedPayload,
    {
      user_uid: userUid,
      name: normalizedPayload.name,
      description: normalizedPayload.description,
      content: {
        qualification_buckets: normalizedPayload.qualification_buckets,
        data_points: normalizedPayload.data_points,
        custom_instructions: normalizedPayload.custom_instructions,
      },
    },
  ];
};

async function requestTemplateMutation<T>(
  url: string,
  method: 'POST' | 'PUT',
  userUid: string,
  payload: PostProcessingTemplateContent,
) {
  const bodies = buildTemplateBodies(userUid, payload);
  let lastError: unknown = null;

  for (const body of bodies) {
    try {
      return await fetchJson<T>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        retry: { retries: 0 },
      });
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || (error.status !== 400 && error.status !== 422)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Template request failed');
}

export function usePostProcessingTemplates() {
  const { userUid, loading: authLoading } = useMonadeUser();
  const [templates, setTemplates] = useState<PostProcessingTemplateSummary[]>([]);
  const [activeTemplateId, setActiveTemplateIdState] = useState<string | null>(null);
  const [resolvedTemplate, setResolvedTemplate] = useState<ResolvedPostProcessingTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (forceRefresh = false) => {
    if (!userUid) {
      if (!authLoading) {
        setTemplates([]);
        setActiveTemplateIdState(null);
        setResolvedTemplate(null);
      }

      return { templates: [], activeTemplateId: null };
    }

    if (!forceRefresh) {
      const cached = templateListsByUser.get(userUid);
      if (cached && isCacheFresh(cached.cachedAt)) {
        setTemplates(cached.templates);
        setActiveTemplateIdState(cached.activeTemplateId);

        return { templates: cached.templates, activeTemplateId: cached.activeTemplateId };
      }
    }

    const inFlight = !forceRefresh ? listRequestsByUser.get(userUid) : undefined;
    if (inFlight) {
      const result = await inFlight;
      setTemplates(result.templates);
      setActiveTemplateIdState(result.activeTemplateId);

      return result;
    }

    const request = (async () => {
      try {
        const response = await fetchJson<any>(`${MONADE_API_BASE}/api/users/${encodeURIComponent(userUid)}/post-processing-templates`, {
          retry: { retries: 1 },
        });
        const normalized = normalizeTemplateListResponse(response);
        templateListsByUser.set(userUid, {
          templates: normalized.templates,
          activeTemplateId: normalized.activeTemplateId,
          cachedAt: Date.now(),
        });

        return normalized;
      } finally {
        listRequestsByUser.delete(userUid);
      }
    })();

    listRequestsByUser.set(userUid, request);

    try {
      setLoading(true);
      setError(null);
      const result = await request;
      setTemplates(result.templates);
      setActiveTemplateIdState(result.activeTemplateId);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authLoading, userUid]);

  const fetchTemplate = useCallback(async (templateId: string, forceRefresh = false) => {
    if (!templateId) return null;

    if (!forceRefresh) {
      const cached = templatesById.get(templateId);
      if (cached && isCacheFresh(cached.cachedAt)) {
        return cached.template;
      }
    }

    const inFlight = !forceRefresh ? templateRequestsById.get(templateId) : undefined;
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      try {
        const response = await fetchJson<any>(`${MONADE_API_BASE}/api/post-processing-templates/${encodeURIComponent(templateId)}?include_content=true`, {
          retry: { retries: 1 },
        });
        const normalized = normalizeTemplateResponse(response);
        templatesById.set(templateId, {
          template: normalized,
          cachedAt: Date.now(),
        });

        return normalized;
      } finally {
        templateRequestsById.delete(templateId);
      }
    })();

    templateRequestsById.set(templateId, request);

    return request;
  }, []);

  const fetchResolvedTemplate = useCallback(async (forceRefresh = false) => {
    if (!userUid) {
      setResolvedTemplate(null);

      return null;
    }

    if (!forceRefresh) {
      const cached = resolvedTemplatesByUser.get(userUid);
      if (cached && isCacheFresh(cached.cachedAt)) {
        setResolvedTemplate(cached.template);

        return cached.template;
      }
    }

    const inFlight = !forceRefresh ? resolvedRequestsByUser.get(userUid) : undefined;
    if (inFlight) {
      const result = await inFlight;
      setResolvedTemplate(result);

      return result;
    }

    const request = (async () => {
      try {
        const response = await fetchJson<any>(`${MONADE_API_BASE}/api/users/${encodeURIComponent(userUid)}/post-processing-template/resolved`, {
          retry: { retries: 1 },
        });
        const normalized = normalizeResolvedTemplateResponse(response);
        resolvedTemplatesByUser.set(userUid, {
          template: normalized,
          cachedAt: Date.now(),
        });

        return normalized;
      } finally {
        resolvedRequestsByUser.delete(userUid);
      }
    })();

    resolvedRequestsByUser.set(userUid, request);

    try {
      setLoading(true);
      setError(null);
      const result = await request;
      setResolvedTemplate(result);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve active template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  const createTemplate = useCallback(async (payload: PostProcessingTemplateContent) => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      setError(null);
      const response = await requestTemplateMutation<any>(
        `${MONADE_API_BASE}/api/post-processing-templates`,
        'POST',
        userUid,
        payload,
      );
      const normalized = normalizeTemplateResponse(response);
      templatesById.set(normalized.id, { template: normalized, cachedAt: Date.now() });
      invalidateUserCaches(userUid);
      await Promise.all([fetchTemplates(true), fetchResolvedTemplate(true).catch(() => null)]);

      return normalized;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchResolvedTemplate, fetchTemplates, userUid]);

  const updateTemplate = useCallback(async (templateId: string, payload: PostProcessingTemplateContent) => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      setError(null);
      const response = await requestTemplateMutation<any>(
        `${MONADE_API_BASE}/api/post-processing-templates/${encodeURIComponent(templateId)}`,
        'PUT',
        userUid,
        payload,
      );
      const normalized = normalizeTemplateResponse(response);
      templatesById.set(templateId, { template: normalized, cachedAt: Date.now() });
      invalidateUserCaches(userUid);
      await Promise.all([fetchTemplates(true), fetchResolvedTemplate(true).catch(() => null)]);

      return normalized;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchResolvedTemplate, fetchTemplates, userUid]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      setError(null);
      await fetchJson(`${MONADE_API_BASE}/api/post-processing-templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
        retry: { retries: 0 },
      });
      templatesById.delete(templateId);
      invalidateUserCaches(userUid);
      await Promise.all([fetchTemplates(true), fetchResolvedTemplate(true).catch(() => null)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchResolvedTemplate, fetchTemplates, userUid]);

  const setActiveTemplate = useCallback(async (templateId: string | null) => {
    if (!userUid) throw new Error('User not authenticated');

    try {
      setSaving(true);
      setError(null);
      await fetchJson(`${MONADE_API_BASE}/api/users/${encodeURIComponent(userUid)}/post-processing-template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
        retry: { retries: 0 },
      });
      setActiveTemplateIdState(templateId);
      invalidateUserCaches(userUid);
      await Promise.all([fetchTemplates(true), fetchResolvedTemplate(true)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active template');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchResolvedTemplate, fetchTemplates, userUid]);

  useEffect(() => {
    if (!authLoading) {
      fetchTemplates().catch(() => undefined);
      fetchResolvedTemplate().catch(() => undefined);
    }
  }, [authLoading, fetchResolvedTemplate, fetchTemplates]);

  return {
    templates,
    activeTemplateId,
    resolvedTemplate,
    loading,
    saving,
    error,
    fetchTemplates,
    fetchTemplate,
    fetchResolvedTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setActiveTemplate,
  };
}
