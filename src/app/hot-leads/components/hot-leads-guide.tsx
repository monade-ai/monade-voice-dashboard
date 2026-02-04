'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Target, Zap } from 'lucide-react';

export function HotLeadsGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('monade_hotleads_guide_dismissed');
    if (!isDismissed) setShowGuide(true);
  }, []);

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('monade_hotleads_guide_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative border border-primary/20 bg-primary/[0.01] rounded-md overflow-hidden mb-12"
        >
          <button
            onClick={dismissGuide}
            className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
          >
            <X size={18} />
          </button>

          <div className="p-12 md:p-16 space-y-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-medium tracking-tight text-foreground max-w-2xl">
                Your Deal Room
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl font-normal leading-relaxed">
                This is where your hottest opportunities live. Our AI scans every conversation and surfaces the leads most likely to convert.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">01. Spot the heat</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hot leads are automatically flagged when prospects show real interest, ask about pricing, or request follow-ups.
                </p>
              </div>
              <div className="space-y-3 border-l border-border/20 pl-8">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">02. Filter with intent</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Search by phone number or browse by outcome type. See exactly what each prospect said and how interested they are.
                </p>
              </div>
              <div className="space-y-3 border-l border-border/20 pl-8">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">03. Close the deal</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click any lead to hear the full call recording, read the transcript, and know exactly what to say when you follow up.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default HotLeadsGuide;
