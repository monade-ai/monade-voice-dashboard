'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { ArrowUpRight, Bot, ChevronRight, Cpu, FileText, Globe, X } from 'lucide-react';

// ─── Step definitions ─────────────────────────────────────────────────────────
// All 4 steps advance via Next. No early exits.

const STEPS = [
  {
    num: '01',
    title: "Your AI's Memory",
    desc: "The Knowledge base is the brain behind your assistants. Every fact, script, and pricing detail you upload becomes accessible during live calls — no hallucinations on your data.",
    bullets: ['Structured factual context', 'Accessible during every call', 'Eliminates AI hallucinations'],
    cta: 'Next →',
  },
  {
    num: '02',
    title: 'Add Facts Instantly',
    desc: 'Tap + Add Info to upload a document or paste text directly. Your assistants absorb it immediately — no retraining, no waiting.',
    bullets: ['Upload TXT, PDF, or Markdown', 'Direct text entry', 'Versioned updates'],
    cta: 'Next →',
  },
  {
    num: '03',
    title: 'Link to Assistants',
    desc: 'Connect a knowledge file to one or more assistants. Hover any card to instantly see which agents are using it — and manage those links.',
    bullets: ['Multi-assistant sharing', 'Hover cards show active links', 'Zero downtime updates'],
    cta: 'Next →',
  },
  {
    num: '04',
    title: 'Archive & Refine',
    desc: 'Every document lives in the Archive. Filter by date, search by name, and click any file to open the editor and push a refined version.',
    bullets: ['Date range filtering', 'Full-text search', 'Versioned refinement'],
    cta: "Let's go →",
  },
] as const;

// ─── Cursor positions (absolute y from left panel top = 0) ────────────────────
//
// Panel structure:
//   Browser bar:                              y = 0–36px     (36px)
//   MockUI page header:                       y = 36–72px    (36px) → center y=54
//   "Currently in Use" section label:         y = 72–100px   (28px)
//   Cards grid (p-3 = 12px padding):
//     cards start at panel y = 100+12 = 112px
//     Card0 (130px tall):                     y = 112–242px  center = 177
//   8px gap + "All Documents" section label:  y = 250–278px  (28px)
//   Filter pills row:                         y = 278–298px  (20px)
//   Archive container starts at:              y = 298px
//     Row 0 (36px tall, matching real p-4):   y = 298–334px  center = 316

const CURSOR_POS = [
  { x: 116, y: 177 }, // step 1 — center of knowledge card 0 (hover)
  { x: 388, y: 54  }, // step 2 — "+ Add Info" button in header
  { x: 116, y: 177 }, // step 3 — card 0 again (trigger hover overlay)
  { x: 150, y: 316 }, // step 4 — first archive row center
] as const;

// ─── Mock knowledge card — mirrors real LinkedMemoryCard structure ─────────────
//   Real card: h-[320px], p-6 header, px-8 content
//   Top: "Added DATE" (text-primary) + "X Links" badge
//   Body: filename (text-2xl) + monospace snippet (h-[100px])
//   Footer: Volume (~N words, Cpu icon) + Market (English, Globe icon) + arrow

