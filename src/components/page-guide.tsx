'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  label: string;
  description: string;
}

interface PageGuideProps {
  storageKey: string;
  title: string;
  subtitle: string;
  steps: Step[];
}

export function PageGuide({ storageKey, title, subtitle, steps }: PageGuideProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey);
    if (!isDismissed) setIsVisible(true);
  }, [storageKey]);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  // Ensure we only show up to 3 steps
  const displaySteps = steps.slice(0, 3);

  if (displaySteps.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative border border-primary/20 bg-primary/[0.01] rounded-md overflow-hidden mb-12"
        >
          <button
            onClick={dismiss}
            className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
            aria-label="Dismiss guide"
          >
            <X size={18} />
          </button>

          <div className="p-12 md:p-16 space-y-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-medium tracking-tight text-foreground max-w-2xl">
                {title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl font-normal leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
              {displaySteps.map((step, index) => (
                <div
                  key={index}
                  className={`space-y-3 ${index > 0 ? 'border-l border-border/20 pl-8' : ''}`}
                >
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">
                    {String(index + 1).padStart(2, '0')}. {step.label}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PageGuide;
