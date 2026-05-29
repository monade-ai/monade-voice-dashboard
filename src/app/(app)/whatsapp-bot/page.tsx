'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  FilePenLine,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useVobizWhatsapp, type WhatsappChannel } from '@/app/hooks/use-vobiz-whatsapp';
import {
  DEFAULT_WHATSAPP_BOT_CONFIG,
  type SaveWhatsappBotConfigPayload,
  type WhatsappBotConfig,
  type WhatsappBotGenerationConfig,
  type WhatsappBotModel,
  type WhatsappBotPrompt,
  type WhatsappBotQualificationConfig,
  useWhatsappBot,
} from '@/app/hooks/use-whatsapp-bot';
import { ChannelStatusBadge } from '@/app/(app)/whatsapp/components/status-badges';
import { cn } from '@/lib/utils';

const MODEL_OPTIONS: Array<{ value: WhatsappBotModel; label: string; blurb: string }> = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', blurb: 'Fastest baseline with no thinking controls.' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', blurb: 'Supports thinking budgets for more deliberate replies.' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', blurb: 'Uses thinking levels for lightweight guided reasoning.' },
];

const CRM_LEAD_EVENT_TYPE = 'whatsapp.lead_qualified' as const;

const CRM_DEDUPE_OPTIONS = [
  { value: '86400', label: '1 day' },
  { value: '604800', label: '7 days' },
  { value: '2592000', label: '30 days' },
  { value: '7776000', label: '90 days' },
];

const WHATSAPP_CRM_LLMS_HELPER = `# WhatsApp CRM lead sync guidance

You are writing a WhatsApp bot prompt for a bot that can notify the business CRM when a conversation reaches a clear sales, support, admission, booking, or follow-up outcome.

When the conversation clearly satisfies one of the configured business criteria or outcome tags, instruct the bot to propose this action name exactly:

trigger_bot_flow

The bot should return the action in this JSON shape when the CRM flow should run:

{
  "reply_text": "customer-facing message",
  "actions": [
    {
      "type": "trigger_bot_flow",
      "outcome": "interested|not_interested|certain|uncertain|callback_requested|custom_outcome",
      "reason": "short reason grounded in the conversation",
      "fields": {
        "field_name": "value supported by the conversation"
      }
    }
  ]
}

Only propose the action when the user explicitly matches the configured criteria. Good triggers include confirmed interest, a callback or demo request, a purchase or appointment step, a human follow-up request, or enough CRM-ready details such as name, product interest, location, timing, budget, or requirement.

Do not propose the action when the user is only greeting, browsing casually, declining, angry, asking to stop, not the actual lead, ambiguous, or when missing facts would need to be invented.

If triggered, include a concise outcome label, reason, and extracted fields supported by the conversation. If the CRM flow should not run, return an empty actions array. Never tell the customer about internal tools, webhooks, JSON, verification, or CRM automation.`;

type PromptDraft = {
  id?: string;
  name: string;
  filename: string;
  prompt_text: string;
};

type BotFormState = {
  enabled: boolean;
  whatsapp_bot_prompt_id: string;
  model: WhatsappBotModel;
  temperature: string;
  top_p: string;
  max_output_tokens: string;
  thinkingBudgetMode: 'off' | 'dynamic' | 'custom';
  customThinkingBudget: string;
  thinking_level: 'minimal' | 'low' | 'medium' | 'high';
  qualification_enabled: boolean;
  qualification_min_confidence: string;
  qualification_dedupe_window_seconds: string;
  qualification_include_conversation: boolean;
  qualification_include_call_context: boolean;
  qualification_criteria_addendum: string;
};

const createPromptDraft = (prompt?: Partial<PromptDraft>): PromptDraft => ({
  id: prompt?.id,
  name: prompt?.name ?? '',
  filename: prompt?.filename ?? '',
  prompt_text: prompt?.prompt_text ?? '',
});

