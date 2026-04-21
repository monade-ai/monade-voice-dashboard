'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';

import { useMonadeUser } from './use-monade-user';

const API_BASE = MONADE_API_BASE;

export interface RagCorpus {
  id: string;
  user_uid: string;
  name: string;
  description?: string;
  corpusResourceName?: string;
  fileCount: number;
  status: string;
  createdAt: string;
}

export interface CreateRagCorpusData {
  name: string;
  description?: string;
  file_text?: string;
  file_base64?: string;
  filename: string;
}

export interface BackgroundAudioConfig {
  enabled: boolean;
  ambient_clip?: 'OFFICE_AMBIENCE' | 'KEYBOARD_TYPING' | 'KEYBOARD_TYPING2';
  ambient_volume?: number;
}

export function useRagCorpus() {
  const { userUid, loading: authLoading } = useMonadeUser();
  const [corpora, setCorpora] = useState<RagCorpus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCorpora = useCallback(async () => {
    if (!userUid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchJson<any>(
        `${API_BASE}/api/rag-corpora/user/${encodeURIComponent(userUid)}`,
        { retry: { retries: 1 } },
      );
      const list = Array.isArray(data) ? data : (data?.corpora || []);
      setCorpora(list);
    } catch (err) {
      console.error('[useRagCorpus] fetch error:', err);
      toast.error('Failed to load RAG corpora');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  const createCorpus = useCallback(async (data: CreateRagCorpusData): Promise<RagCorpus | null> => {
    if (!userUid) return null;
    setSaving(true);
    try {
      const result = await fetchJson<RagCorpus>(`${API_BASE}/api/rag-corpora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, user_uid: userUid }),
        retry: { retries: 0 },
      });
      toast.success('RAG corpus created');
      await fetchCorpora();
      return result;
    } catch (err) {
      console.error('[useRagCorpus] create error:', err);
      toast.error('Failed to create RAG corpus');
      return null;
    } finally {
      setSaving(false);
    }
  }, [userUid, fetchCorpora]);

  const addFile = useCallback(async (corpusId: string, data: { file_text?: string; file_base64?: string; filename: string }): Promise<boolean> => {
    setSaving(true);
    try {
      await fetchJson(`${API_BASE}/api/rag-corpora/${encodeURIComponent(corpusId)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        retry: { retries: 0 },
      });
      toast.success('File added to corpus');
      await fetchCorpora();
      return true;
    } catch (err) {
      console.error('[useRagCorpus] addFile error:', err);
      toast.error('Failed to add file');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchCorpora]);

  const deleteCorpus = useCallback(async (corpusId: string): Promise<boolean> => {
    setSaving(true);
    try {
      await fetchJson(`${API_BASE}/api/rag-corpora/${encodeURIComponent(corpusId)}`, {
        method: 'DELETE',
        retry: { retries: 0 },
      });
      setCorpora(prev => prev.filter(c => c.id !== corpusId));
      toast.success('RAG corpus deleted');
      return true;
    } catch (err) {
      console.error('[useRagCorpus] delete error:', err);
      toast.error('Failed to delete corpus');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const attachToAssistant = useCallback(async (assistantId: string, corpusId: string): Promise<boolean> => {
    try {
      await fetchJson(`${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/attach-rag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rag_corpus_id: corpusId }),
        retry: { retries: 0 },
      });
      toast.success('RAG corpus attached to assistant');
      return true;
    } catch (err) {
      console.error('[useRagCorpus] attach error:', err);
      toast.error('Failed to attach RAG corpus');
      return false;
    }
  }, []);

  const detachFromAssistant = useCallback(async (assistantId: string): Promise<boolean> => {
    try {
      await fetchJson(`${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/detach-rag`, {
        method: 'PATCH',
        retry: { retries: 0 },
      });
      toast.success('RAG corpus detached');
      return true;
    } catch (err) {
      console.error('[useRagCorpus] detach error:', err);
      toast.error('Failed to detach RAG corpus');
      return false;
    }
  }, []);

  const toggleTools = useCallback(async (assistantId: string, enabled: boolean): Promise<boolean> => {
    try {
      await fetchJson(`${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/tools-toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableTools: enabled }),
        retry: { retries: 0 },
      });
      toast.success(enabled ? 'Tools enabled' : 'Tools disabled');
      return true;
    } catch (err) {
      console.error('[useRagCorpus] toggleTools error:', err);
      toast.error('Failed to toggle tools');
      return false;
    }
  }, []);

  const toggleEndCallTool = useCallback(
    async (
      assistantId: string,
      enabled: boolean,
      currentToolsConfig?: any,
    ): Promise<any | null> => {
      try {
        const existingTools = Array.isArray(currentToolsConfig?.tools)
          ? currentToolsConfig.tools
          : [];
        const toolsWithoutEndCall = existingTools.filter((tool: any) => tool?.type !== 'end_call');
        const endCallTool = { type: 'end_call', enabled };
        const toolsConfig = {
          max_tool_steps: currentToolsConfig?.max_tool_steps ?? 3,
          tools: [...toolsWithoutEndCall, endCallTool],
          ...(currentToolsConfig?.background_audio
            ? { background_audio: currentToolsConfig.background_audio }
            : {}),
        };

        const result = await fetchJson<any>(
          `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/tools-config`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolsConfig }),
            retry: { retries: 0 },
          },
        );

        toast.success(enabled ? 'Call completion tool enabled' : 'Call completion tool disabled');

        return result;
      } catch (err) {
        console.error('[useRagCorpus] toggleEndCallTool error:', err);
        toast.error('Failed to update call completion tool');

        return null;
      }
    },
    [],
  );

  const toggleVertexRagTool = useCallback(
    async (
      assistantId: string,
      enabled: boolean,
      currentToolsConfig?: any,
    ): Promise<any | null> => {
      try {
        const existingTools = Array.isArray(currentToolsConfig?.tools)
          ? currentToolsConfig.tools
          : [];
        const existingVertexRag = existingTools.find((tool: any) => tool?.type === 'vertex_rag');
        const toolsWithoutVertexRag = existingTools.filter((tool: any) => tool?.type !== 'vertex_rag');
        const vertexRagTool = {
          type: 'vertex_rag',
          enabled,
          config: {
            rag_corpus: existingVertexRag?.config?.rag_corpus ?? '',
            similarity_top_k: existingVertexRag?.config?.similarity_top_k ?? 10,
            vector_distance_threshold: existingVertexRag?.config?.vector_distance_threshold ?? 0.3,
          },
        };
        const toolsConfig = {
          max_tool_steps: currentToolsConfig?.max_tool_steps ?? 3,
          tools: [...toolsWithoutVertexRag, vertexRagTool],
          ...(currentToolsConfig?.background_audio
            ? { background_audio: currentToolsConfig.background_audio }
            : {}),
        };

        const result = await fetchJson<any>(
          `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/tools-config`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolsConfig }),
            retry: { retries: 0 },
          },
        );

        toast.success(enabled ? 'RAG tool enabled' : 'RAG tool disabled');

        return result;
      } catch (err) {
        console.error('[useRagCorpus] toggleVertexRagTool error:', err);
        toast.error('Failed to update RAG tool');

        return null;
      }
    },
    [],
  );

  const updateBackgroundAudio = useCallback(
    async (
      assistantId: string,
      config: BackgroundAudioConfig,
      options?: { silent?: boolean; throwOnError?: boolean },
    ): Promise<any | null> => {
      try {
        const result = await fetchJson<any>(
          `${API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/background-audio`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: config.enabled,
              ambient_clip: config.ambient_clip ?? 'OFFICE_AMBIENCE',
              ambient_volume: Number(config.ambient_volume ?? 8),
            }),
            retry: { retries: 0 },
          },
        );

        if (!options?.silent) {
          toast.success(config.enabled ? 'Background audio enabled' : 'Background audio disabled');
        }

        return result;
      } catch (err) {
        console.error('[useRagCorpus] updateBackgroundAudio error:', err);
        if (!options?.silent) {
          toast.error(err instanceof Error ? err.message : 'Failed to update background audio');
        }
        if (options?.throwOnError) {
          throw err;
        }

        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!authLoading) fetchCorpora();
  }, [authLoading, fetchCorpora]);

  return {
    corpora,
    loading,
    saving,
    fetchCorpora,
    createCorpus,
    addFile,
    deleteCorpus,
    attachToAssistant,
    detachFromAssistant,
    toggleTools,
    toggleEndCallTool,
    toggleVertexRagTool,
    updateBackgroundAudio,
  };
}
