'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowUpRight,
  FileText,
  ChevronRight,
  Cpu,
  Globe,
  ChevronLeft,
  CalendarDays,
  Bot,
} from 'lucide-react';

import { useLibrary, LibraryItem } from '@/app/hooks/use-knowledge-base';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { LibraryWorkshop } from './components/library-workshop';

// --- Helpers ---

const getShaderProps = (id: string) => {
  const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

  return {
    positions: 15 + (Math.abs(hash) % 10),
    waveX: 0.3 + ((Math.abs(hash) % 20) / 100),
    grainOverlay: 0.95,
  };
};

const detectLanguage = (text: string) => {
  if (!text || text.length < 5) return 'English (Global)';
  const hasHindi = /[\u0900-\u097F]/.test(text);

  return hasHindi ? 'Hindi / Hinglish' : 'English (Global)';
};

// --- Component: MemoryCard ---

const LinkedMemoryCard = ({ 
  item, 
  onEdit,
  connectedAssistants, 
}: { 
    item: LibraryItem, 
    onEdit: (item: LibraryItem) => void,
    connectedAssistants: any[]
}) => {
  const { fetchSnippet, contentCache } = useLibrary();
  const [snippet, setSnippet] = useState<string>(contentCache[item.url] || '');
  const [loadingSnippet, setLoadingSnippet] = useState(!contentCache[item.url]);

  useEffect(() => {
    let isMounted = true;
    if (!contentCache[item.url]) {
      fetchSnippet(item.url).then(text => {
        if (isMounted) {
          setSnippet(text);
          setLoadingSnippet(false);
        }
      });
    }

    return () => { isMounted = false; };
  }, [item.url, fetchSnippet, contentCache]);

  const shaderProps = useMemo(() => getShaderProps(item.id), [item.id]);
  const wordCount = useMemo(() => snippet ? snippet.split(/\s+/).length : 0, [snippet]);
  const language = useMemo(() => detectLanguage(snippet), [snippet]);

  return (
    <PaperCard 
      variant="mesh" 
      shaderProps={shaderProps}
      onClick={() => onEdit(item)}
      className="group relative h-[320px] border-border/40 hover:border-primary/60 transition-all duration-700 cursor-pointer overflow-hidden flex flex-col shadow-sm"
    >
      <PaperCardHeader className="p-6 pb-0 flex justify-between items-start shrink-0 z-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Added {new Date(item.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <Badge variant="outline" className="bg-background/50 border-border/40 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
          {connectedAssistants.length} Links
        </Badge>
      </PaperCardHeader>
            
      <PaperCardContent className="px-8 pb-6 flex-1 flex flex-col justify-between mt-4 z-10">
        <div className="space-y-4 relative">
          <h3 className="text-2xl font-medium tracking-tighter text-foreground leading-tight truncate pr-4">{item.filename.replace('.txt', '')}</h3>
          <div className="relative">
            {loadingSnippet ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-full bg-muted rounded-sm" />
                <div className="h-3 w-4/5 bg-muted rounded-sm" />
              </div>
            ) : (
              <>
                <p className="text-[11px] font-mono text-muted-foreground leading-relaxed h-[100px] overflow-hidden">
                  {snippet}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border/20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Volume</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Cpu size={12} className="text-primary/60" />
                <span className="text-[11px] font-mono font-bold text-foreground">~{wordCount} words</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Market</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Globe size={12} className="text-blue-500/60" />
                <span className="text-[11px] font-bold text-foreground truncate max-w-[80px]">{language}</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-xl scale-90 group-hover:scale-100">
            <ArrowUpRight size={20} />
          </div>
        </div>
      </PaperCardContent>

      {/* Hover Disclosure Overlay */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-20 flex flex-col p-8">
        <div className="space-y-6 overflow-hidden">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Connected Assistants</span>
            <h4 className="text-xl font-medium tracking-tight text-foreground">Active Operational Links</h4>
          </div>
                    
          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
            {connectedAssistants.length > 0 ? (
              connectedAssistants.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-md border border-border/40 bg-muted/20">
                  <div className="flex items-center gap-3 truncate">
                    <Bot size={14} className="text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{a.name}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No assistants are linked.</p>
            )}
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
          <span>Click to Refine Facts</span>
          <ArrowUpRight size={14} />
        </div>
      </div>
    </PaperCard>
  );
};

// --- ArchiveRow ---

const ArchiveRow = ({ item, onEdit, onDelete }: { item: LibraryItem, onEdit: (item: LibraryItem) => void, onDelete: (id: string) => void }) => (
  <div onClick={() => onEdit(item)} className="group flex items-center justify-between p-4 border-b border-border/10 hover:bg-muted/30 transition-all cursor-pointer">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors"><FileText size={16} /></div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{item.filename}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Added on {item.createdAt.toLocaleDateString()}</span>
      </div>
    </div>
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
      <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary transition-all"><ChevronRight size={14} /></div>
    </div>
  </div>
);

// --- Main Page ---

export default function LibraryPage() {
  const { items, isLoading, removeIntelligence } = useLibrary();
  const { assistants } = useAssistants();
  
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  
  const itemsPerPage = 8;

  const getConnectedAssistants = useCallback((item: LibraryItem) => {
    const isLinkedToItem = (knowledgeBase: unknown) => {
      if (!knowledgeBase) return false;

      if (typeof knowledgeBase === 'string') {
        return knowledgeBase === item.id || knowledgeBase === item.url;
      }

      if (typeof knowledgeBase === 'object') {
        const kb = knowledgeBase as { id?: string; url?: string };

        return kb.id === item.id || kb.url === item.url;
      }

      return false;
    };

    return assistants.filter((assistant) => isLinkedToItem(assistant.knowledgeBase));
  }, [assistants]);

  const { linkedItems, filteredArchive } = useMemo(() => {
    const all = items.filter(i => i.filename.toLowerCase().includes(search.toLowerCase()));
    
    // Use items directly instead of groupedItems.flat() to fix regression
    const linked = all.filter(i => getConnectedAssistants(i).length > 0);
    const unlinked = all.filter(i => getConnectedAssistants(i).length === 0);
    
    const now = new Date();
    const filtered = unlinked.filter(i => {
      if (dateFilter === 'all') return true;
      const diffDays = (now.getTime() - i.createdAt.getTime()) / (1000 * 3600 * 24);

      return dateFilter === '7d' ? diffDays <= 7 : diffDays <= 30;
    });

    return { linkedItems: linked, filteredArchive: filtered };
  }, [items, search, dateFilter, getConnectedAssistants]);

  const totalPages = Math.ceil(filteredArchive.length / itemsPerPage);
  const paginatedArchive = filteredArchive.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEdit = (item: LibraryItem) => { setEditingItem(item); setIsWorkshopOpen(true); };
  const handleCloseWorkshop = () => { setIsWorkshopOpen(false); setEditingItem(null); };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-16">
        
        <div className="flex items-end justify-between border-b border-border/40 pb-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter">Knowledge</h1>
            <p className="text-muted-foreground text-sm font-medium">Factual base for your voice fleet.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input placeholder="Search your files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 w-64 bg-muted/10 border-border/40 text-xs focus:ring-primary focus:border-primary transition-all rounded-md" />
            </div>
            <Button onClick={() => setIsWorkshopOpen(true)} className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"><Plus size={16} />Add Info</Button>
          </div>
        </div>

        {isLoading && items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4"><Loader2 size={32} className="animate-spin text-primary/40" /><p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Synchronizing archive...</p></div>
        ) : (
          <div className="space-y-24">
                
            {/* 1. Currently in Use (Pinned Linked Items) */}
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">Currently in Use</h2>
                <div className="h-px flex-1 bg-border/20" />
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-mono">{linkedItems.length} ACTIVE</Badge>
              </div>
              {linkedItems.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-border/40 rounded-lg bg-muted/5"><p className="text-xs text-muted-foreground italic tracking-widest">No files are connected to assistants yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {linkedItems.map((item) => <LinkedMemoryCard key={item.id} item={item} onEdit={handleEdit} connectedAssistants={getConnectedAssistants(item)} />)}
                </div>
              )}
            </section>

            {/* 2. All Documents (Archive) */}
            <section className="space-y-8 pb-40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">All Documents</h2>
                  <div className="flex p-1 bg-muted rounded-md">
                    {['all', '7d', '30d'].map((f) => (
                      <button 
                        key={f} onClick={() => { setDateFilter(f as any); setCurrentPage(1); }}
                        className={cn('px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all', dateFilter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        {f === 'all' ? 'All' : f === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-foreground/70"><CalendarDays size={12} className="text-primary/60" /><span>{filteredArchive.length} Files Found</span></div>
              </div>

              <div className="bg-card/30 rounded-md border border-border/20 overflow-hidden min-h-[400px] flex flex-col shadow-sm">
                <div className="flex-1">
                  {paginatedArchive.length === 0 ? (
                    <div className="p-20 text-center text-xs text-muted-foreground italic uppercase tracking-widest">No documents found in this range.</div>
                  ) : (
                    <div className="flex flex-col">
                      {paginatedArchive.map((item) => <ArchiveRow key={item.id} item={item} onEdit={handleEdit} onDelete={removeIntelligence} />)}
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="p-4 border-t border-border/10 flex items-center justify-between bg-muted/5">
                    <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"><ChevronLeft size={18} /></button>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors"><ChevronRight size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <LibraryWorkshop isOpen={isWorkshopOpen} onClose={handleCloseWorkshop} editItem={editingItem} />
    </div>
  );
}