const buildFormFromConfig = (config?: WhatsappBotConfig | null): BotFormState => {
  const source = config ?? {
    ...DEFAULT_WHATSAPP_BOT_CONFIG,
    whatsapp_channel_connection_id: '',
  };
  const thinkingBudget = source.generation_config.thinking_budget;
  const qualification = source.qualification_config ?? DEFAULT_WHATSAPP_BOT_CONFIG.qualification_config;

  return {
    enabled: source.enabled,
    whatsapp_bot_prompt_id: source.whatsapp_bot_prompt_id ?? '',
    model: source.model,
    temperature: String(source.generation_config.temperature),
    top_p: String(source.generation_config.top_p),
    max_output_tokens: String(source.generation_config.max_output_tokens),
    thinkingBudgetMode: thinkingBudget === -1 ? 'dynamic' : thinkingBudget && thinkingBudget > 0 ? 'custom' : 'off',
    customThinkingBudget: thinkingBudget && thinkingBudget > 0 ? String(thinkingBudget) : '512',
    thinking_level: source.generation_config.thinking_level ?? 'minimal',
    qualification_enabled: Boolean(qualification?.enabled),
    qualification_min_confidence: String(qualification?.min_confidence ?? 0.8),
    qualification_dedupe_window_seconds: String(qualification?.dedupe_window_seconds ?? 2592000),
    qualification_include_conversation: qualification?.include_conversation ?? true,
    qualification_include_call_context: qualification?.include_call_context ?? true,
    qualification_criteria_addendum: qualification?.criteria_addendum ?? '',
  };
};

const sanitizeFilename = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const serializeBotPayload = (form: BotFormState): SaveWhatsappBotConfigPayload => {
  const generation_config: WhatsappBotGenerationConfig = {
    temperature: Number(form.temperature),
    top_p: Number(form.top_p),
    max_output_tokens: Number(form.max_output_tokens),
  };

  if (form.model === 'gemini-2.5-flash') {
    generation_config.thinking_budget = form.thinkingBudgetMode === 'dynamic'
      ? -1
      : form.thinkingBudgetMode === 'custom'
        ? Number(form.customThinkingBudget)
        : 0;
  }

  if (form.model === 'gemini-3.1-flash-lite') {
    generation_config.thinking_level = form.thinking_level;
  }

  const qualification_config: WhatsappBotQualificationConfig = form.qualification_enabled
    ? {
      enabled: true,
      event_type: CRM_LEAD_EVENT_TYPE,
      min_confidence: Number(form.qualification_min_confidence),
      dedupe_window_seconds: Number(form.qualification_dedupe_window_seconds),
      include_conversation: form.qualification_include_conversation,
      include_call_context: form.qualification_include_call_context,
      criteria_addendum: form.qualification_criteria_addendum.trim(),
    }
    : {
      enabled: false,
    };

  return {
    enabled: form.enabled,
    whatsapp_bot_prompt_id: form.whatsapp_bot_prompt_id || null,
    model: form.model,
    generation_config,
    qualification_config,
  };
};

const formatChannelLabel = (channel: WhatsappChannel) => (
  channel.label || channel.display_name || channel.phone_number || channel.id
);

