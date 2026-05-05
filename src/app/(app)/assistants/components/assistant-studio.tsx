'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Trash2,
  Volume2,
  ArrowLeft,
  Loader2,
  Plus,
  Settings2,
  Rocket,
  Layout,
  Save,
  Check,
  Database,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';

import { useAssistants, Assistant } from '@/app/hooks/use-assistants-context';
import { useLibrary } from '@/app/hooks/use-knowledge-base';
import { useRagCorpus } from '@/app/hooks/use-rag-corpus';
import { useTrunks } from '@/app/hooks/use-trunks';
import { useUserTrunks } from '@/app/hooks/use-user-trunks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { cn } from '@/lib/utils';
import { LibraryWorkshop } from '@/app/(app)/knowledge-base/components/library-workshop';
import { fetchJson } from '@/lib/http';
import { MONADE_API_BASE } from '@/config';

import DeleteConfirmationModal from '../delete-confirmation-modal';

import LiveKitAssistantDualButton from './livekit-assistant-dual-button';

// --- Sub-Components ---

const WorkflowStep = ({ number, title, description, children, action }: { number: string, title: string, description: string, children: React.ReactNode, action?: React.ReactNode }) => (
  <div className="space-y-6 pb-12 border-b border-border/10 last:border-0 last:pb-0 relative">
    <div className="flex items-start justify-between">
      <div className="flex gap-6">
        <span className="text-6xl font-bold text-foreground/[0.15] select-none leading-none -mt-2 tabular-nums">{number}</span>
        <div className="space-y-1">
          <h3 className="text-2xl font-medium tracking-tighter text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
        </div>
      </div>
      {action}
    </div>
    <div className="pl-[88px]">
      {children}
    </div>
  </div>
);

const DEFAULT_BACKGROUND_AUDIO = {
  enabled: false,
  ambient_clip: 'OFFICE_AMBIENCE',
  ambient_volume: 8,
};

const clampBackgroundVolume = (value: number) => Math.min(25, Math.max(0, value));

const readBackgroundAudio = (toolsConfig: any) => ({
  ...DEFAULT_BACKGROUND_AUDIO,
  ...(toolsConfig?.background_audio || {}),
  ambient_volume: clampBackgroundVolume(Number(toolsConfig?.background_audio?.ambient_volume ?? DEFAULT_BACKGROUND_AUDIO.ambient_volume) || 0),
});

const getDispatchRuleIds = (assistant: Assistant) => {
  const rawIds = [
    assistant.dispatch_rule_id,
    ...(((assistant as any).dispatch_rule_ids || []) as unknown[]),
  ];

  return Array.from(new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0)));
};

const readRebakedDispatchRuleId = (response: any) => (
  response?.dispatch_rule_id
  || response?.new_dispatch_rule_id
  || response?.rule_id
  || response?.dispatchRuleId
  || response?.dispatch_rule?.id
  || response?.rule?.id
);

const GEMINI_VOICE_OPTIONS = [
  { value: 'Kore', label: 'Kore', tone: 'Neutral and professional.' },
  { value: 'Puck', label: 'Puck', tone: 'Conversational and friendly.' },
  { value: 'Charon', label: 'Charon', tone: 'Deep and authoritative.' },
  { value: 'Fenrir', label: 'Fenrir', tone: 'Warm and approachable.' },
  { value: 'Aoede', label: 'Aoede', tone: 'Breezy and energetic.' },
  { value: 'Leda', label: 'Leda', tone: 'Soft and measured.' },
  { value: 'Orus', label: 'Orus', tone: 'Crisp and articulate.' },
  { value: 'Zephyr', label: 'Zephyr', tone: 'Bright.' },
] as const;

type VadSensitivity = 'HIGH' | 'LOW' | null;
type VadConfig = {
  start_of_speech_sensitivity: VadSensitivity;
  end_of_speech_sensitivity: VadSensitivity;
  prefix_padding_ms: number | null;
  silence_duration_ms: number | null;
};

const DEFAULT_VAD: VadConfig = {
  start_of_speech_sensitivity: null,
  end_of_speech_sensitivity: null,
  prefix_padding_ms: null,
  silence_duration_ms: null,
};

const VAD_PREFIX_PADDING_MAX = 2000;
const VAD_SILENCE_DURATION_MAX = 5000;

const readVad = (toolsConfig: any): VadConfig => {
  const raw = toolsConfig?.vad || {};
  const sanitizeSensitivity = (v: unknown): VadSensitivity => (
    v === 'HIGH' || v === 'LOW' ? v : null
  );
  const sanitizeMs = (v: unknown, max: number): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;

    return Math.min(max, Math.max(0, Math.round(n)));
  };

  return {
    start_of_speech_sensitivity: sanitizeSensitivity(raw.start_of_speech_sensitivity),
    end_of_speech_sensitivity: sanitizeSensitivity(raw.end_of_speech_sensitivity),
    prefix_padding_ms: sanitizeMs(raw.prefix_padding_ms, VAD_PREFIX_PADDING_MAX),
    silence_duration_ms: sanitizeMs(raw.silence_duration_ms, VAD_SILENCE_DURATION_MAX),
  };
};

