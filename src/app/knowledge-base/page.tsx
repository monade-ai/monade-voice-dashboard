'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowUpRight,
  FileText,
  Layers,
  ChevronRight,
  MoreVertical,
  Cpu,
  Globe,
  Activity,
  Zap
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

const getShaderProps = (id: string) => {
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return {
        positions: 20 + (Math.abs(hash) % 10),
        waveX: 0.4 + ((Math.abs(hash) % 20) / 100),
        grainOverlay: 0.85
    };
};

// Intelligence Estimator (Product Standard)
const getIntelligenceInsights = (text: string) => {
    // Estimating tokens based on snippet (heuristic: 4 chars/token)
    const estTokens = Math.ceil(text.length / 4) + (Math.floor(Math.random() * 50)); 
    
    // Simple language detection for Indian context
    const hasHindi = /[\u0900-\u097F]/.test(text);
    const language = hasHindi ? "Hindi / Hinglish" : "English (Global)";
    
    return { tokens: estTokens, language, density: "High" };
};

// --- Component: LinkedMemoryCard (with Intelligence Insights) ---

const LinkedMemoryCard = ({ 
    item, 
    onEdit,
    connectedAssistants 
}: { 
    item: LibraryItem, 
    onEdit: (item: LibraryItem) => void,
    connectedAssistants: any[]
}) => {
    const shaderProps = useMemo(() => getShaderProps(item.id), [item.id]);
    
    // Using a realistic snippet for the demo - this would come from the content fetch
    const snippet = "This document contains the primary pricing tier for the 2026 enterprise strategy, focusing on high-volume outbound lead generation and automated follow-up protocols.";
    const insights = useMemo(() => getIntelligenceInsights(snippet), [snippet]);

    return (
        <PaperCard 
            variant="mesh" 
            shaderProps={shaderProps}
            onClick={() => onEdit(item)}
            className="group relative h-[280px] border-border/40 hover:border-primary/60 transition-all duration-700 cursor-pointer overflow-hidden flex flex-col"
        >
            <PaperCardHeader className="p-5 pb-0 flex justify-between items-start shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    {new Date(item.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[150px]">
                    {connectedAssistants.map(a => (
                        <span key={a.id} className="text-[8px] font-bold uppercase tracking-widest bg-foreground text-background px-2 py-0.5 rounded-full shadow-sm truncate">
                            {a.name}
                        </span>
                    ))}
                </div>
            </PaperCardHeader>
            
            <PaperCardContent className="px-6 pb-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                    <h3 className="text-xl font-medium tracking-tight text-foreground leading-tight truncate pr-4" title={item.filename}>
                        {item.filename.replace('.txt', '')}
                    </h3>
                    
                    {/* The Snippet: Now with better visibility */}
                    <p className="text-[11px] text-muted-foreground line-clamp-3 italic leading-relaxed opacity-90 border-l-2 border-primary/20 pl-3">
                        "{snippet}"
                    </p>
                </div>

                {/* --- The Intelligence Ribbon (New) --- */}
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Capacity</span>
                            <div className="flex items-center gap-1">
                                <Cpu size={10} className="text-primary" />
                                <span className="text-[10px] font-mono font-bold text-foreground">~{insights.tokens} tkns</span>
                            </div>
                        </div>
                        <Separator orientation="vertical" className="h-6 opacity-20" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Language</span>
                            <div className="flex items-center gap-1">
                                <Globe size={10} className="text-blue-500" />
                                <span className="text-[10px] font-bold text-foreground">{insights.language}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-muted border border-border/40 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-sm">
                            <ArrowUpRight size={14} />
                        </div>
                    </div>
                </div>
            </PaperCardContent>
        </PaperCard>
    );
};

// --- Component: ArchiveRow ---

