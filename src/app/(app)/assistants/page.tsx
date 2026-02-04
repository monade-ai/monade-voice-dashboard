'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AssistantsProvider, useAssistants } from '@/app/hooks/use-assistants-context';
import { LibraryProvider } from '@/app/hooks/use-knowledge-base';
import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { ContactsProvider } from '../contacts/contexts/contacts-context';

import AssistantStudio from './components/assistant-studio';
import { AssistantCard } from './components/assistant-card';

function AssistantsGallery() {
  const { assistants, currentAssistant, setCurrentAssistant, addDraftAssistant } = useAssistants();
  const [search, setSearch] = useState('');
  const [showBrief, setShowBrief] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('monade_studio_brief_dismissed');
    if (!isDismissed) setShowBrief(true);
  }, []);

  const dismissBrief = () => {
    setShowBrief(false);
    localStorage.setItem('monade_studio_brief_dismissed', 'true');
  };

  const filteredAssistants = useMemo(() => {
    return assistants.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [assistants, search]);

  const handleCreateDraft = () => {
    const draft = addDraftAssistant({
      name: 'New Assistant',
      phoneNumber: '',
      contact_bucket_id: null,
      user_uid: '', 
      tags: [],
    });
    setCurrentAssistant(draft);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Assistants</h1>
            <p className="text-muted-foreground text-sm font-medium">Build and manage your AI voice team.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input placeholder="Find an assistant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 w-64 bg-muted/10 border-border/40 text-xs focus:ring-primary focus:border-primary transition-all rounded-md" />
            </div>
            <Button onClick={handleCreateDraft} className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"><Plus size={16} />Add Assistant</Button>
          </div>
        </div>

        {/* --- The Studio Brief (Warm & Grounded Redesign) --- */}
        <AnimatePresence>
          {showBrief && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="relative border border-primary/20 bg-primary/[0.01] rounded-md overflow-hidden mb-12"
            >
              <button onClick={dismissBrief} className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors z-20">
                <X size={18} />
              </button>
                    
              <div className="p-12 md:p-16 space-y-10">
                <div className="space-y-4">
                  <h2 className="text-4xl font-medium tracking-tight text-foreground max-w-2xl">
                                Welcome to your Studio. This is where you bring your AI assistants to life.
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl font-normal leading-relaxed">
                                It’s simple to get started. Just follow these three steps to help your team succeed.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">01. What they say</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                                    Write a script to guide your assistant. Tell them who they are and how you'd like them to talk to your customers.
                    </p>
                  </div>
                  <div className="space-y-3 border-l border-border/20 pl-8">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">02. What they know</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                                    Link files from your library so they have all the right facts about your business, pricing, and services.
                    </p>
                  </div>
                  <div className="space-y-3 border-l border-border/20 pl-8">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">03. Going live</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                                    Pick a voice you like, connect a phone line, and your assistant is ready to start helping people.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery Grid */}
        <section className="space-y-8 pb-40">
          <div className="flex items-center justify-between border-b border-border/20 pb-4">
            <div className="flex items-center gap-8">
              <button className="text-[10px] font-bold uppercase tracking-widest pb-1 border-b-2 border-primary text-foreground transition-all">All Assistants</button>
              <button className="text-[10px] font-bold uppercase tracking-widest pb-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all">Production</button>
              <button className="text-[10px] font-bold uppercase tracking-widest pb-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all">Drafts</button>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
              <Users size={12} className="text-primary/60" />
              <span>{filteredAssistants.length} Assistants Ready</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredAssistants.map((assistant) => (
                <motion.div key={assistant.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AssistantCard assistant={assistant} onSelect={setCurrentAssistant} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {currentAssistant && <AssistantStudio />}
      </AnimatePresence>
    </div>
  );
}

export default function AssistantsPage() {
  return (
    <LibraryProvider>
      <ContactsProvider>
        <AssistantsProvider>
          <AssistantsGallery />
        </AssistantsProvider>
      </ContactsProvider>
    </LibraryProvider>
  );
}