function MockKnowledgeCard({
  date,
  filename,
  snippet,
  wordCount,
  linkCount,
  highlighted,
  showOverlay,
}: {
  date: string;
  filename: string;
  snippet: string;
  wordCount: string;
  linkCount: number;
  highlighted: boolean;
  showOverlay: boolean;
}) {
  return (
    <div
      className={`relative rounded-md border overflow-hidden flex flex-col transition-all duration-300 ${
        highlighted
          ? 'border-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.12)]'
          : 'border-zinc-700/40'
      } bg-zinc-800/60`}
      style={{ height: 130 }}
    >
      {/* Header: date label (primary color) + links badge */}
      <div className="px-2.5 pt-2 flex items-center justify-between shrink-0">
        <span className="text-[6.5px] font-bold uppercase tracking-[0.18em] text-yellow-400/90">
          Added {date}
        </span>
        <div className="px-1.5 py-0.5 rounded-full border border-zinc-600/50 bg-zinc-700/30">
          <span className="text-[6px] font-bold uppercase tracking-widest text-zinc-400">
            {linkCount} Links
          </span>
        </div>
      </div>

      {/* Filename — mirrors real card's text-2xl font-medium */}
      <div className="px-2.5 pt-1 shrink-0">
        <span className="text-[9.5px] font-semibold text-zinc-200 tracking-tight truncate block">{filename}</span>
      </div>

      {/* Snippet — mirrors real font-mono text overflow */}
      <div className="px-2.5 pt-1 flex-1 overflow-hidden relative">
        <p className="text-[7px] font-mono text-zinc-500 leading-relaxed">{snippet}</p>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-zinc-800/80 to-transparent" />
      </div>

      {/* Footer: Volume + Market + arrow — mirrors real card bottom row */}
      <div className="mx-2.5 border-t border-zinc-700/40 pt-1 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Cpu size={7} className="text-yellow-400/50" />
            <span className="text-[6.5px] font-mono font-bold text-zinc-400">~{wordCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe size={7} className="text-blue-400/50" />
            <span className="text-[6.5px] font-bold text-zinc-400">English</span>
          </div>
        </div>
        <div className="w-5 h-5 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center">
          <ArrowUpRight size={9} />
        </div>
      </div>

      {/* Hover overlay — mirrors real card's translate-y reveal showing connected assistants */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: 'easeInOut' }}
            className="absolute inset-0 bg-zinc-900/96 backdrop-blur-sm flex flex-col p-2.5 z-10"
          >
            <div className="text-[6.5px] font-bold uppercase tracking-[0.2em] text-yellow-400 mb-1">
              Connected Assistants
            </div>
            <div className="text-[8px] font-medium text-zinc-200 mb-1.5">Active Operational Links</div>
            <div className="space-y-1 flex-1 overflow-hidden">
              {['Nova Sales', 'Echo Support'].map(name => (
                <div key={name} className="flex items-center justify-between px-1.5 py-1 rounded border border-zinc-700/50 bg-zinc-800/50">
                  <div className="flex items-center gap-1.5">
                    <Bot size={8} className="text-yellow-400/70 shrink-0" />
                    <span className="text-[7.5px] font-medium text-zinc-300">{name}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[6px] font-bold uppercase tracking-widest text-yellow-400">Click to Refine Facts</span>
              <ArrowUpRight size={8} className="text-yellow-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Library page mock UI ─────────────────────────────────────────────────────
// Faithfully renders: page header, "Currently in Use" cards, "All Documents" archive rows.
// Step-specific state:
//   step 0: card 0 highlighted
//   step 1: + Add Info button glows, new row appears in archive
//   step 2: card 0 hover overlay reveals connected assistants
//   step 3: first archive row highlighted, chevron visible

function LibraryMockUI({ step }: { step: number }) {
  const showNewRow    = step >= 1;
  const showOverlay   = step === 2;
  const highlightRow0 = step === 3;

  return (
    <div className="flex flex-col h-full select-none overflow-hidden">

      {/* ── Page header (mirrors: "Knowledge" title + search + "+ Add Info" button) ── */}
      <div
        className="shrink-0 bg-zinc-900/80 border-b border-zinc-800 px-3 flex items-center justify-between"
        style={{ height: 36 }}
      >
        <span className="text-[9px] font-bold text-white tracking-widest uppercase">Knowledge</span>
        <div className="flex items-center gap-1.5">
          {/* Search shape */}
          <div className="h-5 w-[72px] rounded bg-zinc-700/60 flex items-center px-2 gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
            <div className="h-1 flex-1 bg-zinc-600/70 rounded-full" />
          </div>
          {/* + Add Info button — glows on step 1 */}
          <div
            className={`h-5 px-2 rounded-[3px] flex items-center gap-1 transition-all duration-300 ${
              step === 1
                ? 'bg-white shadow-[0_0_12px_5px_rgba(255,255,255,0.22)]'
                : 'bg-zinc-200/90'
            }`}
          >
            <span className="text-[7.5px] font-bold text-zinc-900">+ Add Info</span>
          </div>
        </div>
      </div>

      {/* ── "Currently in Use" section (mirrors: h2 + ACTIVE badge + card grid) ── */}
      <div className="shrink-0 px-3 flex items-center gap-2" style={{ height: 28 }}>
        <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-zinc-300">Currently in Use</span>
        <div className="h-px flex-1 bg-zinc-700/40" />
        <div className="px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/20">
          <span className="text-[6px] font-mono text-yellow-400/80">2 ACTIVE</span>
        </div>
      </div>

      {/* Knowledge cards */}
      <div className="px-3 pb-2 grid grid-cols-2 gap-2 shrink-0">
        {/* Card 0 — Pricing Guide */}
        <MockKnowledgeCard
          date="15 Jan 2025"
          filename="Pricing Guide 2025"
          snippet="Our enterprise pricing includes three tiers. Standard at $99/month with basic features, Pro at $299..."
          wordCount="420 words"
          linkCount={2}
          highlighted={step === 0 || step === 2}
          showOverlay={showOverlay}
        />
        {/* Card 1 — FAQ Sheet */}
        <MockKnowledgeCard
          date="3 Feb 2025"
          filename="FAQ Sheet"
          snippet="Q: How do I set up a campaign? A: Navigate to Campaigns and tap New. Q: Can I change voice mid-call..."
          wordCount="280 words"
          linkCount={1}
          highlighted={false}
          showOverlay={false}
        />
      </div>

      {/* ── "All Documents" archive section ── */}
      {/* Section header + filter pills */}
      <div className="shrink-0 mx-3 flex items-center justify-between" style={{ height: 28 }}>
        <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-zinc-500">All Documents</span>
        <div className="flex items-center gap-1">
          {['All', 'Last 7d', 'Last 30d'].map((f, i) => (
            <div
              key={f}
              className={`px-1.5 py-0.5 rounded text-[6px] font-bold uppercase tracking-widest ${
                i === 0 ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600'
              }`}
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Archive rows — mirror real ArchiveRow: file icon + name + date + chevron */}
      <div className="mx-3 rounded-md border border-zinc-700/40 overflow-hidden flex-1">
        {[
          { name: 'Objection Handbook.txt', date: '28 Jan' },
          { name: 'Script v4.txt',          date: '12 Jan' },
          { name: 'Competitors.txt',        date: '5 Jan'  },
        ].map((row, i) => (
          <div
            key={row.name}
            className={`flex items-center gap-2 px-2.5 transition-all duration-200 ${
              i < 2 ? 'border-b border-zinc-700/30' : ''
            } ${
              highlightRow0 && i === 0
                ? 'bg-yellow-400/10'
                : 'bg-transparent'
            }`}
            style={{ height: 34 }}
          >
            <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center shrink-0">
              <FileText size={9} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[7.5px] font-medium text-zinc-300 truncate">{row.name}</div>
              <div className="text-[6px] text-zinc-600">{row.date}</div>
            </div>
            <ChevronRight
              size={10}
              className={`shrink-0 transition-all duration-200 ${
                highlightRow0 && i === 0 ? 'text-yellow-400 opacity-100' : 'text-zinc-600 opacity-40'
              }`}
            />
          </div>
        ))}

        {/* New document row — animates in on step 1 */}
        <AnimatePresence>
          {showNewRow && (
            <motion.div
              key="new-row"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 34, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.85 }}
              className="flex items-center gap-2 px-2.5 border-t border-zinc-700/30 bg-yellow-400/5 overflow-hidden"
            >
              <div className="w-5 h-5 rounded bg-yellow-400/20 flex items-center justify-center shrink-0">
                <FileText size={9} className="text-yellow-400/70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7.5px] font-medium text-yellow-400/80 truncate">New Document.txt</div>
                <div className="text-[6px] text-yellow-400/40">Just now</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom breathing room */}
      <div className="shrink-0" style={{ height: 8 }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LibraryOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function LibraryOnboarding({ isOpen, onComplete }: LibraryOnboardingProps) {
  const [step, setStep] = useState(0);
  const [showRipple, setShowRipple] = useState(false);

  const cursorX = useMotionValue(CURSOR_POS[0].x);
  const cursorY = useMotionValue(CURSOR_POS[0].y);

  useEffect(() => {
    if (!isOpen) return;
    const pos = CURSOR_POS[step];
    animate(cursorX, pos.x, { duration: 0.75, ease: 'easeInOut' });
    animate(cursorY, pos.y, { duration: 0.75, ease: 'easeInOut' });

    // Click ripple on step 1 (cursor arrives at + Add Info)
    if (step === 1) {
      const t = setTimeout(() => {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
      }, 820);
      return () => clearTimeout(t);
    }
  }, [step, isOpen]);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const handleCta = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-4xl h-[560px] flex rounded-xl overflow-hidden shadow-2xl border border-white/[0.08]"
      >

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div
          className="relative w-1/2 bg-zinc-950 flex flex-col overflow-hidden"
          style={{ colorScheme: 'dark' }}
        >
          {/* Browser chrome */}
          <div
            className="shrink-0 flex items-center gap-1.5 px-3 bg-zinc-900/90 border-b border-zinc-800"
            style={{ height: 36 }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <div className="ml-2 flex-1 h-4 rounded bg-zinc-800/80 flex items-center px-2">
              <span className="text-[7.5px] text-zinc-500">app.monade.ai/knowledge-base</span>
            </div>
          </div>

          {/* Mock page — does NOT re-mount between steps */}
          <div className="flex-1 overflow-hidden">
            <LibraryMockUI step={step} />
          </div>

          {/* Animated cursor */}
          <motion.div
            className="absolute top-0 left-0 pointer-events-none z-20"
            style={{ x: cursorX, y: cursorY }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M1 1L1 15.5L4 12L6.5 17.5L8.5 16.5L6 11H10L1 1Z"
                fill="white"
                stroke="#111"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <AnimatePresence>
              {showRipple && (
                <motion.div
                  key="ripple"
                  className="absolute top-0 left-0 rounded-full bg-white/25"
                  style={{ width: 22, height: 22, x: -3, y: -3 }}
                  initial={{ scale: 0.4, opacity: 0.8 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div className="relative w-1/2 bg-background flex flex-col p-8 border-l border-border/20">
          <button
            onClick={onComplete}
            className="absolute top-5 right-5 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip onboarding"
          >
            <X size={16} />
          </button>

          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-6">
            {STEPS[step].num} / 04
          </span>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex-1 flex flex-col gap-5"
            >
              <h2 className="text-2xl font-medium tracking-tight text-foreground leading-tight">
                {STEPS[step].title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {STEPS[step].desc}
              </p>
              <ul className="space-y-2 mt-1">
                {STEPS[step].bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/20">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className={`text-xs font-medium transition-all ${
                step === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ← Back
            </button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-border'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleCta}
              className="px-4 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-[0.15em] rounded-[4px] hover:bg-foreground/90 transition-all"
            >
              {STEPS[step].cta}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
