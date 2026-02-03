'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, FileUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useLibrary, LibraryItem } from '@/app/hooks/use-knowledge-base';
import { cn } from '@/lib/utils';

interface LibraryWorkshopProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: LibraryItem | null;
}

export function LibraryWorkshop({ isOpen, onClose, editItem }: LibraryWorkshopProps) {
  const { addIntelligence, isLoading } = useLibrary();
  const [mode, setMode] = useState<'write' | 'upload'>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  // Load item for editing
  useEffect(() => {
    if (editItem && isOpen) {
      setTitle(editItem.filename.replace('.txt', ''));
      setMode('write');
      fetchOriginalContent(editItem.url);
    } else {
      setTitle('');
      setContent('');
      setIsConfirming(false);
    }
  }, [editItem, isOpen]);

  const fetchOriginalContent = async (url: string) => {
    setIsFetchingContent(true);
    try {
      const res = await fetch('/api/transcript-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.raw) {
        // Logic to strip JSONL formatting if it was saved as structured data
        setContent(data.transcript || data.raw);
      }
    } catch {
      toast.error('Failed to load content for editing.');
    } finally {
      setIsFetchingContent(false);
    }
  };

  const handleSaveAttempt = () => {
    if (editItem) {
      setIsConfirming(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!title) return;
    
    // Versioning Logic: Append V2 or Timestamp if it's an edit
    const finalFilename = editItem 
      ? `${title}_v${Date.now().toString().slice(-4)}.txt` 
      : `${title}.txt`;

    const success = await addIntelligence({
      filename: finalFilename,
      kb_text: content,
    });

    if (success) {
      setIsConfirming(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[60]" 
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-border shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-border/40 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-medium tracking-tight">
                  {editItem ? 'Refine Memory' : 'Add Intelligence'}
                </h2>
                <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">
                  {editItem ? `Editing: ${editItem.filename}` : 'New Memory Fragment'}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {!editItem && (
                <div className="flex p-1 bg-muted rounded-md w-full">
                  {['write', 'upload'].map((m) => (
                    <button 
                      key={m}
                      onClick={() => setMode(m as any)}
                      className={cn('flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all', mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {m === 'write' ? 'Direct Entry' : 'Upload File'}
                    </button>
                  ))}
                </div>
              )}

              {isFetchingContent ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Retrieving original facts...</span>
                </div>
              ) : mode === 'write' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Title</label>
                    <Input 
                      placeholder="Fragment name..." 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="border-border/40 focus:border-primary transition-all rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Content</label>
                    <Textarea 
                      placeholder="Paste the facts here..." 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[400px] border-border/40 focus:border-primary transition-all font-mono text-sm leading-relaxed rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => document.getElementById('lib-upload')?.click()}
                  className="border-2 border-dashed border-border/60 rounded-lg p-16 flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all group"
                >
                  <FileUp size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Drop document here</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">TXT, PDF or MD</p>
                  </div>
                  <input id="lib-upload" type="file" className="hidden" accept=".txt,.pdf,.md" />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border/40 bg-muted/5 space-y-4">
              {isConfirming && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-md bg-primary/10 border border-primary/20 flex gap-3 items-start"
                >
                  <AlertTriangle className="text-primary shrink-0" size={18} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Confirm New Version</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                This will save a new fragment in your library. Assistants using the old version will not be affected unless manually updated.
                    </p>
                    <div className="flex gap-3 mt-3">
                      <button onClick={executeSave} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Yes, Save Version</button>
                      <button onClick={() => setIsConfirming(false)} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:underline">Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}

              {!isConfirming && (
                <Button 
                  onClick={handleSaveAttempt}
                  disabled={isLoading || (mode === 'write' && !title) || isFetchingContent}
                  className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[11px] font-bold uppercase tracking-[0.2em]"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                  {editItem ? 'Deploy New Version' : 'Sync to Memory'}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
