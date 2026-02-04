'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  CalendarClock, 
  Settings2, 
  Bot, 
  ShieldCheck,
  Zap,
  Activity,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useTrunks } from '@/app/hooks/use-trunks';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import {
  Campaign,
  CampaignProvider,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';
import { saveCampaignConfig } from '@/lib/utils/campaign-storage';
import { cn } from '@/lib/utils';

const { DEFAULTS, LIMITS } = CAMPAIGN_API_CONFIG;

// Timezones (Standardized)
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
];

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated?: (campaign: Campaign) => void;
}

interface FormData {
  name: string;
  description: string;
  assistantId: string;
  provider: CampaignProvider;
  trunkName: string;
  maxConcurrent: number;
  callsPerSecond: number;
  dailyStartTime: string;
  dailyEndTime: string;
  timezone: string;
  maxRetries: number;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  assistantId: '',
  provider: 'vobiz',
  trunkName: '',
  maxConcurrent: DEFAULTS.MAX_CONCURRENT,
  callsPerSecond: DEFAULTS.CALLS_PER_SECOND,
  dailyStartTime: DEFAULTS.DAILY_START_TIME,
  dailyEndTime: DEFAULTS.DAILY_END_TIME,
  timezone: DEFAULTS.TIMEZONE,
  maxRetries: DEFAULTS.MAX_RETRIES,
};

// --- Sub-Components ---

