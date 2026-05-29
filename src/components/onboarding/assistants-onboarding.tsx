'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { ArrowUpRight, Cpu, Volume2, X } from 'lucide-react';

// ─── Step definitions ─────────────────────────────────────────────────────────
// All 4 steps advance via Next. No early exits. Step 4 closes dialog.

const STEPS = [
  {
    num: '01',
    title: 'Your AI Voice Agents',
    desc: 'Each assistant is an autonomous voice AI. It makes calls, handles objections, classifies intent, and summarizes every conversation — without a human in the loop.',
    bullets: ['Human-quality voice', 'Real-time lead classification', 'Auto-generated call summaries'],
    cta: 'Next →',
  },
  {
    num: '02',
    title: 'Create in Seconds',
    desc: 'Tap + Add Assistant to build your first AI agent. Name it, pick a voice, define its personality. No ML background needed.',
    bullets: ['No-code configuration', 'Multiple voice options', 'Custom scripts & greetings'],
    cta: 'Next →',
  },
  {
    num: '03',
    title: 'The Studio',
    desc: 'Every assistant has a Studio — a workspace where you configure its voice, script, and knowledge. Click any card to open it.',
    bullets: ['Script editor with variables', 'Knowledge base integration', 'Live call testing'],
    cta: 'Next →',
  },
  {
    num: '04',
    title: 'Go Live',
    desc: "Test with a real call, then scale to thousands via Campaigns. Your agent handles everything — you watch the leads roll in.",
    bullets: ['Single call test mode', 'Campaign-level scaling', 'Real-time monitoring'],
    cta: "Let's go →",
  },
] as const;

// ─── Cursor positions (absolute y from left panel top = 0) ────────────────────
//
// Panel structure:
//   Browser bar (rendered outside MockUI):  y = 0–36px     (36px tall)
//   MockUI header bar (bg-zinc-900):         y = 36–72px    (36px tall)
//   Tabs row:                                y = 72–96px    (24px tall)
//   Grid container (p-3 = 12px padding):     cards start y = 96+12 = 108px
//   Card0 (200px tall):                      y = 108–308px  center = 208
//   Card0 arrow button (20px from bottom):   y ≈ 290,  x ≈ 200
//   "+ Add" button (header right side):      x ≈ 388,  y = 36+18 = 54

const CURSOR_POS = [
  { x: 116, y: 208 }, // step 1 — hover card 0 center
  { x: 388, y: 54  }, // step 2 — "+ Add" button in header
  { x: 116, y: 208 }, // step 3 — click card 0 (opens studio)
  { x: 200, y: 290 }, // step 4 — arrow button bottom-right of card 0
] as const;

// ─── Mock assistant card — mirrors real AssistantCard structure ───────────────
//   Real card: h-[360px], avatar (LeadIcon 52px) + name, READY badge,
//   "Primary Role" label + italic desc, Model/Voice 2-col grid,
//   "Operating History" + "1,240m Talked" + circle arrow button