export default function AssistantStudio() {
  const {
    currentAssistant,
    setCurrentAssistant,
    saveAssistantUpdates,
    createAssistant,
    updateAssistantLocally,
  } = useAssistants();
  const { items: libraryItems } = useLibrary();
  const { trunks, phoneNumbers } = useTrunks({ checkAssignments: false });
  const { trunks: userTrunks } = useUserTrunks();
  const inboundTrunks = userTrunks.filter(t => t.trunk_type === 'inbound');
  const { corpora, attachToAssistant, detachFromAssistant, toggleTools, toggleEndCallTool, toggleVertexRagTool, updateBackgroundAudio } = useRagCorpus();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [isTogglingTools, setIsTogglingTools] = useState(false);
  const [isTogglingRag, setIsTogglingRag] = useState(false);
  const [isTogglingCallCompletion, setIsTogglingCallCompletion] = useState(false);
  const [isUpdatingBackgroundAudio, setIsUpdatingBackgroundAudio] = useState(false);
  const [backgroundVolumeInput, setBackgroundVolumeInput] = useState(String(DEFAULT_BACKGROUND_AUDIO.ambient_volume));
  const [isSyncingTools, setIsSyncingTools] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedVoiceValue, setSavedVoiceValue] = useState<string | null>(null);
  const currentAssistantRef = useRef<Assistant | null>(null);

  const isDraft = currentAssistant?.id.startsWith('local-');
  const backgroundAudio = readBackgroundAudio(currentAssistant?.toolsConfig);
  const vad = readVad(currentAssistant?.toolsConfig);
  const selectedVoiceValue = currentAssistant?.voice || null;
  const selectedVoiceMeta = GEMINI_VOICE_OPTIONS.find((voice) => voice.value === selectedVoiceValue)
    || GEMINI_VOICE_OPTIONS.find((voice) => voice.value === 'Kore');
  const hasUnsavedVoiceChange = (selectedVoiceValue || null) !== savedVoiceValue;

  const syncToolsFromBackend = useCallback(async (assistantId: string) => {
    try {
      setIsSyncingTools(true);
      const data = await fetchJson<any>(`${MONADE_API_BASE}/api/assistants/${encodeURIComponent(assistantId)}/tools-config`, {
        retry: { retries: 0 },
      });
      const nextEnableTools = data?.enableTools ?? data?.assistant?.enableTools;
      const nextToolsConfig = data?.toolsConfig ?? data?.assistant?.toolsConfig;
      const latestAssistant = currentAssistantRef.current;
      if (!latestAssistant || latestAssistant.id !== assistantId) return;
      setCurrentAssistant({
        ...latestAssistant,
        enableTools: nextEnableTools ?? latestAssistant.enableTools ?? false,
        toolsConfig: nextToolsConfig ?? latestAssistant.toolsConfig ?? null,
      });
    } catch (err) {
      console.error('[AssistantStudio] Failed to sync tools state from backend:', err);
    } finally {
      setIsSyncingTools(false);
    }
  }, [setCurrentAssistant]);

  // Reset dirty flag when assistant changes
  useEffect(() => {
    setIsDirty(false);
    setSaveStatus('idle');
  }, [currentAssistant?.id]);

  useEffect(() => {
    currentAssistantRef.current = currentAssistant;
  }, [currentAssistant]);

  useEffect(() => {
    setBackgroundVolumeInput(String(readBackgroundAudio(currentAssistant?.toolsConfig).ambient_volume));
  }, [currentAssistant?.id, currentAssistant?.toolsConfig]);

  useEffect(() => {
    setSavedVoiceValue(currentAssistant?.voice || null);
  }, [currentAssistant?.id, currentAssistant?.voice]);

  useEffect(() => {
    if (!currentAssistant?.id || isDraft) return;
    syncToolsFromBackend(currentAssistant.id);
  }, [currentAssistant?.id, isDraft, syncToolsFromBackend]);

  // Local-only update: updates state but does NOT save to backend
  const handleUpdate = (field: keyof Assistant, value: any) => {
    if (!currentAssistant) return;
    const updated = { ...currentAssistant, [field]: value };
    setCurrentAssistant(updated);
    if (isDraft) {
      updateAssistantLocally(updated.id, updated);
    }
    setIsDirty(true);
    setSaveStatus('idle');
  };

  // Batch update multiple fields at once
  const handleBatchUpdate = (updates: Partial<Assistant>) => {
    if (!currentAssistant) return;
    const updated = { ...currentAssistant, ...updates };
    setCurrentAssistant(updated);
    if (isDraft) {
      updateAssistantLocally(updated.id, updated);
    }
    setIsDirty(true);
    setSaveStatus('idle');
  };

  // Manual save button handler
  const handleSave = async () => {
    if (!currentAssistant || isDraft || isSaving) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { id, createdAt: _createdAt, knowledgeBase, dispatch_rule_id: _dispatchRuleId, ...updates } = currentAssistant;
      await saveAssistantUpdates(id, {
        ...updates,
        knowledgeBaseId: knowledgeBase,
      });
      setSavedVoiceValue(currentAssistant.voice || null);
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (_err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!currentAssistant || isDeploying) return;
    setIsDeploying(true);
    try {
      if (isDraft) {
        const { id: _id, createdAt: _ca, dispatch_rule_id: _dr, knowledgeBase, ...rest } = currentAssistant;
        const published = await createAssistant(currentAssistant.id, {
          ...rest,
          knowledgeBaseId: knowledgeBase,
        });
        if (published) {
          setCurrentAssistant(published);
          setSavedVoiceValue(published.voice || null);
          setIsDirty(false);
        }
      }
    } finally {
      setIsDeploying(false);
    }
  };

  if (!currentAssistant) return null;

  const isInbound = currentAssistant.call_direction === 'inbound';
  const isInboundBound = currentAssistant.call_direction === 'inbound' || currentAssistant.call_direction === 'both';
  const ragTool = currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'vertex_rag');
  const hasAttachedRagCorpus = !!ragTool?.config?.rag_corpus;

  const buildBackgroundAudioConfig = (updates: Partial<typeof DEFAULT_BACKGROUND_AUDIO> = {}) => {
    const nextConfig = {
      ...backgroundAudio,
      ...updates,
      ambient_clip: updates.ambient_clip || backgroundAudio.ambient_clip,
      ambient_volume: clampBackgroundVolume(Number(updates.ambient_volume ?? backgroundAudio.ambient_volume) || 0),
    };

    return nextConfig;
  };

  const applyBackgroundAudioLocally = (nextConfig: typeof DEFAULT_BACKGROUND_AUDIO) => {
    if (!currentAssistant) return;
    const updatedAssistant = {
      ...currentAssistant,
      toolsConfig: {
        ...(currentAssistant.toolsConfig || {}),
        background_audio: nextConfig,
      },
    };
    setCurrentAssistant(updatedAssistant);
    updateAssistantLocally(updatedAssistant.id, updatedAssistant);
  };

  const stageBackgroundAudio = (updates: Partial<typeof DEFAULT_BACKGROUND_AUDIO>) => {
    const nextConfig = buildBackgroundAudioConfig(updates);
    applyBackgroundAudioLocally(nextConfig);
  };

  const saveBackgroundAudio = async (updates: Partial<typeof DEFAULT_BACKGROUND_AUDIO>) => {
    if (!currentAssistant || isUpdatingBackgroundAudio || isSyncingTools) return;
    const nextConfig = buildBackgroundAudioConfig(updates);
    if (isInboundBound) {
      stageBackgroundAudio(updates);

      return;
    }
    setIsUpdatingBackgroundAudio(true);
    try {
      await updateBackgroundAudio(currentAssistant.id, {
        enabled: nextConfig.enabled,
        ambient_clip: nextConfig.ambient_clip as 'OFFICE_AMBIENCE' | 'KEYBOARD_TYPING' | 'KEYBOARD_TYPING2',
        ambient_volume: nextConfig.ambient_volume,
      });
      await syncToolsFromBackend(currentAssistant.id);
    } finally {
      setIsUpdatingBackgroundAudio(false);
    }
  };

  const saveAndApplyInboundBackgroundAudio = async () => {
    if (!currentAssistant || isUpdatingBackgroundAudio || isSyncingTools) return;
    const parsedVolume = Number.parseFloat(backgroundVolumeInput);
    const nextVolume = clampBackgroundVolume(Number.isFinite(parsedVolume) ? parsedVolume : DEFAULT_BACKGROUND_AUDIO.ambient_volume);
    const nextConfig = buildBackgroundAudioConfig({ ambient_volume: nextVolume });
    const dispatchRuleIds = getDispatchRuleIds(currentAssistant);
    const needsInboundRebake = isInboundBound && !!currentAssistant.inbound_trunk_id;

    setBackgroundVolumeInput(String(nextVolume));
    setIsUpdatingBackgroundAudio(true);
    try {
      await updateBackgroundAudio(currentAssistant.id, {
        enabled: nextConfig.enabled,
        ambient_clip: nextConfig.ambient_clip as 'OFFICE_AMBIENCE' | 'KEYBOARD_TYPING' | 'KEYBOARD_TYPING2',
        ambient_volume: nextConfig.ambient_volume,
      }, { silent: true, throwOnError: true });

      if (needsInboundRebake && dispatchRuleIds.length === 0) {
        applyBackgroundAudioLocally(nextConfig);
        toast.error('Background audio saved, but this inbound assistant has no dispatch rule to rebake yet. Save the inbound routing first.');

        return;
      }

      let latestDispatchRuleId = currentAssistant.dispatch_rule_id ?? null;
      const rebakedDispatchRuleIds: string[] = [];
      for (const ruleId of dispatchRuleIds) {
        const response = await fetchJson<any>(
          `${MONADE_API_BASE}/dispatch-rules/${encodeURIComponent(ruleId)}/rebake`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistant_id: currentAssistant.id }),
            retry: { retries: 0 },
          },
        );
        const nextRuleId = readRebakedDispatchRuleId(response) ?? ruleId;
        latestDispatchRuleId = nextRuleId;
        rebakedDispatchRuleIds.push(nextRuleId);
      }

      await syncToolsFromBackend(currentAssistant.id);
      applyBackgroundAudioLocally(nextConfig);
      if (latestDispatchRuleId !== currentAssistant.dispatch_rule_id) {
        updateAssistantLocally(currentAssistant.id, {
          dispatch_rule_id: latestDispatchRuleId,
          ...(rebakedDispatchRuleIds.length > 1 ? { dispatch_rule_ids: rebakedDispatchRuleIds } : {}),
        } as Partial<Assistant>);
      }
      toast.success(dispatchRuleIds.length > 0 ? 'Background audio saved and applied to inbound calls' : 'Background audio saved');
    } catch (err) {
      console.error('[AssistantStudio] Failed to save/apply inbound background audio:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save background audio');
    } finally {
      setIsUpdatingBackgroundAudio(false);
    }
  };

  const commitBackgroundVolumeInput = () => {
    const parsedVolume = Number.parseFloat(backgroundVolumeInput);
    const nextVolume = clampBackgroundVolume(Number.isFinite(parsedVolume) ? parsedVolume : DEFAULT_BACKGROUND_AUDIO.ambient_volume);
    setBackgroundVolumeInput(String(nextVolume));
    if (isInboundBound) return;
    void saveBackgroundAudio({ ambient_volume: nextVolume });
  };

  const updateVad = (updates: Partial<VadConfig>) => {
    if (!currentAssistant) return;
    const nextVad: VadConfig = { ...vad, ...updates };
    const nextToolsConfig = {
      ...(currentAssistant.toolsConfig || {}),
      vad: nextVad,
    };
    handleUpdate('toolsConfig' as keyof Assistant, nextToolsConfig);
  };

  const parseMsInput = (raw: string, max: number): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;

    return Math.min(max, Math.max(0, Math.round(n)));
  };

  // Outbound trunk options
  const trunkOptions = trunks.length > 0 ? trunks.map((trunk) => ({
    value: trunk.name,
    label: trunk.name,
    description: trunk.name.toLowerCase().includes('vobiz')
      ? 'Best for +91 numbers'
      : trunk.name.toLowerCase().includes('twilio')
        ? 'Global coverage'
        : `SIP Trunk: ${trunk.address}`,
  })) : [
    { value: 'vobiz', label: 'Vobiz', description: 'Best for +91 numbers' },
    { value: 'twilio', label: 'Twilio', description: 'Global coverage' },
  ];

  const selectedTrunkName = currentAssistant.callProvider || '';
  const filteredPhoneNumbers = phoneNumbers.filter((phone) => {
    if (!selectedTrunkName) return false;
    return phone.trunkName.toLowerCase() === selectedTrunkName.toLowerCase();
  });
  const uniqueFilteredPhoneNumbers = Array.from(
    new Map(filteredPhoneNumbers.map((phone) => [phone.number, phone])).values(),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
      className="fixed inset-0 z-50 bg-background flex flex-col font-sans overflow-hidden shadow-2xl"
    >
      {/* --- Header --- */}
      <header className="h-16 border-b border-border/40 flex items-center justify-between px-8 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentAssistant(null)} className="p-2 hover:bg-muted rounded-full transition-colors group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-primary">Studio</span>
            <h2 className="text-sm font-medium text-foreground tracking-tight">{currentAssistant.name || 'New Assistant'}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Dirty indicator */}
          {isDirty && !isDraft && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">Unsaved changes</span>
          )}

          <LiveKitAssistantDualButton assistant={currentAssistant} />

          {/* Save button — only for published assistants */}
          {!isDraft && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={cn(
                'h-9 px-4 gap-2 text-[10px] font-bold uppercase tracking-widest transition-all',
                saveStatus === 'saved'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-foreground text-background hover:bg-foreground/90',
              )}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
            </Button>
          )}

          <div className="h-4 w-px bg-border/40 mx-2" />
          <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={18} /></button>
        </div>
      </header>

      {/* --- Main Workflow --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/[0.01]">
        <div className="max-w-6xl mx-auto p-8 md:p-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16">

          <div className="space-y-16">

            {/* STEP 01: BASICS & DESCRIPTION */}
            <WorkflowStep
              number="01"
              title="Identity & Role"
              description="Identify your agent and describe exactly how it should behave."
            >
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Display Name</label>
                    <Input
                      value={currentAssistant.name}
                      onChange={(e) => handleUpdate('name', e.target.value)}
                      className="bg-background border-border/40 h-12 text-base font-medium focus:border-primary transition-all rounded-md px-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Call Direction</label>
                    <Select
                      value={currentAssistant.call_direction || 'outbound'}
                      onValueChange={(value) => {
                        if (value === 'outbound') {
                          handleBatchUpdate({ call_direction: 'outbound', inbound_trunk_id: null });
                        } else {
                          handleBatchUpdate({ call_direction: 'inbound', callProvider: '', phoneNumber: '' });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4">
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">Outbound</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                      Outbound for dialing out, Inbound for receiving calls.
                    </p>
                  </div>
                </div>

                {/* --- OUTBOUND CONFIG --- */}
                {!isInbound && (
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Trunk / Provider</label>
                      <Select
                        value={currentAssistant.callProvider || '__none__'}
                        onValueChange={(value) => {
                          const nextValue = value === '__none__' ? '' : value;
                          // When trunk changes, clear phone and update trunk in one batch
                          handleBatchUpdate({ callProvider: nextValue, phoneNumber: '' });
                        }}
                      >
                        <SelectTrigger className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4">
                          <SelectValue placeholder="Select trunk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">None</span>
                          </SelectItem>
                          {trunkOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{option.label}</span>
                                <span className="text-[10px] text-muted-foreground">{option.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                        Select your SIP trunk or call provider.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Phone Number</label>
                      <Input
                        value={currentAssistant.phoneNumber || ''}
                        onChange={(e) => handleUpdate('phoneNumber', e.target.value)}
                        placeholder="e.g. +919876543210"
                        className="bg-background border-border/40 h-12 font-mono text-base focus:border-primary transition-all rounded-md px-4"
                      />
                      <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                        Enter the phone number to use for outbound calls.
                      </p>
                    </div>
                  </div>
                )}

                {/* --- INBOUND CONFIG --- */}
                {isInbound && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Inbound Trunk</label>
                        <Select
                          value={currentAssistant.inbound_trunk_id || '__none__'}
                          onValueChange={(value) => handleUpdate('inbound_trunk_id', value === '__none__' ? null : value)}
                        >
                          <SelectTrigger className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4">
                            <SelectValue placeholder={inboundTrunks.length === 0 ? 'No inbound trunks available' : 'Select inbound trunk'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">None</span>
                            </SelectItem>
                            {inboundTrunks.map((trunk) => (
                              <SelectItem key={trunk.id} value={trunk.livekit_trunk_id || trunk.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{trunk.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{trunk.numbers?.join(', ')}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {inboundTrunks.length === 0 && (
                          <p className="text-[10px] text-orange-500 px-1">No inbound trunks found. Create one in the Trunks page.</p>
                        )}
                        {/* Dispatch rule status */}
                        <div className="flex items-center gap-2 px-1 mt-1">
                          <div className={cn('w-2 h-2 rounded-full', currentAssistant.dispatch_rule_id ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                          <span className="text-[10px] text-muted-foreground/60">
                            {currentAssistant.dispatch_rule_id
                              ? 'Dispatch rule active'
                              : 'Dispatch rule will be created on save'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Phone Number</label>
                        <Input
                          value={currentAssistant.phoneNumber || ''}
                          onChange={(e) => handleUpdate('phoneNumber', e.target.value)}
                          placeholder="e.g. +919876543210"
                          className="bg-background border-border/40 h-12 font-mono text-base focus:border-primary transition-all rounded-md px-4"
                        />
                        <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                          Must be unique per assistant. Used as an identifier.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Agent Description</label>
                    <Input
                      value={currentAssistant.description || ''}
                      onChange={(e) => handleUpdate('description', e.target.value)}
                      placeholder="e.g. A friendly receptionist who books appointments..."
                      className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4"
                    />
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                      Briefly define the agent's core purpose.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Speaking Accent</label>
                    <Input
                      value={currentAssistant.speakingAccent || ''}
                      onChange={(e) => handleUpdate('speakingAccent', e.target.value)}
                      placeholder="e.g. Hinglish Indian, British English"
                      className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4"
                    />
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                      Accent for the agent's speech synthesis.
                    </p>
                  </div>
                </div>

                {/* Call Recording Toggle */}
                <div className="flex items-center justify-between p-4 rounded-md border border-border/40 bg-muted/[0.03]">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="text-sm font-bold tracking-tight">Call Recording</h4>
                      <p className="text-[10px] text-muted-foreground/60">
                        {currentAssistant.enableRecording !== false
                          ? 'Calls will be recorded. Billed at base rate + 0.5 credits/min recording surcharge.'
                          : 'No recording. Billed at base rate only.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdate('enableRecording', currentAssistant.enableRecording === false)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      currentAssistant.enableRecording !== false
                        ? 'bg-green-500 border-green-500'
                        : 'bg-muted border-border/70',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform',
                        currentAssistant.enableRecording !== false ? 'bg-background' : 'bg-muted-foreground/70',
                        currentAssistant.enableRecording !== false ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>
              </div>
            </WorkflowStep>

            {/* STEP 02: KNOWLEDGE */}
            <WorkflowStep
              number="02"
              title="Knowledge"
              description="Equip your agent with the facts it needs to answer questions."
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Selected Brain</label>
                  <Select
                    value={currentAssistant.knowledgeBase || '__none__'}
                    onValueChange={(value) => handleUpdate('knowledgeBase', value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4">
                      <SelectValue placeholder="Select knowledge base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">No memory linked (Standard Mode)</span>
                      </SelectItem>
                      {libraryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.filename}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                    Attach a knowledge base so the agent can reference your documents.
                  </p>
                </div>

                {/* Add new knowledge base */}
                <div
                  onClick={() => setIsWorkshopOpen(true)}
                  className="group p-8 border-2 border-dashed border-border/40 hover:border-primary/40 rounded-md flex flex-col items-center justify-center gap-3 cursor-pointer bg-muted/[0.02] hover:bg-primary/[0.02] transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Plus size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Add script</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Create a new factual fragment for this agent.</p>
                  </div>
                </div>
              </div>
            </WorkflowStep>

            {/* STEP 03: ADVANCED (RAG + Tools) */}
            {!isDraft && (
            <WorkflowStep
              number="03"
              title="Advanced"
              description="Configure RAG retrieval and tool usage for this agent."
            >
              <div className="space-y-6">
                <div className="space-y-4 p-4 rounded-md border border-border/40 bg-muted/[0.03]">
                  {/* Tools Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentAssistant.enableTools ? (
                        <ToggleRight size={20} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={20} className="text-muted-foreground" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold tracking-tight">Tool Usage</h4>
                        <p className="text-[10px] text-muted-foreground/60">
                          {currentAssistant.enableTools
                            ? 'Master switch is ON. Configure individual tools below.'
                            : 'Master switch is OFF. All tools and function calling are disabled.'}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={isTogglingTools || isSyncingTools}
                      onClick={async () => {
                        setIsTogglingTools(true);
                        const newValue = !currentAssistant.enableTools;
                        await toggleTools(currentAssistant.id, newValue);
                        await syncToolsFromBackend(currentAssistant.id);
                        setIsTogglingTools(false);
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',
                        currentAssistant.enableTools
                          ? 'bg-green-500 border-green-500'
                          : 'bg-muted border-border/70',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform',
                          currentAssistant.enableTools ? 'bg-background' : 'bg-muted-foreground/70',
                          currentAssistant.enableTools ? 'translate-x-6' : 'translate-x-1',
                        )}
                      />
                      {(isTogglingTools || isSyncingTools) && (
                        <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
                      )}
                    </button>
                  </div>

                  <div className="border-t border-border/30 pt-4 space-y-4">
                    {/* RAG Corpus Attach */}
                    <div className={cn('space-y-2', !currentAssistant.enableTools && 'opacity-50')}>
                  <div className="flex items-center justify-between p-3 rounded-md border border-border/40 bg-background">
                    <div className="flex items-center gap-3">
                      {ragTool?.enabled ? (
                        <ToggleRight size={20} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={20} className="text-muted-foreground" />
                      )}
                      <div>
                        <h5 className="text-sm font-semibold tracking-tight">RAG Retrieval</h5>
                        <p className="text-[10px] text-muted-foreground/70">
                          Enable or disable retrieval from the attached corpus.
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={isTogglingRag || !currentAssistant.enableTools || isSyncingTools || !hasAttachedRagCorpus}
                      onClick={async () => {
                        setIsTogglingRag(true);
                        const isEnabled = !!ragTool?.enabled;
                        await toggleVertexRagTool(currentAssistant.id, !isEnabled, currentAssistant.toolsConfig);
                        await syncToolsFromBackend(currentAssistant.id);
                        setIsTogglingRag(false);
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',
                        ragTool?.enabled
                          ? 'bg-green-500 border-green-500'
                          : 'bg-muted border-border/70',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform',
                          ragTool?.enabled ? 'bg-background' : 'bg-muted-foreground/70',
                          ragTool?.enabled ? 'translate-x-6' : 'translate-x-1',
                        )}
                      />
                      {isTogglingRag && (
                        <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-foreground" />
                      )}
                    </button>
                  </div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">RAG Corpus</label>
                  <p className="text-[10px] text-muted-foreground/60 px-1 italic mb-2">
                    Attach a RAG corpus so the agent can search through your documents during live calls. Create corpora from the RAG Corpora page.
                  </p>
                  {!currentAssistant.enableTools && (
                    <p className="text-[10px] text-muted-foreground/70 px-1">
                      Turn on Tool Usage first to configure RAG.
                    </p>
                  )}
                  {currentAssistant.enableTools && !hasAttachedRagCorpus && (
                    <p className="text-[10px] text-muted-foreground/70 px-1">
                      Attach a corpus first to enable the RAG toggle.
                    </p>
                  )}
                  {(() => {
                    // Detect currently attached corpus
                    const attachedResource = ragTool?.config?.rag_corpus;
                    const attachedCorpus = attachedResource
                      ? corpora.find(c => c.corpusResourceName === attachedResource)
                      : null;

                    return (
                      <div className="space-y-3">
                        {attachedCorpus ? (
                          <div className="flex items-center justify-between p-4 rounded-md border border-green-500/30 bg-green-500/[0.03]">
                            <div className="flex items-center gap-3">
                              <Database size={16} className="text-green-500" />
                              <div>
                                <span className="text-sm font-bold text-foreground">{attachedCorpus.name}</span>
                                <span className="text-[9px] text-muted-foreground block">{attachedCorpus.fileCount} files</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!currentAssistant.enableTools || isSyncingTools}
                              onClick={async () => {
                                const ok = await detachFromAssistant(currentAssistant.id);
                                if (ok) {
                                  await syncToolsFromBackend(currentAssistant.id);
                                }
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest h-8 text-red-500 border-red-500/30 hover:bg-red-500/5"
                            >
                              Detach
                            </Button>
                          </div>
                        ) : (
                          <Select
                            disabled={!currentAssistant.enableTools || isSyncingTools}
                            value="__none__"
                            onValueChange={async (corpusId) => {
                              if (corpusId === '__none__') return;
                              const ok = await attachToAssistant(currentAssistant.id, corpusId);
                              if (ok) {
                                await syncToolsFromBackend(currentAssistant.id);
                              }
                            }}
                          >
                            <SelectTrigger className="bg-background border-border/40 h-12 text-base focus:border-primary transition-all rounded-md px-4">
                              <SelectValue placeholder={corpora.length === 0 ? 'No corpora available' : 'Select a RAG corpus to attach'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">No corpus attached</span>
                              </SelectItem>
                              {corpora.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{c.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{c.fileCount} files</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {corpora.length === 0 && (
                          <p className="text-[10px] text-orange-500 px-1">
                            No RAG corpora found. Create one from the RAG Corpora page in the sidebar.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                    </div>

                    {/* Background Audio Controls */}
                    <div className="space-y-4 p-4 rounded-md border border-border/40 bg-background">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {backgroundAudio.enabled ? (
                            <ToggleRight size={20} className="text-green-500 shrink-0" />
                          ) : (
                            <ToggleLeft size={20} className="text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-semibold tracking-tight">Background Audio</h5>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="About Background Audio"
                                  >
                                    <Info size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[270px] text-[11px] leading-relaxed">
                                  Ambient call audio is independent of the Tool Usage master switch. Inbound changes are applied when you save and rebake the dispatch rule.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70">
                              Add a subtle office bed behind the agent voice.
                              {isInboundBound ? ' Save & apply when you are ready to update inbound routing.' : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          disabled={isUpdatingBackgroundAudio || isSyncingTools}
                          onClick={() => saveBackgroundAudio({ enabled: !backgroundAudio.enabled })}
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',
                            backgroundAudio.enabled
                              ? 'bg-green-500 border-green-500'
                              : 'bg-muted border-border/70',
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform',
                              backgroundAudio.enabled ? 'bg-background' : 'bg-muted-foreground/70',
                              backgroundAudio.enabled ? 'translate-x-6' : 'translate-x-1',
                            )}
                          />
                          {isUpdatingBackgroundAudio && (
                            <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
                          )}
                        </button>
                      </div>

                      <div className={cn('space-y-4', !backgroundAudio.enabled && 'opacity-50')}>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Ambient Clip</label>
                          <Select
                            disabled={isUpdatingBackgroundAudio || isSyncingTools}
                            value={backgroundAudio.ambient_clip}
                            onValueChange={(value) => saveBackgroundAudio({ ambient_clip: value as typeof DEFAULT_BACKGROUND_AUDIO.ambient_clip })}
                          >
                            <SelectTrigger className="bg-muted/[0.02] border-border/40 h-10 text-sm focus:border-primary transition-all rounded-md px-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OFFICE_AMBIENCE">Office ambience</SelectItem>
                              <SelectItem value="KEYBOARD_TYPING">Keyboard typing</SelectItem>
                              <SelectItem value="KEYBOARD_TYPING2">Keyboard typing 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Volume</label>
                            <div className="flex items-center gap-2">
                              <Volume2 size={14} className="text-muted-foreground" />
                              <Input
                                type="number"
                                min={0}
                                max={25}
                                step={0.5}
                                disabled={isUpdatingBackgroundAudio || isSyncingTools}
                                value={backgroundVolumeInput}
                                onChange={(e) => {
                                  setBackgroundVolumeInput(e.target.value);
                                }}
                                onBlur={commitBackgroundVolumeInput}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="h-8 w-20 bg-muted/[0.02] text-center text-xs font-semibold"
                              />
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={25}
                            step={0.5}
                            disabled={isUpdatingBackgroundAudio || isSyncingTools}
                            value={clampBackgroundVolume(Number.parseFloat(backgroundVolumeInput) || 0)}
                            onChange={(e) => {
                              const nextVolume = Number(e.target.value);
                              setBackgroundVolumeInput(String(nextVolume));
                            }}
                            onBlur={commitBackgroundVolumeInput}
                            onMouseUp={commitBackgroundVolumeInput}
                            onTouchEnd={commitBackgroundVolumeInput}
                            className="w-full accent-primary disabled:opacity-50"
                          />
                          <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                            UI range is 0-25. Values are sent as numeric `ambient_volume` for the backend.
                          </p>
                        </div>
                      </div>
                      {isInboundBound && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={saveAndApplyInboundBackgroundAudio}
                          disabled={isUpdatingBackgroundAudio || isSyncingTools}
                          className="w-full justify-center gap-2"
                        >
                          {isUpdatingBackgroundAudio || isSyncingTools ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Save & apply
                        </Button>
                      )}
                    </div>

                    {/* Call Completion Tool Toggle */}
                    <div className={cn('flex items-center justify-between p-4 rounded-md border border-border/40 bg-background', !currentAssistant.enableTools && 'opacity-50')}>
                  <div className="flex items-center gap-3">
                    {currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled ? (
                      <ToggleRight size={20} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={20} className="text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold tracking-tight">Auto Call Wrap-Up</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="About Auto Call Wrap-Up"
                            >
                              <Info size={13} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-relaxed">
                            Allows the agent to use the call-end function to hang up when the conversation is complete.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        {currentAssistant.enableTools
                          ? 'Choose whether the agent can disconnect calls using function calling'
                          : 'Enable Tool Usage above for this to take effect during calls'}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={isTogglingCallCompletion || !currentAssistant.enableTools || isSyncingTools}
                    onClick={async () => {
                      setIsTogglingCallCompletion(true);
                      const isEnabled = !!currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled;
                      const newValue = !isEnabled;
                      await toggleEndCallTool(currentAssistant.id, newValue, currentAssistant.toolsConfig);
                      await syncToolsFromBackend(currentAssistant.id);
                      setIsTogglingCallCompletion(false);
                    }}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',
                      currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled
                        ? 'bg-green-500 border-green-500'
                        : 'bg-muted border-border/70',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform',
                        currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled ? 'bg-background' : 'bg-muted-foreground/70',
                        currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                    {isTogglingCallCompletion && (
                      <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
                    )}
                  </button>
                </div>
                  </div>
                </div>
              </div>
            </WorkflowStep>
            )}

            {/* STEP 04: DEPLOYMENT */}
            <WorkflowStep
              number={isDraft ? '03' : '04'}
              title="Deploy"
              description="Manage the operational lifecycle of this agent."
            >
              <div className="flex gap-6">
                <div className={cn(
                  'flex-1 p-6 rounded-md border text-left transition-all relative overflow-hidden',
                  isDraft ? 'border-primary bg-primary/[0.03]' : 'border-border/40',
                )}>
                  <Layout className={cn('mb-3', isDraft ? 'text-primary' : 'text-muted-foreground')} size={20} />
                  <h4 className="text-base font-bold tracking-tight">Draft</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Saved locally. Ready for testing.</p>
                  {isDraft && <div className="absolute top-0 right-0 bg-primary text-black text-[8px] font-bold uppercase px-2 py-0.5 tracking-widest">Current</div>}
                </div>

                <button
                  onClick={handleDeploy}
                  disabled={!isDraft || isDeploying}
                  className={cn(
                    'flex-1 p-6 rounded-md border text-left transition-all relative overflow-hidden group/prod',
                    !isDraft ? 'border-green-500 bg-green-500/[0.03]' : 'border-border/40 hover:border-green-500/40',
                  )}
                >
                  <Rocket className={cn('mb-3', !isDraft ? 'text-green-500' : 'text-muted-foreground group-hover/prod:text-green-500')} size={20} />
                  <h4 className="text-base font-bold tracking-tight">Production</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Deployed to the cloud for live traffic.</p>
                  {!isDraft && <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-bold uppercase px-2 py-0.5 tracking-widest">Live</div>}
                  {isDeploying && <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-primary" /></div>}
                </button>
              </div>
            </WorkflowStep>
          </div>

          {/* --- Sidecar --- */}
          <aside className="space-y-8">
            <PaperCard variant="mesh" shaderProps={{ positions: 20 }} className="border-border/40 bg-background">
              <PaperCardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-primary" />
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Voice</h4>
                  </div>
                  <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary border-primary/20 uppercase">Neural</Badge>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-4 space-y-6">
                <div className="space-y-3">
                  <Select
                    value={selectedVoiceValue || '__default__'}
                    onValueChange={(value) => handleUpdate('voice', value === '__default__' ? null : value)}
                  >
                    <SelectTrigger className="w-full h-12 border-border/40 bg-muted/20 text-left">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Default (Kore)</SelectItem>
                      {GEMINI_VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="p-4 rounded-md bg-muted/30 border border-border/20">
                    <span className="text-sm font-bold text-foreground block">{selectedVoiceMeta?.label || 'Kore'}</span>
                    <span className="text-[10px] text-muted-foreground mt-1 block">{selectedVoiceMeta?.tone || 'Neutral and professional.'}</span>
                    {hasUnsavedVoiceChange && (
                      <span className="text-[9px] uppercase tracking-widest text-primary mt-3 block">
                        {isDraft ? 'Publish to apply voice.' : 'Save assistant to apply voice.'}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  disabled
                  className="w-full h-10 border-border/40 text-[10px] font-bold uppercase tracking-widest opacity-70"
                >
                  Samples Soon
                </Button>
              </PaperCardContent>
            </PaperCard>

            {/* Voice Lab — always visible, including drafts. Lives directly under the Voice card. Scope: VAD/Speech Detection only. */}
            <PaperCard className="border-primary/30 bg-primary/[0.02]">
              <PaperCardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <Settings2 size={14} className="text-primary" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Voice Lab</h4>
                  <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary border-primary/20 uppercase">Beta</Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="About Voice Lab"
                      >
                        <Info size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-[11px] leading-relaxed">
                      Fine-tune how the agent listens — when to start hearing the caller, when to decide they&apos;re done, and how much padding to capture around speech. Voice selection lives in the Voice card above.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-3 space-y-4">
                {/* Speech Detection (VAD) tweaks */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">Speech Detection</h5>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                      Tunes how the agent decides the caller is speaking or done. Defaults work well — only nudge if you see misfires.
                    </p>
                  </div>

                  {/* Start of Speech */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                      Start of Speech Sensitivity
                    </label>
                    <Select
                      value={vad.start_of_speech_sensitivity || '__default__'}
                      onValueChange={(value) => updateVad({
                        start_of_speech_sensitivity: value === '__default__' ? null : (value as VadSensitivity),
                      })}
                    >
                      <SelectTrigger className="w-full h-10 border-border/40 bg-muted/20 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        <SelectItem value="HIGH">High — reacts quickly</SelectItem>
                        <SelectItem value="LOW">Low — needs clearer speech</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic leading-relaxed">
                      How eagerly to register the caller has started speaking. <span className="font-semibold">High</span> jumps in fast (interrupts the agent quicker); <span className="font-semibold">Low</span> ignores small noises and breaths.
                    </p>
                  </div>

                  {/* End of Speech */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                      End of Speech Sensitivity
                    </label>
                    <Select
                      value={vad.end_of_speech_sensitivity || '__default__'}
                      onValueChange={(value) => updateVad({
                        end_of_speech_sensitivity: value === '__default__' ? null : (value as VadSensitivity),
                      })}
                    >
                      <SelectTrigger className="w-full h-10 border-border/40 bg-muted/20 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        <SelectItem value="HIGH">High — replies faster</SelectItem>
                        <SelectItem value="LOW">Low — waits for longer pauses</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic leading-relaxed">
                      How quickly to decide the caller is done speaking. <span className="font-semibold">High</span> replies sooner; <span className="font-semibold">Low</span> is more patient — better for slow speakers or callers who pause mid-sentence.
                    </p>
                  </div>

                  {/* Prefix Padding */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                      Prefix Padding
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={VAD_PREFIX_PADDING_MAX}
                        step={10}
                        value={vad.prefix_padding_ms ?? ''}
                        onChange={(e) => updateVad({ prefix_padding_ms: parseMsInput(e.target.value, VAD_PREFIX_PADDING_MAX) })}
                        placeholder="Default"
                        className="h-9 bg-muted/20 border-border/40 font-mono text-sm focus:border-primary transition-all rounded-md px-3"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 shrink-0">ms</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic leading-relaxed">
                      Audio captured <em>before</em> speech is detected, in milliseconds. Helps avoid clipping the caller&apos;s first syllable. Leave blank for the Gemini default.
                    </p>
                  </div>

                  {/* Silence Duration */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                      Silence Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={VAD_SILENCE_DURATION_MAX}
                        step={10}
                        value={vad.silence_duration_ms ?? ''}
                        onChange={(e) => updateVad({ silence_duration_ms: parseMsInput(e.target.value, VAD_SILENCE_DURATION_MAX) })}
                        placeholder="Default"
                        className="h-9 bg-muted/20 border-border/40 font-mono text-sm focus:border-primary transition-all rounded-md px-3"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 shrink-0">ms</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 px-1 italic leading-relaxed">
                      How many milliseconds of silence count as the caller having stopped, in milliseconds. Higher = more patient agent; lower = faster turn-taking but risks cutting the caller off.
                    </p>
                  </div>
                </div>
              </PaperCardContent>
            </PaperCard>

            <div className="space-y-6 px-4">
              <div className="flex items-center gap-2 text-muted-foreground/60 border-b border-border/20 pb-3">
                <Settings2 size={14} />
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Config</h4>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Direction', value: isInbound ? 'Inbound' : 'Outbound' },
                  { label: 'Model', value: currentAssistant.model || 'GPT-4 Omni' },
                  { label: 'Accent', value: currentAssistant.speakingAccent || 'Default' },
                  { label: 'Knowledge', value: libraryItems.find(kb => kb.id === currentAssistant.knowledgeBase)?.filename || 'None' },
                ].map((spec) => (
                  <div key={spec.label} className="flex justify-between py-1 border-b border-border/10">
                    <span className="text-xs text-muted-foreground">{spec.label}</span>
                    <span className="text-xs font-bold text-foreground truncate ml-2 max-w-[160px]">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <LibraryWorkshop isOpen={isWorkshopOpen} onClose={() => setIsWorkshopOpen(false)} />
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </motion.div>
  );
}
