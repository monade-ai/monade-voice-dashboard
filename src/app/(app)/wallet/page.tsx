'use client';

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  TrendingDown, 
  History, 
  Zap, 
  Plus, 
  ShieldCheck, 
  ChevronRight,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCredits } from '@/app/hooks/use-credits';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Helpers ---

const formatCurrency = (num: number) => `₹${Math.round(num).toLocaleString()}`;

// --- Component: TransactionRow (Linear Copy) ---

const TransactionRow = ({ type, amount, date, status }: { type: string, amount: string, date: string, status: string }) => (
  <div className="group flex items-center justify-between p-4 border-b border-border/10 hover:bg-muted/30 transition-all cursor-pointer">
    <div className="flex items-center gap-4">
      <div className={cn(
        'w-8 h-8 rounded-md flex items-center justify-center border',
        type === 'usage' ? 'bg-muted border-border/40 text-muted-foreground' : 'bg-primary/10 border-primary/20 text-primary',
      )}>
        {type === 'usage' ? <Activity size={14} /> : <Plus size={14} />}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground capitalize">{type === 'usage' ? 'Session Usage' : 'Deposit'}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{date}</span>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className={cn('text-sm font-mono font-bold', type === 'usage' ? 'text-foreground' : 'text-primary')}>
        {type === 'usage' ? '-' : '+'}{amount}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-all">
        <button title="Download Invoice" className="p-2 text-muted-foreground hover:text-foreground"><Download size={14} /></button>
      </div>
    </div>
  </div>
);


// --- Main Page ---

export default function WalletPage() {
  const router = useRouter();
  const { credits, loading, error } = useCredits();
  
  // Logic
  const pricePerMinute = 12; 
  const balance = credits?.available_credits || 0;
  const minutesRemaining = Math.floor(balance / pricePerMinute);
  
  const [autoPay, setAutoPay] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-12 pb-32">
        
        {/* Header (Linear Standard) */}
        <div className="flex items-end justify-between border-b border-border/40 pb-8">
          <div className="space-y-1">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-4"
            >
              <ArrowLeft size={12} />
                    Overview
            </button>
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Credit Operations</h1>
            <p className="text-muted-foreground text-sm max-w-sm font-medium">Account balance and usage telemetry.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Badge variant="outline" className="h-8 gap-2 border-border/60 text-[10px] uppercase tracking-widest font-bold">
              <ShieldCheck size={12} className="text-green-500" />
                    Verified Organization
            </Badge>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs font-bold uppercase tracking-widest flex gap-3">
            <AlertCircle size={16} />
            System Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
          {/* Left Col: Operating Balance */}
          <div className="lg:col-span-2 space-y-8">
                
            {/* The Bond Card */}
            <PaperCard 
              variant="mesh" 
              shaderProps={{ positions: 15, grainOverlay: 0.95 }}
              className="relative border-primary/20 bg-primary/[0.01]"
            >
              <PaperCardHeader className="p-8 pb-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Operating Balance</h2>
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-1">
                    <p className="text-7xl font-medium tracking-tighter leading-none">
                      {loading ? '---' : minutesRemaining.toLocaleString()}<span className="text-2xl text-muted-foreground ml-2">m</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                    Net Liquid Value: {loading ? '...' : formatCurrency(balance)}
                    </p>
                  </div>
                            
                  <div className="bg-foreground text-background px-4 py-3 rounded-md flex items-center gap-3">
                    <TrendingDown size={18} className="text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Projected Runway</span>
                      <span className="text-sm font-bold">~4 Operating Days</span>
                    </div>
                  </div>
                </div>
              </PaperCardContent>
            </PaperCard>

            {/* Refuel Tiers */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Purchase Credits</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { mins: 500, price: 6000, label: 'Base' },
                  { mins: 2000, price: 22000, best: true, label: 'Scaling' },
                  { mins: 5000, price: 50000, label: 'Enterprise' },
                ].map((tier) => (
                  <button 
                    key={tier.mins}
                    className={cn(
                      'p-6 rounded-md border text-left transition-all group relative overflow-hidden',
                      tier.best ? 'border-primary bg-primary/[0.03]' : 'border-border/40 hover:border-primary/40 bg-card',
                    )}
                  >
                    {tier.best && <div className="absolute top-0 right-0 bg-primary text-black text-[8px] font-bold uppercase px-2 py-0.5 tracking-tighter">Recommended</div>}
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">{tier.label}</span>
                    <p className="text-2xl font-medium tracking-tight">+{tier.mins.toLocaleString()}m</p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">{formatCurrency(tier.price)}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    Initialize <ChevronRight size={10} />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Audit Ledger */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Activity Ledger</h3>
                <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Export CSV</button>
              </div>
              <div className="bg-card/30 rounded-md border border-border/20 overflow-hidden shadow-sm">
                <TransactionRow type="purchase" amount="2,000m" date="Feb 02, 2026" status="confirmed" />
                <TransactionRow type="usage" amount="12m" date="Feb 02, 2026" status="confirmed" />
                <TransactionRow type="usage" amount="45m" date="Feb 01, 2026" status="confirmed" />
                <TransactionRow type="purchase" amount="500m" date="Jan 28, 2026" status="confirmed" />
              </div>
            </section>
          </div>

          {/* Right Col: Operations Settings */}
          <div className="space-y-8">
                
            {/* Automated Top-up Panel */}
            <PaperCard className="border-border/40 bg-muted/5">
              <PaperCardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-primary" />
                  <PaperCardTitle className="text-[10px]">Automated Top-up</PaperCardTitle>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-6 pt-2 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recharge Trigger</span>
                  <button 
                    onClick={() => setAutoPay(!autoPay)}
                    className={cn(
                      'w-10 h-5 rounded-full transition-all relative',
                      autoPay ? 'bg-primary' : 'bg-muted-foreground/20',
                    )}
                  >
                    <div className={cn(
                      'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                      autoPay ? 'left-6' : 'left-1',
                    )} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Automatically deposit 1,000 mins when balance drops below 100-min threshold.
                </p>
                <div className="pt-4 border-t border-border/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Monthly Cap</span>
                    <span className="text-[10px] font-mono font-bold text-foreground">₹50,000 Max</span>
                  </div>
                </div>
              </PaperCardContent>
            </PaperCard>

            {/* Organization Identity */}
            <div className="space-y-4 px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Entity Metadata</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">Contract Type</span>
                  <span className="text-xs font-bold text-foreground">Enterprise</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">Trunk Provider</span>
                  <span className="text-xs font-bold text-foreground uppercase">Vobiz Standard</span>
                </div>
                <div className="flex justify-between py-1 border-t border-border/10 mt-2 pt-2">
                  <span className="text-xs text-muted-foreground">Currency Unit</span>
                  <span className="text-xs font-bold text-foreground">INR (₹)</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-[10px] font-bold uppercase tracking-widest border-border/60 hover:bg-primary transition-all">
                        Modify Payment Profile
              </Button>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
