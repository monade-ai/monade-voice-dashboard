'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Zap, 
  Bot, 
  Volume2, 
  Layers, 
  ShieldCheck, 
  Phone,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Loader2,
  Plus,
  FileText,
  Settings2,
  Rocket,
  Layout,
  FileCode
} from 'lucide-react';

import { useAssistants, Assistant } from '@/app/hooks/use-assistants-context';
import { useLibrary } from '@/app/hooks/use-knowledge-base';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { cn } from '@/lib/utils';
import LiveKitAssistantDualButton from './livekit-assistant-dual-button';
import DeleteConfirmationModal from '../delete-confirmation-modal';
import { LibraryWorkshop } from '@/app/(app)/knowledge-base/components/library-workshop';

// --- Sub-Components: Compressed Scandinavian Design ---

const WorkflowStep = ({ number, title, description, children, action }: { number: string, title: string, description: string, children: React.ReactNode, action?: React.ReactNode }) => (
    <div className="space-y-6 pb-12 border-b border-border/10 last:border-0 last:pb-0 relative">
        <div className="flex items-start justify-between">
            <div className="flex gap-6">
                {/* Increased contrast background number */}
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
    updateAssistantLocally 
  } = useAssistants();
  const { items: libraryItems } = useLibrary();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  
  const isDraft = currentAssistant?.id.startsWith('local-');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performAutoSave = useCallback(async (assistant: Assistant) => {
    setSyncStatus('syncing');
    try {
        if (assistant.id.startsWith('local-')) {
            updateAssistantLocally(assistant.id, assistant);
            setSyncStatus('saved');
        } else {
            const { id, createdAt, knowledgeBase, ...updates } = assistant;
            await saveAssistantUpdates(id, {
                ...updates,
                knowledgeBaseId: knowledgeBase
            });
            setSyncStatus('saved');
        }
    } catch (err) {
        setSyncStatus('error');
    }
  }, [updateAssistantLocally, saveAssistantUpdates]);

  const handleUpdate = (field: keyof Assistant, value: any) => {
    if (!currentAssistant) return;
    const updatedAssistant = { ...currentAssistant, [field]: value };
    setCurrentAssistant(updatedAssistant);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSyncStatus('idle');
    saveTimeoutRef.current = setTimeout(() => performAutoSave(updatedAssistant), 1500);
  };

  const handleDeploy = async () => {
    if (!currentAssistant || isDeploying) return;
    setIsDeploying(true);
    try {
        if (isDraft) {
            const published = await createAssistant(currentAssistant.id, {
                name: currentAssistant.name,
                phoneNumber: currentAssistant.phoneNumber,
                description: currentAssistant.description,
                model: currentAssistant.model,
                voice: currentAssistant.voice,
                knowledgeBaseId: currentAssistant.knowledgeBase
            });
            if (published) setCurrentAssistant(published);
        }
    } finally {
        setIsDeploying(false);
    }
  };

  if (!currentAssistant) return null;

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
                <div className="flex items-center gap-6 mr-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest hidden lg:flex">
                    <div className="flex items-center gap-2">
                        <Zap size={12} className="text-primary" />
                        <span>{currentAssistant.latencyMs || 1800}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-primary" />
                        <span>HD Neural</span>
                    </div>
                </div>

                <LiveKitAssistantDualButton assistant={currentAssistant} />
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
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Phone Line</label>
                                    <Input 
                                        value={currentAssistant.phoneNumber} 
                                        onChange={(e) => handleUpdate('phoneNumber', e.target.value)} 
                                        placeholder="+91 00000 00000" 
                                        className="bg-background border-border/40 h-12 font-mono text-base focus:border-primary transition-all rounded-md px-4" 
                                    />
                                </div>
                            </div>

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
                                <select 
                                    value={currentAssistant.knowledgeBase || ''}
                                    onChange={(e) => handleUpdate('knowledgeBase', e.target.value)}
                                    className="w-full h-12 bg-background border border-border/40 rounded-md px-4 text-sm font-medium focus:border-primary outline-none transition-all cursor-pointer appearance-none shadow-sm"
                                >
                                    <option value="">No memory linked (Standard Mode)</option>
                                    {libraryItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.filename}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Larger Dotted Create CTA */}
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

                    {/* STEP 03: DEPLOYMENT (Now closer) */}
                    <WorkflowStep 
                        number="03" 
                        title="Deploy" 
                        description="Manage the operational lifecycle of this agent."
                    >
                        <div className="flex gap-6">
                            <div className={cn(
                                "flex-1 p-6 rounded-md border text-left transition-all relative overflow-hidden",
                                isDraft ? "border-primary bg-primary/[0.03]" : "border-border/40"
                            )}>
                                <Layout className={cn("mb-3", isDraft ? "text-primary" : "text-muted-foreground")} size={20} />
                                <h4 className="text-base font-bold tracking-tight">Draft</h4>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Saved locally. Ready for testing.</p>
                                {isDraft && <div className="absolute top-0 right-0 bg-primary text-black text-[8px] font-bold uppercase px-2 py-0.5 tracking-widest">Current</div>}
                            </div>

                            <button 
                                onClick={handleDeploy}
                                disabled={!isDraft || isDeploying}
                                className={cn(
                                    "flex-1 p-6 rounded-md border text-left transition-all relative overflow-hidden group/prod",
                                    !isDraft ? "border-green-500 bg-green-500/[0.03]" : "border-border/40 hover:border-green-500/40"
                                )}
                            >
                                <Rocket className={cn("mb-3", !isDraft ? "text-green-500" : "text-muted-foreground group-hover/prod:text-green-500")} size={20} />
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
                                { label: "Model", value: currentAssistant.model || "GPT-4 Omni" },
                                { label: "Provider", value: "Vobiz.ai" }
                            ].map((spec) => (
                                <div key={spec.label} className="flex justify-between py-1 border-b border-border/10">
                                    <span className="text-xs text-muted-foreground">{spec.label}</span>
                                    <span className="text-xs font-bold text-foreground">{spec.value}</span>
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

function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) {
    return <div className={cn("bg-border shrink-0", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} />
}
