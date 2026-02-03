'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  Filter,
  ArrowUpRight,
  FileText
} from 'lucide-react';

import { useLibrary, LibraryItem } from '@/app/hooks/use-knowledge-base';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LibraryWorkshop } from './components/library-workshop';
import { cn } from '@/lib/utils';

// --- Helpers ---

const getRelativeTime = (date: Date) => {
  const diff = (new Date().getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just added";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Generate unique tiny variations for shader based on ID
const getShaderProps = (id: string) => {
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return {
        positions: 20 + (Math.abs(hash) % 15), // Variation between 20-35
        waveX: 0.3 + ((Math.abs(hash) % 40) / 100), // Variation between 0.3-0.7
        grainOverlay: 0.7 + ((Math.abs(hash) % 20) / 100), // Variation between 0.7-0.9
    };
};

// --- Component: MemoryCard (Refined Award-Winning Design) ---

const MemoryCard = ({ 
    item, 
    onDelete,
    connectedAssistants 
}: { 
    item: LibraryItem, 
    onDelete: (id: string) => void,
    connectedAssistants: any[]
}) => {
    const shaderProps = useMemo(() => getShaderProps(item.id), [item.id]);
    const isLinked = connectedAssistants.length > 0;

    return (
        <PaperCard 
            variant="mesh" 
            shaderProps={shaderProps}
            className="group relative h-[240px] border-border/40 hover:border-primary/60 transition-all duration-700 overflow-hidden"
        >
            <PaperCardHeader className="p-6 pb-0">
                <div className="flex justify-end">
                    <button 
                        onClick={() => onDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all duration-300"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </PaperCardHeader>
            
            <PaperCardContent className="px-8 pb-8 h-full flex flex-col justify-between">
                <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                            {getRelativeTime(item.createdAt)}
                        </span>
                        <h3 className="text-2xl font-medium tracking-tight text-foreground leading-tight truncate pr-4" title={item.filename}>
                            {item.filename.replace('.txt', '').replace('.pdf', '')}
                        </h3>
                    </div>

                    {/* Simplified Interlinking (High Contrast) */}
                    <div className="flex flex-wrap gap-2 min-h-[24px]">
                        {isLinked ? (
                            connectedAssistants.map(a => (
                                <span key={a.id} className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-[2px] border border-primary/20">
                                    {a.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 italic">
                                Not linked
                            </span>
                        )}
                    </div>
                </div>

                {/* Circular CTA Button (Bottom Right) */}
                <div className="absolute bottom-6 right-6">
                    <button className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:text-black transition-all duration-500 scale-90 group-hover:scale-100 opacity-80 group-hover:opacity-100">
                        <ArrowUpRight size={20} className="transition-transform duration-500 group-hover:rotate-45" />
                    </button>
                </div>
            </PaperCardContent>
        </PaperCard>
    );
};

// --- Main Page ---

export default function LibraryPage() {
  const { items, isLoading, removeIntelligence } = useLibrary();
  const { assistants } = useAssistants();
  const [search, setSearch] = useState('');
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter(i => i.filename.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const getConnectedAssistants = (kbId: string) => {
    return assistants.filter(a => a.knowledgeBase === kbId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-16">
        
        {/* Header Section (Zen) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/40 pb-12">
            <div className="space-y-3">
                <h1 className="text-6xl font-medium tracking-tighter">The Library</h1>
                <p className="text-muted-foreground text-base max-w-md leading-relaxed">
                    The facts that power your voice. Manage specialized intelligence and memory fragments.
                </p>
            </div>
            <div className="flex items-center gap-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input 
                        placeholder="Recall memory..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-12 w-72 bg-muted/10 border-border/40 text-sm focus:ring-primary focus:border-primary transition-all rounded-md"
                    />
                </div>
                <Button 
                    onClick={() => setIsWorkshopOpen(true)}
                    className="h-12 px-6 gap-3 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[11px] font-bold uppercase tracking-[0.2em]"
                >
                    <Plus size={18} />
                    Add Intelligence
                </Button>
            </div>
        </div>

        {/* Gallery Grid */}
        <section className="space-y-10 pb-40">
            
            <div className="flex items-center justify-between border-b border-border/20 pb-4">
                <div className="flex items-center gap-8">
                    <button className="text-[11px] font-bold uppercase tracking-widest pb-2 border-b-2 border-primary text-foreground transition-all">Archive</button>
                    <button className="text-[11px] font-bold uppercase tracking-widest pb-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all">Linked</button>
                    <button className="text-[11px] font-bold uppercase tracking-widest pb-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all">Standalone</button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                    <ActivityIcon size={12} className="text-primary/40" />
                    <span>{filteredItems.length} Memory Fragments</span>
                </div>
            </div>

            {isLoading ? (
                <div className="py-40 flex flex-col items-center justify-center gap-6">
                    <Loader2 size={40} className="animate-spin text-primary/30" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-muted-foreground animate-pulse">Synchronizing Archive...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="py-40 flex flex-col items-center justify-center gap-8 border border-dashed border-border/40 rounded-xl bg-muted/5">
                    <FileText size={64} className="text-muted-foreground/10" />
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-medium tracking-tight">Memory is empty</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">Upload your first piece of business intelligence to get started.</p>
                    </div>
                    <Button variant="outline" onClick={() => setIsWorkshopOpen(true)} className="uppercase tracking-widest h-12 px-8 text-[11px] font-bold border-border/60 hover:border-primary/60 transition-all">Initialize</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {filteredItems.map((item) => (
                        <MemoryCard 
                            key={item.id} 
                            item={item} 
                            onDelete={removeIntelligence}
                            connectedAssistants={getConnectedAssistants(item.id)}
                        />
                    ))}
                </div>
            )}
        </section>

      </main>

      <LibraryWorkshop 
        isOpen={isWorkshopOpen} 
        onClose={() => setIsWorkshopOpen(false)} 
      />
    </div>
  );
}

function ActivityIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
