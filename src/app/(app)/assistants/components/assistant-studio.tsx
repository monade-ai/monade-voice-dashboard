'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trash2,
  Zap,
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
  const { corpora, attachToAssistant, detachFromAssistant, toggleTools, toggleEndCallTool } = useRagCorpus();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [isTogglingTools, setIsTogglingTools] = useState(false);
  const [isTogglingCallCompletion, setIsTogglingCallCompletion] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isDraft = currentAssistant?.id.startsWith('local-');

  // Reset dirty flag when assistant changes
  useEffect(() => {
    setIsDirty(false);
    setSaveStatus('idle');
  }, [currentAssistant?.id]);

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
      const { id, createdAt, knowledgeBase, dispatch_rule_id, ...updates } = currentAssistant;
      await saveAssistantUpdates(id, {
        ...updates,
        knowledgeBaseId: knowledgeBase,
      });
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
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
          setIsDirty(false);
        }
      }
    } finally {
      setIsDeploying(false);
    }
  };

  if (!currentAssistant) return null;

  const isInbound = currentAssistant.call_direction === 'inbound';

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
                {/* Tools Toggle */}
                <div className={cn(
                  'flex items-center justify-between p-4 rounded-md border border-border/40 bg-muted/[0.03]',
                  !currentAssistant.enableTools && 'opacity-50',
                )}>
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
                          ? 'Agent can use tools (RAG search) during calls'
                          : 'Tools are disabled for this agent'}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={isTogglingTools}
                    onClick={async () => {
                      setIsTogglingTools(true);
                      const newValue = !currentAssistant.enableTools;
                      const ok = await toggleTools(currentAssistant.id, newValue);
                      if (ok) {
                        setCurrentAssistant({ ...currentAssistant, enableTools: newValue });
                      }
                      setIsTogglingTools(false);
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: currentAssistant.enableTools ? '#22c55e' : 'hsl(var(--muted))' }}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                        currentAssistant.enableTools ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                    {isTogglingTools && (
                      <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
                    )}
                  </button>
                </div>

                {/* RAG Corpus Attach */}
                <div className={cn('space-y-2', !currentAssistant.enableTools && 'opacity-50')}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">RAG Corpus</label>
                  <p className="text-[10px] text-muted-foreground/60 px-1 italic mb-2">
                    Attach a RAG corpus so the agent can search through your documents during live calls. Create corpora from the RAG Corpora page.
                  </p>
                  {!currentAssistant.enableTools && (
                    <p className="text-[10px] text-muted-foreground/70 px-1">
                      Turn on Tool Usage first to configure RAG.
                    </p>
                  )}
                  {(() => {
                    // Detect currently attached corpus
                    const attachedResource = currentAssistant.toolsConfig?.tools
                      ?.find((t: any) => t.type === 'vertex_rag' && t.enabled)
                      ?.config?.rag_corpus;
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
                              disabled={!currentAssistant.enableTools}
                              onClick={async () => {
                                const ok = await detachFromAssistant(currentAssistant.id);
                                if (ok) {
                                  setCurrentAssistant({
                                    ...currentAssistant,
                                    enableTools: false,
                                    toolsConfig: null,
                                  });
                                }
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest h-8 text-red-500 border-red-500/30 hover:bg-red-500/5"
                            >
                              Detach
                            </Button>
                          </div>
                        ) : (
                          <Select
                            disabled={!currentAssistant.enableTools}
                            value="__none__"
                            onValueChange={async (corpusId) => {
                              if (corpusId === '__none__') return;
                              const ok = await attachToAssistant(currentAssistant.id, corpusId);
                              if (ok) {
                                // Re-fetch assistant to get updated toolsConfig
                                setCurrentAssistant({
                                  ...currentAssistant,
                                  enableTools: true,
                                });
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

                {/* Call Completion Tool Toggle */}
                <div className="flex items-center justify-between p-4 rounded-md border border-border/40 bg-muted/[0.03]">
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
                          ? 'Choose whether the agent can end calls using function calling'
                          : 'Enable Tool Usage above for this to take effect during calls'}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={isTogglingCallCompletion || !currentAssistant.enableTools}
                    onClick={async () => {
                      setIsTogglingCallCompletion(true);
                      const isEnabled = !!currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled;
                      const newValue = !isEnabled;
                      const result = await toggleEndCallTool(currentAssistant.id, newValue, currentAssistant.toolsConfig);
                      if (result) {
                        const updatedToolsConfig = result?.toolsConfig || result?.assistant?.toolsConfig || {
                          ...(currentAssistant.toolsConfig || {}),
                          max_tool_steps: currentAssistant.toolsConfig?.max_tool_steps ?? 3,
                          tools: [
                            ...(Array.isArray(currentAssistant.toolsConfig?.tools)
                              ? currentAssistant.toolsConfig.tools.filter((tool: any) => tool?.type !== 'end_call')
                              : []),
                            { type: 'end_call', enabled: newValue },
                          ],
                        };
                        setCurrentAssistant({
                          ...currentAssistant,
                          toolsConfig: updatedToolsConfig,
                        });
                      }
                      setIsTogglingCallCompletion(false);
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled
                        ? '#22c55e'
                        : 'hsl(var(--muted))',
                    }}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                        currentAssistant.toolsConfig?.tools?.find((t: any) => t.type === 'end_call')?.enabled ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                    {isTogglingCallCompletion && (
                      <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
                    )}
                  </button>
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
                <div className="p-4 rounded-md bg-muted/30 border border-border/20 group hover:border-primary/40 cursor-pointer transition-all">
                  <span className="text-sm font-bold text-foreground block">{currentAssistant.voice || 'Aarav'}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1 block">Male / Professional</span>
                </div>
                <Button variant="outline" className="w-full h-10 border-border/40 text-[10px] font-bold uppercase tracking-widest hover:bg-primary transition-all">Test Voice</Button>
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