const StepHeader = ({ number, title, active }: { number: string, title: string, active: boolean }) => (
    <div className={cn("flex items-center gap-3 transition-colors duration-300", active ? "text-foreground" : "text-muted-foreground/40")}>
        <span className="text-[10px] font-mono font-bold">{number}</span>
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
    </div>
);

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCampaignCreated,
}: CreateCampaignModalProps) {
  const { assistants } = useAssistants();
  const { trunks } = useTrunks({ checkAssignments: false });
  const { createCampaign, loading } = useCampaignApi();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTrunkChange = (trunkName: string) => {
    const trunk = trunks.find((t) => t.name === trunkName);
    if (trunk) {
      handleChange('trunkName', trunkName);
      const provider = trunk.name.toLowerCase().includes('twilio') ? 'twilio' : 'vobiz';
      handleChange('provider', provider);
    }
  };

  const handleSubmit = async () => {
    try {
      const campaign = await createCampaign({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        provider: formData.provider,
        trunk_name: formData.trunkName,
        max_concurrent: formData.maxConcurrent,
        calls_per_second: formData.callsPerSecond,
        daily_start_time: formData.dailyStartTime,
        daily_end_time: formData.dailyEndTime,
        timezone: formData.timezone,
        max_retries: formData.maxRetries,
      });

      toast.success('Operation Initialized');
      saveCampaignConfig({
        campaignId: campaign.id,
        assistantId: formData.assistantId,
        trunkName: formData.trunkName,
        provider: formData.provider,
        updatedAt: new Date().toISOString(),
      });
      setFormData(initialFormData);
      setStep(1);
      onOpenChange(false);
      onCampaignCreated?.(campaign);
    } catch (error) {
      // Hook handles error state
    }
  };

  const isStep1Valid = formData.name && formData.assistantId;
  const isStep2Valid = formData.trunkName;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[60]" 
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l border-border shadow-2xl z-[70] flex flex-col font-sans"
          >
            {/* Header */}
            <div className="p-8 border-b border-border/40 flex items-center justify-between bg-muted/5">
                <div className="space-y-1">
                    <h2 className="text-xl font-medium tracking-tight text-foreground">Launch Operation</h2>
                    <div className="flex gap-4 pt-2">
                        <StepHeader number="01" title="Identity" active={step === 1} />
                        <div className="h-px w-4 bg-border/40 self-center" />
                        <StepHeader number="02" title="Config" active={step === 2} />
                        <div className="h-px w-4 bg-border/40 self-center" />
                        <StepHeader number="03" title="Schedule" active={step === 3} />
                    </div>
                </div>
                <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={20} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Operation Name</label>
                            <Input 
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g. Q1 Renewal Campaign" 
                                className="bg-background border-border/40 h-12 text-base font-medium focus:border-primary transition-all rounded-md"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Assigned Agent</label>
                            <div className="grid grid-cols-1 gap-3">
                                {assistants.map((assistant) => (
                                    <div 
                                        key={assistant.id}
                                        onClick={() => handleChange('assistantId', assistant.id)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-md border cursor-pointer transition-all hover:border-primary/40",
                                            formData.assistantId === assistant.id 
                                                ? "bg-primary/5 border-primary/40 shadow-sm" 
                                                : "bg-background border-border/40 hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", formData.assistantId === assistant.id ? "bg-primary text-black" : "bg-muted text-muted-foreground")}>
                                            <Bot size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground">{assistant.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{assistant.model || 'Standard'}</span>
                                        </div>
                                        {formData.assistantId === assistant.id && <Sparkles size={16} className="ml-auto text-primary" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Brief (Optional)</label>
                            <Textarea 
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Internal notes about this operation..."
                                className="bg-background border-border/40 min-h-[100px] resize-none"
                            />
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Line Provider</label>
                            <div className="grid grid-cols-1 gap-3">
                                {trunks.map((trunk) => (
                                    <div 
                                        key={trunk.name}
                                        onClick={() => handleTrunkChange(trunk.name)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-md border cursor-pointer transition-all hover:border-primary/40",
                                            formData.trunkName === trunk.name 
                                                ? "bg-primary/5 border-primary/40 shadow-sm" 
                                                : "bg-background border-border/40 hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", formData.trunkName === trunk.name ? "bg-primary text-black" : "bg-muted text-muted-foreground")}>
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground">{trunk.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Sip Trunk</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-muted/5 border border-border/40 rounded-md space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings2 size={16} className="text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Throttling</span>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Concurrency</label>
                                    <select 
                                        value={formData.maxConcurrent}
                                        onChange={(e) => handleChange('maxConcurrent', Number(e.target.value))}
                                        className="w-full h-10 bg-background border border-border/40 rounded-md px-3 text-xs font-mono"
                                    >
                                        {[1, 5, 10, 20, 50].map(n => <option key={n} value={n}>{n} Lines</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Rate Limit</label>
                                    <select 
                                        value={formData.callsPerSecond}
                                        onChange={(e) => handleChange('callsPerSecond', Number(e.target.value))}
                                        className="w-full h-10 bg-background border border-border/40 rounded-md px-3 text-xs font-mono"
                                    >
                                        {[1, 2, 5, 10].map(n => <option key={n} value={n}>{n} CPS</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Active Hours</label>
                            <div className="flex items-center gap-4">
                                <Input 
                                    type="time" 
                                    value={formData.dailyStartTime}
                                    onChange={(e) => handleChange('dailyStartTime', e.target.value)}
                                    className="h-12 bg-background border-border/40 font-mono text-sm"
                                />
                                <span className="text-muted-foreground text-xs uppercase tracking-widest">To</span>
                                <Input 
                                    type="time" 
                                    value={formData.dailyEndTime}
                                    onChange={(e) => handleChange('dailyEndTime', e.target.value)}
                                    className="h-12 bg-background border-border/40 font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Region</label>
                            <div className="grid grid-cols-1 gap-3">
                                {TIMEZONES.map((tz) => (
                                    <div 
                                        key={tz.value}
                                        onClick={() => handleChange('timezone', tz.value)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all hover:border-primary/40",
                                            formData.timezone === tz.value 
                                                ? "bg-primary/5 border-primary/40" 
                                                : "bg-background border-border/40"
                                        )}
                                    >
                                        <span className="text-xs font-medium text-foreground">{tz.label}</span>
                                        {formData.timezone === tz.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-md bg-yellow-500/5 border border-yellow-500/20 flex gap-3 items-start">
                            <Zap size={16} className="text-yellow-600 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest">Ready to Launch</p>
                                <p className="text-[10px] text-yellow-600/80 leading-relaxed">
                                    Your campaign will utilize {formData.maxConcurrent} lines. Ensure you have sufficient credits in the Treasury.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-border/40 bg-muted/5 flex justify-between items-center">
                {step > 1 ? (
                    <button onClick={() => setStep((s) => Math.max(1, s - 1) as any)} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Back</button>
                ) : <div />}
                
                {step < 3 ? (
                    <Button 
                        onClick={() => setStep((s) => Math.min(3, s + 1) as any)}
                        disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                        className="h-10 px-6 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"
                    >
                        Next Step <ArrowRight size={14} />
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="h-10 px-6 gap-2 bg-green-600 hover:bg-green-700 text-white transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Activity size={14} />}
                        Execute Mission
                    </Button>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}