function MockAssistantCard({
  name,
  role,
  model,
  voice,
  history,
  gradient,
  highlighted,
  arrowActive,
}: {
  name: string;
  role: string;
  model: string;
  voice: string;
  history: string;
  gradient: string;
  highlighted: boolean;
  arrowActive: boolean;
}) {
  return (
    <div
      className={`rounded-md border flex flex-col overflow-hidden transition-all duration-300 ${
        highlighted
          ? 'border-yellow-400/60 shadow-[0_0_14px_rgba(250,204,21,0.12)]'
          : 'border-zinc-700/40'
      } bg-zinc-800/60`}
      style={{ height: 200 }}
    >
      {/* Header: avatar + name + READY badge */}
      <div className="px-3 pt-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} shrink-0`} />
          <span className="text-[10px] font-semibold text-zinc-200 tracking-tight truncate max-w-[72px]">{name}</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500 rounded-full shrink-0">
          <div className="w-1 h-1 rounded-full bg-white" />
          <span className="text-[6px] font-bold text-white uppercase tracking-wider">READY</span>
        </div>
      </div>

      {/* Primary Role */}
      <div className="px-3 pt-2 flex-1 min-h-0">
        <div className="text-[6px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Primary Role</div>
        <p className="text-[7.5px] italic text-zinc-400 leading-relaxed line-clamp-3">"{role}"</p>
      </div>

      {/* Model / Voice metadata — mirrors the 2-col grid in real card */}
      <div className="mx-3 border-t border-zinc-700/40 pt-1.5 pb-1.5 grid grid-cols-2 gap-x-3 shrink-0">
        <div>
          <div className="flex items-center gap-0.5 mb-0.5">
            <Cpu size={6} className="text-yellow-400/50" />
            <span className="text-[6px] uppercase tracking-widest text-zinc-600">Model</span>
          </div>
          <span className="text-[8px] font-semibold text-zinc-300">{model}</span>
        </div>
        <div>
          <div className="flex items-center gap-0.5 mb-0.5">
            <Volume2 size={6} className="text-yellow-400/50" />
            <span className="text-[6px] uppercase tracking-widest text-zinc-600">Voice</span>
          </div>
          <span className="text-[8px] font-semibold text-zinc-300">{voice}</span>
        </div>
      </div>

      {/* Footer: history + circle arrow button — mirrors real card bottom row */}
      <div className="mx-3 border-t border-zinc-700/40 pt-1.5 pb-2.5 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[6px] uppercase tracking-widest text-zinc-600">Operating History</div>
          <div className="text-[8.5px] font-mono font-bold text-zinc-300">{history}</div>
        </div>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border ${
            arrowActive
              ? 'bg-yellow-400 text-zinc-900 shadow-[0_0_12px_rgba(250,204,21,0.45)] scale-110 border-yellow-300'
              : 'bg-zinc-700 text-zinc-300 border-zinc-600/40'
          }`}
        >
          <ArrowUpRight size={11} />
        </div>
      </div>
    </div>
  );
}

// ─── Assistants page mock UI ──────────────────────────────────────────────────
// Faithfully renders: page header bar, All/Production/Drafts tabs, card grid.
// Step-specific state:
//   step 0: card 0 highlighted (hover effect)
//   step 1: + Add button glows, draft card animates in at position [2]
//   step 2: card 0 highlighted, studio panel slides in from right
//   step 3: arrow button on card 0 turns primary color

function AssistantsMockUI({ step }: { step: number }) {
  const showDraftCard = step >= 1;
  const showStudio    = step >= 2;

  return (
    <div className="flex flex-col h-full select-none overflow-hidden">

      {/* ── Page header (mirrors: "Assistants" title area + search + Add button) ── */}
      <div
        className="shrink-0 bg-zinc-900/80 border-b border-zinc-800 px-3 flex items-center justify-between"
        style={{ height: 36 }}
      >
        <span className="text-[9px] font-bold text-white tracking-widest uppercase">Assistants</span>
        <div className="flex items-center gap-1.5">
          {/* Search input shape */}
          <div className="h-5 w-[72px] rounded bg-zinc-700/60 flex items-center px-2 gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
            <div className="h-1 flex-1 bg-zinc-600/70 rounded-full" />
          </div>
          {/* + Add button — glows on step 1 */}
          <div
            className={`h-5 px-2 rounded-[3px] flex items-center gap-1 transition-all duration-300 ${
              step === 1
                ? 'bg-white shadow-[0_0_12px_5px_rgba(255,255,255,0.22)]'
                : 'bg-zinc-200/90'
            }`}
          >
            <span className="text-[7.5px] font-bold text-zinc-900">+ Add</span>
          </div>
        </div>
      </div>

      {/* ── Tabs row (mirrors: All Assistants | Production | Drafts) ── */}
      <div
        className="shrink-0 px-3 flex items-center gap-4 bg-zinc-900/40 border-b border-zinc-800/50"
        style={{ height: 24 }}
      >
        <span className="text-[7px] font-bold text-white border-b border-white pb-px leading-none">ALL</span>
        <span className="text-[7px] font-bold text-zinc-500 leading-none">PRODUCTION</span>
        <span className="text-[7px] font-bold text-zinc-500 leading-none">DRAFTS</span>
      </div>

      {/* ── Grid + optional studio panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Card grid */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 content-start">

            {/* Card 0 — Nova Sales */}
            <MockAssistantCard
              name="Nova Sales"
              role="Intelligent outbound lead qualification and objection handling."
              model="GPT-4o"
              voice="Alloy"
              history="1,240m Talked"
              gradient="from-purple-500/70 to-blue-500/70"
              highlighted={step === 0 || step === 2}
              arrowActive={step === 3}
            />

            {/* Card 1 — Echo Support */}
            <MockAssistantCard
              name="Echo Support"
              role="Customer support triage and inbound escalation routing."
              model="GPT-4o"
              voice="Echo"
              history="892m Talked"
              gradient="from-orange-500/70 to-red-500/70"
              highlighted={false}
              arrowActive={false}
            />

            {/* Draft card — animates in on step 1 */}
            <AnimatePresence>
              {showDraftCard && (
                <motion.div
                  key="draft"
                  initial={{ scale: 0.82, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.82, opacity: 0 }}
                  transition={{ duration: 0.38, ease: 'easeOut', delay: 0.85 }}
                  className="rounded-md border border-dashed border-zinc-600/50 bg-zinc-800/30 flex flex-col p-3"
                  style={{ height: 200 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 shrink-0" />
                    <span className="text-[10px] font-semibold text-zinc-400">New Assistant</span>
                  </div>
                  <div className="mt-1.5 w-fit flex items-center gap-1 px-1.5 py-0.5 bg-zinc-700/60 rounded-full border border-zinc-600/40">
                    <span className="text-[6px] font-bold text-zinc-400 uppercase tracking-wider">DRAFT</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 w-3/4 bg-zinc-700/50 rounded-full" />
                    <div className="h-1.5 w-1/2 bg-zinc-700/30 rounded-full" />
                    <div className="h-1.5 w-2/3 bg-zinc-700/20 rounded-full" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Studio panel — slides in on step 2 (mirrors the real AssistantStudio right-panel feel) */}
        <AnimatePresence>
          {showStudio && (
            <motion.div
              key="studio"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.38, ease: 'easeInOut', delay: 0.65 }}
              className="shrink-0 bg-zinc-900 border-l border-zinc-700/60 flex flex-col overflow-hidden"
              style={{ width: '46%' }}
            >
              {/* Studio header */}
              <div className="px-2.5 py-1.5 border-b border-zinc-800 shrink-0">
                <div className="text-[7px] font-bold text-white uppercase tracking-widest">Nova Sales</div>
                <div className="text-[6px] text-zinc-500 uppercase tracking-widest">Studio</div>
              </div>
              {/* Script / Knowledge / Voice tabs */}
              <div className="px-2.5 py-1 flex gap-2.5 border-b border-zinc-800/60 shrink-0">
                {['Script', 'Knowledge', 'Voice'].map((t, i) => (
                  <span
                    key={t}
                    className={`text-[6.5px] font-bold uppercase tracking-widest ${
                      i === 0
                        ? 'text-yellow-400 border-b border-yellow-400 pb-px'
                        : 'text-zinc-500'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {/* Script editor — rows of text lines simulating a script */}
              <div className="flex-1 p-2.5 space-y-1.5 overflow-hidden">
                {[92, 78, 88, 55, 70, 84, 42, 65, 88, 50, 72].map((w, i) => (
                  <div key={i} className="h-1.5 bg-zinc-700/50 rounded-full" style={{ width: `${w}%` }} />
                ))}
                {/* Blinking cursor line */}
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1/3 bg-zinc-700/50 rounded-full" />
                  <div className="h-3 w-0.5 bg-yellow-400 animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AssistantsOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function AssistantsOnboarding({ isOpen, onComplete }: AssistantsOnboardingProps) {
  const [step, setStep] = useState(0);
  const [showRipple, setShowRipple] = useState(false);

  const cursorX = useMotionValue(CURSOR_POS[0].x);
  const cursorY = useMotionValue(CURSOR_POS[0].y);

  // Animate cursor to new position on step change
  useEffect(() => {
    if (!isOpen) return;
    const pos = CURSOR_POS[step];
    animate(cursorX, pos.x, { duration: 0.75, ease: 'easeInOut' });
    animate(cursorY, pos.y, { duration: 0.75, ease: 'easeInOut' });

    // Show click ripple when cursor arrives at a clickable (steps 1 and 2)
    if (step === 1 || step === 2) {
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

        {/* ── LEFT PANEL: always dark, browser chrome + mock page ─────────── */}
        <div
          className="relative w-1/2 bg-zinc-950 flex flex-col overflow-hidden"
          style={{ colorScheme: 'dark' }}
        >
          {/* Browser chrome bar */}
          <div
            className="shrink-0 flex items-center gap-1.5 px-3 bg-zinc-900/90 border-b border-zinc-800"
            style={{ height: 36 }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <div className="ml-2 flex-1 h-4 rounded bg-zinc-800/80 flex items-center px-2">
              <span className="text-[7.5px] text-zinc-500">app.monade.ai/assistants</span>
            </div>
          </div>

          {/* Mock page — does NOT re-mount on step change so animations persist */}
          <div className="flex-1 overflow-hidden">
            <AssistantsMockUI step={step} />
          </div>

          {/* Animated cursor — positioned absolutely within panel (y=0 = panel top) */}
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
            {/* Click ripple */}
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

        {/* ── RIGHT PANEL: respects system theme ──────────────────────────── */}
        <div className="relative w-1/2 bg-background flex flex-col p-8 border-l border-border/20">

          {/* Skip */}
          <button
            onClick={onComplete}
            className="absolute top-5 right-5 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip onboarding"
          >
            <X size={16} />
          </button>

          {/* Step counter */}
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-6">
            {STEPS[step].num} / 04
          </span>

          {/* Step content with slide transition */}
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

          {/* Bottom navigation row */}
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

            {/* Step dots */}
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
