'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Link2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function KnowledgeGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('monade_library_guide_dismissed');
    if (!isDismissed) setShowGuide(true);
  }, []);

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('monade_library_guide_dismissed', 'true');
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
                Your Knowledge Hub
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl font-normal leading-relaxed">
                This is where your AI assistants get their smarts. Upload documents, facts, and guides so they can help your customers better.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Upload size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">01. Upload your docs</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Add PDFs, text files, or write knowledge directly. Everything your team needs to reference.
                </p>
              </div>
              <div className="space-y-3 border-l border-border/20 pl-8">
                <div className="flex items-center gap-2">
                  <Link2 size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">02. Connect to assistants</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Link documents to your AI assistants so they know your products, pricing, and policies.
                </p>
              </div>
              <div className="space-y-3 border-l border-border/20 pl-8">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">03. Keep it fresh</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Update information anytime. Your assistants always use the latest version.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
