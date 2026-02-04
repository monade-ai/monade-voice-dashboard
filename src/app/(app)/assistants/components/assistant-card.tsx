'use client';

import React, { useMemo } from 'react';
import { ArrowUpRight, Zap, Layers, Volume2, ShieldCheck, Cpu, Cloud, Layout } from 'lucide-react';

import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { useAssistants, Assistant } from '@/app/hooks/use-assistants-context';
import { LeadIcon } from '@/components/ui/lead-icon';
import { cn } from '@/lib/utils';

interface AssistantCardProps {
  assistant: Assistant;
  onSelect: (assistant: Assistant) => void;
}

const getShaderProps = (id: string) => {
  const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

  return {
    positions: 15 + (Math.abs(hash) % 10),
    waveX: 0.2 + ((Math.abs(hash) % 30) / 100),
    grainOverlay: 0.95,
  };
};

export function AssistantCard({ assistant, onSelect }: AssistantCardProps) {
  const isDraft = assistant.id.startsWith('local-');
  const shaderProps = useMemo(() => getShaderProps(assistant.id), [assistant.id]);

  return (
    <PaperCard
      variant="mesh"
      shaderProps={shaderProps}
      className={cn(
        'group relative h-[360px] border-border/60 hover:border-primary/80 transition-all duration-700 cursor-pointer overflow-hidden flex flex-col shadow-sm',
        isDraft && 'border-dashed',
      )}
      onClick={() => onSelect(assistant)}
    >
      <PaperCardHeader className="p-8 pb-0 flex justify-between items-start shrink-0">
        <div className="flex items-center gap-5">
          <LeadIcon seed={assistant.id} size={52} />
          <div className="flex flex-col">

            <h3 className="text-3xl font-medium tracking-tighter text-foreground leading-none truncate max-w-[180px]" title={assistant.name}>
              {assistant.name}
            </h3>
          </div>
        </div>
        {!isDraft && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full shadow-lg scale-90 -mr-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">READY</span>
          </div>
        )}
        {isDraft && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full border border-border/40 scale-90 -mr-2">
            <Layout size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">DRAFT</span>
          </div>
        )}
      </PaperCardHeader>

      <PaperCardContent className="px-10 pb-10 flex-1 flex flex-col justify-between mt-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Primary Role</span>
            <p className="text-base text-foreground/90 line-clamp-2 leading-relaxed h-12 font-normal italic">
                    "{assistant.description || 'Provide intelligent customer support and routing logic.'}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-border/20">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu size={14} className="text-primary/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Model</span>
              </div>
              <span className="text-sm font-semibold text-foreground truncate">{assistant.model || 'GPT-4 Omni'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Volume2 size={14} className="text-primary/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Voice</span>
              </div>
              <span className="text-sm font-semibold text-foreground truncate">{assistant.voice || 'Default'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-10 pt-8 border-t border-border/20">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operating History</span>
            <span className="text-lg font-mono font-bold text-foreground tracking-tighter">1,240m Talked</span>
          </div>
            
          <div className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-2xl scale-90 group-hover:scale-100 border border-border/20">
            <ArrowUpRight size={32} />
          </div>
        </div>
      </PaperCardContent>
    </PaperCard>
  );
}