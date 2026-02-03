'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function CampaignsGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('monade_campaigns_guide_dismissed');
    if (!isDismissed) setShowGuide(true);
  }, []);

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('monade_campaigns_guide_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative border border-primary/20 bg-primary/[0.01] rounded-md overflow-hidden"
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
                Operations Command
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl font-normal leading-relaxed">
                Run high-volume outreach campaigns that feel personal. Set up once, let your AI assistants handle thousands of conversations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">
                  01. Build your campaign
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose your audience, set your goals, and pick which AI assistant will make the calls.
                </p>
              </div>
              <div className="space-y-3 border-l border-border/20 pl-8">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">
                  02. Set the rules
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Define when to call, how many attempts to make, and what success looks like for your team.
                </p>
              </div>
              <div className="space-y-3 border-l border-border/20 pl-8">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">
                  03. Watch it work
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track every call, every outcome, and every hot lead in real-time. Export results anytime.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