function PromptEditorDialog({
  open,
  onOpenChange,
  draft,
  saving,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: PromptDraft;
  saving: boolean;
  onDraftChange: (updates: Partial<PromptDraft>) => void;
  onSubmit: () => Promise<void>;
}) {
  const isEditing = Boolean(draft.id);
  const canSubmit = draft.name.trim() && draft.filename.trim() && draft.prompt_text.trim();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] border-border/40 bg-background/95 backdrop-blur-xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <FilePenLine size={18} className="text-primary" />
            {isEditing ? 'Edit Bot Prompt' : 'Create Bot Prompt'}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Prompt files define the personality, tone, and response rules for inbound WhatsApp conversations on any connected sender number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Prompt Name</Label>
              <Input
                value={draft.name}
                onChange={(event) => onDraftChange({ name: event.target.value })}
                placeholder="Default WhatsApp Bot Prompt"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Filename</Label>
              <Input
                value={draft.filename}
                onChange={(event) => onDraftChange({ filename: sanitizeFilename(event.target.value) })}
                placeholder="default-whatsapp-bot.txt"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Prompt Text</Label>
            <Textarea
              value={draft.prompt_text}
              onChange={(event) => onDraftChange({ prompt_text: event.target.value })}
              placeholder="You are Monade's WhatsApp assistant. Keep replies concise, friendly, and grounded in the current chat."
              className="min-h-[320px] bg-muted/10 border-border/30"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || saving}
            onClick={() => onSubmit()}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEditing ? 'Save Prompt' : 'Create Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WhatsappBotPage() {
  const whatsapp = useVobizWhatsapp();
  const {
    loadingPrompts,
    loadingConfigs,
    savingPrompt,
    savingConfig,
    deletingPromptId,
    fetchPrompts,
    fetchPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    fetchConfigs,
    saveConfig,
  } = useWhatsappBot();

  const { channels, loadingChannels } = whatsapp;

  const [prompts, setPrompts] = useState<WhatsappBotPrompt[]>([]);
  const [configs, setConfigs] = useState<WhatsappBotConfig[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [form, setForm] = useState<BotFormState>(() => buildFormFromConfig());
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState<PromptDraft>(createPromptDraft());
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  const [llmsCopyState, setLlmsCopyState] = useState<'idle' | 'copied'>('idle');
  const effectiveSelectedChannelId = selectedChannelId || channels[0]?.id || '';

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === effectiveSelectedChannelId) ?? null,
    [channels, effectiveSelectedChannelId],
  );

  const selectedConfig = useMemo(
    () => configs.find((config) => config.whatsapp_channel_connection_id === effectiveSelectedChannelId) ?? null,
    [configs, effectiveSelectedChannelId],
  );

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === form.whatsapp_bot_prompt_id) ?? null,
    [form.whatsapp_bot_prompt_id, prompts],
  );

  const loadPageData = useCallback(async () => {
    const [nextPrompts, nextConfigs] = await Promise.all([
      fetchPrompts(),
      fetchConfigs(),
    ]);
    setPrompts(nextPrompts);
    setConfigs(nextConfigs);
  }, [fetchConfigs, fetchPrompts]);

  useEffect(() => {
    Promise.resolve().then(() => loadPageData().catch(() => undefined));
  }, [loadPageData]);

  useEffect(() => {
    if (!effectiveSelectedChannelId) return;

    Promise.resolve().then(() => {
      setForm(buildFormFromConfig(selectedConfig ? {
        ...selectedConfig,
        whatsapp_channel_connection_id: effectiveSelectedChannelId,
      } : {
        ...DEFAULT_WHATSAPP_BOT_CONFIG,
        whatsapp_channel_connection_id: effectiveSelectedChannelId,
      }));
      setConfigErrors([]);
    });
  }, [effectiveSelectedChannelId, selectedConfig]);

  const serializedCurrent = useMemo(() => JSON.stringify(serializeBotPayload(form)), [form]);
  const serializedSaved = useMemo(() => JSON.stringify(serializeBotPayload(buildFormFromConfig(selectedConfig ? {
    ...selectedConfig,
    whatsapp_channel_connection_id: effectiveSelectedChannelId,
  } : {
    ...DEFAULT_WHATSAPP_BOT_CONFIG,
    whatsapp_channel_connection_id: effectiveSelectedChannelId,
  }))), [effectiveSelectedChannelId, selectedConfig]);
  const isDirty = effectiveSelectedChannelId ? serializedCurrent !== serializedSaved : false;

  const handlePromptDraftChange = (updates: Partial<PromptDraft>) => {
    setPromptDraft((current) => {
      const next = { ...current, ...updates };
      if (updates.name !== undefined && !current.id && !current.filename) {
        next.filename = `${sanitizeFilename(updates.name || 'whatsapp-bot-prompt') || 'whatsapp-bot-prompt'}.txt`;
      }

      return next;
    });
  };

  const openCreatePrompt = () => {
    setPromptDraft(createPromptDraft({
      filename: 'whatsapp-bot-prompt.txt',
    }));
    setPromptDialogOpen(true);
  };

  const openEditPrompt = async (promptId: string) => {
    const prompt = await fetchPrompt(promptId);
    if (!prompt) return;
    setPromptDraft(createPromptDraft({
      id: prompt.id,
      name: prompt.name,
      filename: prompt.filename,
      prompt_text: prompt.prompt_text ?? '',
    }));
    setPromptDialogOpen(true);
  };

  const handleSubmitPrompt = async () => {
    const payload = {
      name: promptDraft.name.trim(),
      filename: promptDraft.filename.trim(),
      prompt_text: promptDraft.prompt_text.trim(),
    };
    if (!payload.name || !payload.filename || !payload.prompt_text) return;

    if (promptDraft.id) {
      const updated = await updatePrompt(promptDraft.id, payload);
      if (updated) {
        setPrompts((current) => current.map((prompt) => (prompt.id === updated.id ? updated : prompt)));
      }
    } else {
      const created = await createPrompt(payload);
      if (created) {
        setPrompts((current) => [created, ...current]);
        setForm((current) => ({ ...current, whatsapp_bot_prompt_id: created.id }));
      }
    }

    setPromptDialogOpen(false);
    setPromptDraft(createPromptDraft());
  };

  const handleDeletePrompt = async (promptId: string) => {
    await deletePrompt(promptId);
    setPrompts((current) => current.filter((prompt) => prompt.id !== promptId));
    setConfigs((current) => current.map((config) => (
      config.whatsapp_bot_prompt_id === promptId
        ? { ...config, whatsapp_bot_prompt_id: null, whatsapp_bot_prompt: null }
        : config
    )));
    if (form.whatsapp_bot_prompt_id === promptId) {
      setForm((current) => ({ ...current, whatsapp_bot_prompt_id: '' }));
    }
  };

  const handleModelChange = (model: WhatsappBotModel) => {
    setForm((current) => {
      if (model === 'gemini-2.0-flash') {
        return {
          ...current,
          model,
          thinkingBudgetMode: 'off',
          customThinkingBudget: '512',
          thinking_level: 'minimal',
        };
      }
      if (model === 'gemini-2.5-flash') {
        return {
          ...current,
          model,
          thinkingBudgetMode: 'off',
          customThinkingBudget: current.customThinkingBudget || '512',
          thinking_level: 'minimal',
        };
      }

      return {
        ...current,
        model,
        thinkingBudgetMode: 'off',
        customThinkingBudget: '512',
        thinking_level: current.thinking_level || 'minimal',
      };
    });
    setConfigErrors([]);
  };

  const handleCopyLlmsHelper = async () => {
    if (!form.qualification_enabled) return;

    try {
      await navigator.clipboard.writeText(WHATSAPP_CRM_LLMS_HELPER);
      setLlmsCopyState('copied');
      toast.success('llms.txt helper copied');
      setTimeout(() => setLlmsCopyState('idle'), 2200);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not copy llms.txt helper');
    }
  };

  const handleSave = async () => {
    if (!effectiveSelectedChannelId || !form.whatsapp_bot_prompt_id) return;
    setConfigErrors([]);

    try {
      const { config } = await saveConfig(effectiveSelectedChannelId, serializeBotPayload(form));
      if (config) {
        setConfigs((current) => {
          const next = current.filter((item) => item.whatsapp_channel_connection_id !== effectiveSelectedChannelId);

          return [...next, config];
        });
      }
    } catch (error: any) {
      const details = Array.isArray(error?.details) ? error.details : [];
      setConfigErrors(details);
    }
  };

  const noChannels = !loadingChannels && channels.length === 0;
  const canSave = Boolean(effectiveSelectedChannelId && form.whatsapp_bot_prompt_id) && !savingConfig;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <Sparkles size={12} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Inbound Messaging</span>
            </div>
            <h1 className="text-5xl font-medium tracking-tighter text-foreground flex items-center gap-3">
              <Bot className="text-primary" size={40} />
              WhatsApp Bot
            </h1>
            <p className="text-muted-foreground text-sm font-medium max-w-3xl">
              Shape the personality, prompt files, and Gemini response controls for inbound WhatsApp conversations on each connected sender number.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => loadPageData()}
              disabled={loadingPrompts || loadingConfigs}
              className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
            >
              <RefreshCw size={14} className={cn((loadingPrompts || loadingConfigs) && 'animate-spin')} />
              Reload
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] bg-foreground text-background hover:bg-foreground/90"
            >
              {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Bot Config
            </Button>
          </div>
        </div>

        <PaperCard variant="mesh" shaderProps={{ positions: 24, waveX: 0.38, grainOverlay: 0.88 }} className="border-primary/20">
          <PaperCardContent className="p-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
              <div className="space-y-2">
                <PaperCardTitle>Connected Number</PaperCardTitle>
                <Select value={effectiveSelectedChannelId} onValueChange={setSelectedChannelId} disabled={noChannels}>
                  <SelectTrigger className="h-11 bg-background/90 text-xs">
                    <SelectValue placeholder={noChannels ? 'Connect a WhatsApp channel first' : 'Select a WhatsApp channel'} />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {formatChannelLabel(channel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedChannel ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Label</span>
                    <p className="text-sm font-medium">{selectedChannel.label || '—'}</p>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Display Name</span>
                    <p className="text-sm font-medium">{selectedChannel.display_name || '—'}</p>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">WhatsApp Number</span>
                    <p className="text-sm font-mono">{selectedChannel.phone_number || '—'}</p>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Channel ID</span>
                    <p className="text-[11px] font-mono break-all">{selectedChannel.channel_id || '—'}</p>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Status</span>
                    <ChannelStatusBadge status={selectedChannel.connection_status} />
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/30 bg-background/50 p-6 text-sm text-muted-foreground">
                  {noChannels
                    ? 'No connected WhatsApp sender numbers yet. Add or import a channel from the WhatsApp setup page first.'
                    : 'Pick a connected number to load its bot behavior.'}
                </div>
              )}
            </div>
          </PaperCardContent>
        </PaperCard>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
          <PaperCard variant="default" className="border-border/40">
            <PaperCardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <PaperCardTitle>Prompt Library</PaperCardTitle>
                  <h2 className="text-2xl font-medium tracking-tight">Reusable Bot Prompt Files</h2>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    Create, refine, and reuse prompt files before attaching one to a specific WhatsApp sender number.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={openCreatePrompt}
                  className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] bg-foreground text-background hover:bg-foreground/90"
                >
                  <Plus size={14} />
                  New Prompt
                </Button>
              </div>
            </PaperCardHeader>
            <PaperCardContent className="p-6 pt-0 space-y-4">
              {loadingPrompts ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-primary/50" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Loading prompts...</span>
                </div>
              ) : prompts.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <WandSparkles className="mx-auto text-primary/50" size={28} />
                  <h3 className="text-lg font-medium tracking-tight">No bot prompts yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Create your first prompt file to define how the inbound WhatsApp bot should sound and respond.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {prompts.map((prompt) => {
                    const isSelected = form.whatsapp_bot_prompt_id === prompt.id;

                    return (
                      <PaperCard
                        key={prompt.id}
                        variant="mesh"
                        shaderProps={{ positions: 14, waveX: 0.34, grainOverlay: 0.9 }}
                        className={cn(
                          'border transition-all duration-300',
                          isSelected ? 'border-primary/35 bg-primary/[0.03]' : 'border-border/30',
                        )}
                      >
                        <PaperCardContent className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-medium truncate">{prompt.name}</p>
                              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground truncate">
                                {prompt.filename}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                                Attached
                              </span>
                            )}
                          </div>

                          <div className="rounded-md border border-border/20 bg-background/70 p-3 min-h-[108px]">
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
                              {prompt.prompt_text || 'Prompt preview loads when you open or edit this file.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Button
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              onClick={() => setForm((current) => ({ ...current, whatsapp_bot_prompt_id: prompt.id }))}
                              className={cn(
                                'h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em]',
                                isSelected ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border/40',
                              )}
                            >
                              {isSelected ? 'Attached to Bot' : 'Attach to Bot'}
                            </Button>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => openEditPrompt(prompt.id)}
                                className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                              >
                                <FilePenLine size={13} />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleDeletePrompt(prompt.id)}
                                disabled={deletingPromptId === prompt.id}
                                className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
                              >
                                {deletingPromptId === prompt.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                Delete
                              </Button>
                            </div>
                          </div>
                        </PaperCardContent>
                      </PaperCard>
                    );
                  })}
                </div>
              )}
            </PaperCardContent>
          </PaperCard>

          <div className="space-y-6 xl:sticky xl:top-6">
            <PaperCard variant="default" className="border-border/40">
              <PaperCardHeader className="p-6 pb-4">
                <div className="space-y-1">
                  <PaperCardTitle>Bot Config</PaperCardTitle>
                  <h2 className="text-2xl font-medium tracking-tight">Inbound Reply Behavior</h2>
                  <p className="text-sm text-muted-foreground">
                    Save the full bot config per connected sender number. Prompt attachment and model tuning are independent from post-call flow templates.
                  </p>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-0 space-y-6">
                <div className="rounded-md border border-border/20 bg-muted/[0.03] p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Bot Enabled</span>
                    <p className="text-sm text-muted-foreground">
                      Toggle inbound auto-replies on or off for this WhatsApp sender number.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.enabled}
                    onClick={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      form.enabled ? 'bg-primary' : 'bg-muted',
                    )}
                    disabled={!selectedChannelId}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                        form.enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Attached Prompt</Label>
                  <Select
                    value={form.whatsapp_bot_prompt_id || '__none__'}
                    onValueChange={(value) => setForm((current) => ({ ...current, whatsapp_bot_prompt_id: value === '__none__' ? '' : value }))}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder={prompts.length === 0 ? 'Create a prompt first' : 'Select a prompt file'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No prompt attached</SelectItem>
                      {prompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>{prompt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPrompt && (
                    <p className="text-[11px] text-muted-foreground">
                      Attached file: <span className="font-mono">{selectedPrompt.filename}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Gemini Model</Label>
                  <Select value={form.model} onValueChange={(value: WhatsappBotModel) => handleModelChange(value)}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {MODEL_OPTIONS.find((option) => option.value === form.model)?.blurb}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Temperature</Label>
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step="0.1"
                      value={form.temperature}
                      onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Top P</Label>
                    <Input
                      type="number"
                      min={0.1}
                      max={1}
                      step="0.1"
                      value={form.top_p}
                      onChange={(event) => setForm((current) => ({ ...current, top_p: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Max Output Tokens</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4096}
                      step="1"
                      value={form.max_output_tokens}
                      onChange={(event) => setForm((current) => ({ ...current, max_output_tokens: event.target.value }))}
                    />
                  </div>
                </div>

                {form.model === 'gemini-2.5-flash' && (
                  <div className="space-y-3 rounded-md border border-border/20 bg-muted/[0.03] p-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Thinking Budget</span>
                      <p className="text-sm text-muted-foreground">
                        Choose off for the fastest behavior, dynamic for adaptive reasoning, or set a custom token budget.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-4 items-end">
                      <Select
                        value={form.thinkingBudgetMode}
                        onValueChange={(value: 'off' | 'dynamic' | 'custom') => setForm((current) => ({ ...current, thinkingBudgetMode: value }))}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Off / fastest</SelectItem>
                          <SelectItem value="dynamic">Dynamic</SelectItem>
                          <SelectItem value="custom">Custom budget</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.thinkingBudgetMode === 'custom' ? (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Custom Budget</Label>
                          <Input
                            type="number"
                            min={512}
                            max={24576}
                            step="1"
                            value={form.customThinkingBudget}
                            onChange={(event) => setForm((current) => ({ ...current, customThinkingBudget: event.target.value }))}
                          />
                        </div>
                      ) : (
                        <div className="rounded-md border border-border/20 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                          {form.thinkingBudgetMode === 'dynamic' ? 'Backend will save thinking_budget = -1.' : 'Backend will save thinking_budget = 0.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {form.model === 'gemini-3.1-flash-lite' && (
                  <div className="space-y-3 rounded-md border border-border/20 bg-muted/[0.03] p-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Thinking Level</span>
                      <p className="text-sm text-muted-foreground">
                        Pick how much deliberate reasoning the lite model should use for inbound chat replies.
                      </p>
                    </div>
                    <Select
                      value={form.thinking_level}
                      onValueChange={(value: 'minimal' | 'low' | 'medium' | 'high') => setForm((current) => ({ ...current, thinking_level: value }))}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4 rounded-md border border-border/20 bg-muted/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        <Webhook size={13} className="text-primary" />
                        CRM Lead Sync
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Let the bot notify your CRM webhook when a WhatsApp lead becomes qualified, unqualified, or ready for follow-up.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.qualification_enabled}
                      onClick={() => setForm((current) => ({ ...current, qualification_enabled: !current.qualification_enabled }))}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        form.qualification_enabled ? 'bg-primary' : 'bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                          form.qualification_enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>

                  <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
                    CRM delivery requires a webhook endpoint subscribed to <span className="font-mono text-foreground">{CRM_LEAD_EVENT_TYPE}</span> in Settings.
                  </div>

                  {form.qualification_enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Minimum Confidence</Label>
                          <Input
                            type="number"
                            min={0.5}
                            max={1}
                            step="0.05"
                            value={form.qualification_min_confidence}
                            onChange={(event) => setForm((current) => ({ ...current, qualification_min_confidence: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Repeat Window</Label>
                          <Select
                            value={form.qualification_dedupe_window_seconds}
                            onValueChange={(value) => setForm((current) => ({ ...current, qualification_dedupe_window_seconds: value }))}
                          >
                            <SelectTrigger className="h-10 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CRM_DEDUPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, qualification_include_conversation: !current.qualification_include_conversation }))}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-all',
                            form.qualification_include_conversation ? 'border-primary/35 bg-primary/5' : 'border-border/20 bg-background/70',
                          )}
                        >
                          <span className="text-xs font-medium">Include conversation</span>
                          <span className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full border',
                            form.qualification_include_conversation ? 'border-primary bg-primary text-background' : 'border-border/40',
                          )}>
                            {form.qualification_include_conversation && <Check size={12} />}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, qualification_include_call_context: !current.qualification_include_call_context }))}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-all',
                            form.qualification_include_call_context ? 'border-primary/35 bg-primary/5' : 'border-border/20 bg-background/70',
                          )}
                        >
                          <span className="text-xs font-medium">Include voice-call context</span>
                          <span className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full border',
                            form.qualification_include_call_context ? 'border-primary bg-primary text-background' : 'border-border/40',
                          )}>
                            {form.qualification_include_call_context && <Check size={12} />}
                          </span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Qualification Criteria</Label>
                        <Textarea
                          value={form.qualification_criteria_addendum}
                          onChange={(event) => setForm((current) => ({ ...current, qualification_criteria_addendum: event.target.value }))}
                          maxLength={4000}
                          placeholder="Only qualify if the user clearly confirms interest and wants follow-up."
                          className="min-h-24 bg-background/70 border-border/30 text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Optional business rules appended to the verifier. {form.qualification_criteria_addendum.length}/4000
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 rounded-md border border-border/20 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">llms.txt Prompt Helper</span>
                        <p className="text-xs text-muted-foreground">Copy this into the bot prompt only when CRM Lead Sync is enabled.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyLlmsHelper}
                        disabled={!form.qualification_enabled}
                        className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] border-border/40"
                      >
                        {llmsCopyState === 'copied' ? <Check size={13} /> : <Copy size={13} />}
                        {llmsCopyState === 'copied' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <pre className={cn(
                      'max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-[11px] leading-relaxed',
                      form.qualification_enabled ? 'text-foreground' : 'text-muted-foreground/45',
                    )}>
                      {WHATSAPP_CRM_LLMS_HELPER}
                    </pre>
                  </div>
                </div>

                {configErrors.length > 0 && (
                  <div className="rounded-md border border-destructive/25 bg-destructive/5 p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">Generation Config Errors</p>
                    {configErrors.map((error) => (
                      <p key={error} className="text-sm text-destructive">{error}</p>
                    ))}
                  </div>
                )}

                <div className="rounded-md border border-border/20 bg-background/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Config Snapshot</span>
                      <p className="text-sm text-muted-foreground">Current channel-scoped save payload preview.</p>
                    </div>
                    {isDirty && (
                      <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-orange-500">
                        Unsaved
                      </span>
                    )}
                  </div>
                  <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
                    {JSON.stringify(serializeBotPayload(form), null, 2)}
                  </pre>
                </div>
              </PaperCardContent>
            </PaperCard>
          </div>
        </div>

        <PromptEditorDialog
          open={promptDialogOpen}
          onOpenChange={(open) => {
            setPromptDialogOpen(open);
            if (!open) {
              setPromptDraft(createPromptDraft());
            }
          }}
          draft={promptDraft}
          saving={savingPrompt}
          onDraftChange={handlePromptDraftChange}
          onSubmit={handleSubmitPrompt}
        />
      </main>
    </div>
  );
}
