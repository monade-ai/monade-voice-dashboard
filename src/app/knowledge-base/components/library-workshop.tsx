'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Type, Loader2, Sparkles, Plus, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useLibrary } from '@/app/hooks/use-knowledge-base';
import { cn } from '@/lib/utils';

export function LibraryWorkshop({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addIntelligence, isLoading } = useLibrary();
  const [mode, setMode] = useState<'write' | 'upload'>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!title) return;
    const success = await addIntelligence({
      filename: `${title}.txt`,
      kb_text: content
    });
    if (success) {
        setTitle('');
        setContent('');
        onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const success = await addIntelligence({
            filename: file.name,
            kb_file_base64: base64
        });
        if (success) onClose();
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[60]" 
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l border-border shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-8 border-b border-border/40 flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-medium tracking-tight text-foreground">Add Intelligence</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">New Memory Fragment</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                
                {/* Mode Switcher */}
                <div className="flex p-1 bg-muted rounded-md w-full">
                    <button 
                        onClick={() => setMode('write')}
                        className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all", mode === 'write' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                        Direct Entry
                    </button>
                    <button 
                        onClick={() => setMode('upload')}
                        className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all", mode === 'upload' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                        Upload File
                    </button>
                </div>

                {mode === 'write' ? (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Fragment Name</label>
                            <Input 
                                placeholder="e.g. 2026 Pricing Guide" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="border-border/40 focus:border-primary transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Intelligence Data</label>
                            <Textarea 
                                placeholder="Paste or write the facts here..." 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[300px] border-border/40 focus:border-primary transition-all font-mono text-sm leading-relaxed"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <div 
                            onClick={() => document.getElementById('lib-upload')?.click()}
                            className="border-2 border-dashed border-border/60 rounded-lg p-16 flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                <FileUp size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Select a Document</p>
                                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">TXT, PDF, or Markdown</p>
                            </div>
                            <input 
                                id="lib-upload" 
                                type="file" 
                                className="hidden" 
                                accept=".txt,.pdf,.md"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 border-t border-border/40 bg-muted/5">
                <Button 
                    onClick={handleSubmit}
                    disabled={isLoading || (mode === 'write' && !title)}
                    className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[11px] font-bold uppercase tracking-[0.2em]"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                    Sync to Collective Memory
                </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
