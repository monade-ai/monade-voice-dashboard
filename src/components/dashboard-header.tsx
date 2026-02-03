'use client';

/**
 * TODO: REQUIRED FOR FULL INTERACTIVITY
 * ------------------------------------
 * 1. COMMAND CENTER (⌘K):
 *    - Implement a Command Palette (e.g., using 'cmdk') to handle the ghost search trigger.
 *    - Needs: A global context provider to register searchable actions (Create Assistant, Go to Logs, etc.).
 * 
 * 2. DAILY PULSE DATA:
 *    - Replace hardcoded bars in the 'Balance Folio' with real usage data.
 *    - Needs: A new API hook 'useUsageStats' that returns the last 7 days of credit consumption.
 * 
 * 3. QUICK FUEL ACTIONS:
 *    - Connect +500m, +2k, +5k buttons to the payment/billing gateway.
 *    - Needs: Integration with the Stripe/Payment flow currently residing in /wallet.
 * 
 * 4. OMNI-CREATION:
 *    - Implement the 'Create' button logic to open a unified creation portal.
 *    - Needs: A 'CreationModal' component that supports switching between Assistant, KB, and Campaign flows.
 * 
 * 5. NOTIFICATIONS:
 *    - Connect the Bell icon to a real-time notification stream (e.g., Supabase Realtime).
 *    - Needs: An 'activity_log' table listener for high-priority alerts.
 */

import React from 'react';
import { Plus, Search, ChevronDown, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCredits } from '@/app/hooks/use-credits';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { cn } from '@/lib/utils';

export function DashboardHeader() {
  const router = useRouter();
  const { credits, loading: creditsLoading } = useCredits();
  const balance = credits?.available_credits || 0;

  return (
    <header className="sticky top-0 z-30 w-full bg-background/50 backdrop-blur-xl border-b border-border/20">
      <div className="flex h-14 items-center px-8 justify-between">

        {/* Left: Brand / Section (Clean) */}
        <div className="flex items-center gap-8">

        </div>

        {/* Center: Ghost Command Center */}
        <div className="flex-1 flex justify-center px-4 max-w-xl">
          <button
            className="group relative flex items-center gap-3 px-4 py-1.5 w-full max-w-sm rounded-full bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all duration-300"
            onClick={() => {/* Command Palette Trigger */ }}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-[11px] text-muted-foreground font-medium tracking-tight">Search assistants or type a command...</span>
            <div className="absolute right-3 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 bg-background/50 text-[9px] font-mono font-medium text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">
              <span>⌘</span><span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Balance Capsule & Create */}
        <div className="flex items-center gap-4">

          {/* Balance Folio Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 h-8 px-3 rounded-full bg-background border border-border/40 hover:border-primary/40 transition-all group shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary font-mono">$</span>
                  <span className="text-[11px] font-bold font-mono tracking-tight">
                    {creditsLoading ? '---' : Math.round(balance).toLocaleString()} credits
                  </span>
                </div>
                <Separator orientation="vertical" className="h-3 opacity-20" />
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 p-0 border-border/40 overflow-hidden bg-background" sideOffset={8}>
              <PaperCard variant="mesh" className="border-0 rounded-none shadow-none" shaderProps={{ positions: 20, grainOverlay: 0.9 }}>
                <PaperCardHeader className="p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground">Usage Overview</h4>
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                </PaperCardHeader>
                <PaperCardContent className="p-6 pt-2">
                  <div className="space-y-6">
                    {/* Burn Rate Visualization */}
                    <div className="flex items-end justify-between h-12 gap-1.5 px-1">
                      {[35, 45, 25, 60, 40, 75, 50].map((h, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-full rounded-t-[1px] transition-all duration-500',
                            i === 6 ? 'bg-primary' : 'bg-muted-foreground/10',
                          )}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-medium tracking-tight">Top up your balance</span>
                      <p className="text-[12px] text-foreground/70 leading-relaxed font-medium">
                                                Your usage is 12% lower than last week. Top up now to ensure your assistants stay active and responsive.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" className="h-10 rounded-[4px] border-border/40 bg-background/50 text-[11px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all">
                                                +500m
                      </Button>
                      <Button variant="outline" className="h-10 rounded-[4px] border-border/40 bg-background/50 text-[11px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all">
                                                +2k
                      </Button>
                      <Button variant="outline" className="h-10 rounded-[4px] border-border/40 bg-background/50 text-[11px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all">
                                                +5k
                      </Button>
                    </div>

                    <button
                      onClick={() => router.push('/wallet')}
                      className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors"
                    >
                                            View Detailed Ledger
                    </button>
                  </div>
                </PaperCardContent>
              </PaperCard>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => {/* Trigger Omni-Creation */ }}
            className="h-8 px-3 bg-foreground text-background hover:bg-foreground/90 rounded-[4px] text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
                        Create
          </Button>
        </div>
      </div>
    </header>
  );
}

function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical', className?: string }) {
  return (
    <div className={cn(
      'bg-border shrink-0',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className,
    )} />
  );
}