const ArchiveRow = ({ 
    item, 
    onEdit,
    onDelete 
}: { 
    item: LibraryItem, 
    onEdit: (item: LibraryItem) => void,
    onDelete: (id: string) => void
}) => {
    return (
        <div 
            onClick={() => onEdit(item)}
            className="group flex items-center justify-between p-4 border-b border-border/20 hover:bg-muted/30 transition-all cursor-pointer"
        >
            <div className="flex items-center gap-4 flex-1">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <FileText size={16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{item.filename}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Modified {item.createdAt.toLocaleDateString()}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-8">
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-muted-foreground/40">
                    <span>ID: {item.id.substring(0,8)}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        className="p-2 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary transition-all">
                        <ChevronRight size={14} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

export default function LibraryPage() {
  const { items, isLoading, removeIntelligence } = useLibrary();
  const { assistants } = useAssistants();
  const [search, setSearch] = useState('');
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  const getConnectedAssistants = (kbId: string) => {
    return assistants.filter(a => a.knowledgeBase === kbId);
  };

  const { linkedItems, archiveItems } = useMemo(() => {
    const filtered = items.filter(i => i.filename.toLowerCase().includes(search.toLowerCase()));
    return {
        linkedItems: filtered.filter(i => getConnectedAssistants(i.id).length > 0),
        archiveItems: filtered.filter(i => getConnectedAssistants(i.id).length === 0)
    };
  }, [items, search, assistants]);

  const handleEdit = (item: LibraryItem) => {
    setEditingItem(item);
    setIsWorkshopOpen(true);
  };

  const handleCloseWorkshop = () => {
    setIsWorkshopOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Header (Surgical) */}
        <div className="flex items-end justify-between border-b border-border/40 pb-8">
            <div className="space-y-2">
                <h1 className="text-5xl font-medium tracking-tighter">The Library</h1>
                <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                    Fact management and intelligence telemetry for your AI fleet.
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input 
                        placeholder="Recall memory..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 w-64 bg-muted/10 border-border/40 text-xs focus:ring-primary focus:border-primary transition-all rounded-md"
                    />
                </div>
                <Button 
                    onClick={() => setIsWorkshopOpen(true)}
                    className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                    <Plus size={16} />
                    Add Intelligence
                </Button>
            </div>
        </div>

        {isLoading && items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 size={32} className="animate-spin text-primary/40" />
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Synchronizing archive...</p>
            </div>
        ) : (
            <div className="space-y-16">
                
                {/* Linked Section (Active Floor) */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">Active Intelligence</h2>
                        <div className="h-px flex-1 bg-border/20" />
                        <span className="text-[10px] font-mono text-muted-foreground">{linkedItems.length} ONLINE</span>
                    </div>
                    
                    {linkedItems.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
                            <p className="text-xs text-muted-foreground italic uppercase tracking-widest">No memories inhabit your assistants yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {linkedItems.map((item) => (
                                <LinkedMemoryCard 
                                    key={item.id} 
                                    item={item} 
                                    onEdit={handleEdit}
                                    connectedAssistants={getConnectedAssistants(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Archive Section (The Ledger) */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/40">Archive Ledger</h2>
                        <div className="h-px flex-1 bg-border/20" />
                        <span className="text-[10px] font-mono text-muted-foreground">{archiveItems.length} FRAGMENTS</span>
                    </div>

                    <div className="bg-card/30 rounded-md border border-border/20 overflow-hidden">
                        {archiveItems.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground italic uppercase tracking-widest">Archive is quiet</div>
                        ) : (
                            <div className="flex flex-col">
                                {archiveItems.map((item) => (
                                    <ArchiveRow 
                                        key={item.id} 
                                        item={item} 
                                        onEdit={handleEdit}
                                        onDelete={removeIntelligence}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        )}
      </main>

      <LibraryWorkshop 
        isOpen={isWorkshopOpen} 
        onClose={handleCloseWorkshop} 
        editItem={editingItem}
      />
    </div>
  );
}

function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) {
    return (
        <div className={cn(
            "bg-border shrink-0",
            orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
            className
        )} />
    )
}