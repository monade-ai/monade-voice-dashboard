'use client';

import React from 'react';
import { Info } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Bucket descriptions are written for the classifier, not for this reader.
 *
 * Qualification Studio asks authors for "what MUST be true to assign it, and
 * what disqualifies a call" — so these run 400-800 words of prompt spec. Shown
 * in full they made each table row ~1700px tall and buried the only control on
 * the screen. The opening sentence is almost always the definition, which is
 * the part someone picking a template actually needs.
 */
const firstSentence = (text: string): string => {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](?=\s|$)/);
  const sentence = (match?.[0] ?? trimmed).trim();

  return sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}…` : sentence;
};

export function BucketDescription({ description }: { description: string }) {
  const summary = firstSentence(description);
  const hasMore = summary.length < description.trim().length;

  return (
    <div className="mt-1 flex items-start gap-1.5">
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>
      {hasMore ? (
        <Popover>
          <PopoverTrigger
            className="mt-0.5 shrink-0 rounded text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="How calls are classified into this bucket"
          >
            <Info size={13} />
          </PopoverTrigger>
          {/* Fixed height with its own scroll: expanding inline would recreate
              the 1700px row this component exists to prevent. */}
          <PopoverContent align="start" className="max-h-[320px] w-[380px] overflow-y-auto">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              How calls are classified into this bucket
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {description.trim()}
            </p>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
