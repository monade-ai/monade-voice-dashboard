'use client';

import React, { useMemo } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  RefreshCw,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCredits } from '@/app/hooks/use-credits';
import {
  useBillingConfig,
  useUserPricing,
  useSubscriptions,
  useLedger,
  Subscription,
  LedgerEntry,
} from '@/app/hooks/use-billing';

// --- Helpers ---

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dateString;
  }
}

function daysUntil(dateString: string): number {
  const now = new Date();
  const target = new Date(dateString);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function featureLabel(feature: string): string {
  const labels: Record<string, string> = {
    rag_engine: 'RAG Engine',
  };
  return labels[feature] || feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    topup: 'Top-up',
    bundle_purchase: 'Bundle Purchase',
    bundle_renewal: 'Bundle Renewal',
    bundle_cancel: 'Bundle Cancel',
    refund: 'Refund',
    manual_adjustment: 'Adjustment',
  };
  return labels[type] || type;
}

// --- Subscription Card ---

function SubscriptionCard({
  subscription,
  onUnsubscribe,
  actionLoading,
}: {
  subscription: Subscription;
  onUnsubscribe: (feature: string) => void;
  actionLoading: boolean;
}) {
  const isActive = subscription.status === 'active';
  const isCancelled = subscription.status === 'cancelled';
  const isExpired = subscription.status === 'expired';
  const daysLeft = daysUntil(subscription.cycle_end);

  return (
    <PaperCard variant="default" className={cn(
      'bg-card/50 border-border/40',
      isActive && 'border-green-500/20',
      isExpired && 'border-red-500/20 opacity-70',
    )}>
      <PaperCardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isActive ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted border border-border/50',
            )}>
              <Zap size={18} className={isActive ? 'text-green-500' : 'text-muted-foreground'} />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">{featureLabel(subscription.feature)}</h3>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                {subscription.credits_per_cycle} credits/cycle
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-[8px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase tracking-widest',
              isActive && 'border-green-500/30 text-green-500 bg-green-500/5',
              isCancelled && 'border-orange-500/30 text-orange-500 bg-orange-500/5',
              isExpired && 'border-red-500/30 text-red-500 bg-red-500/5',
            )}
          >
            {subscription.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Billing Window</p>
            <span className="text-xs font-medium text-foreground">
              {formatDate(subscription.cycle_start)} — {formatDate(subscription.cycle_end)}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Days Remaining</p>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">{daysLeft} days</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/20">
          <div className="flex items-center gap-2">
            {isActive && subscription.auto_renew ? (
              <>
                <CheckCircle2 size={12} className="text-green-500" />
                <span className="text-[10px] text-muted-foreground">Auto-renew on</span>
              </>
            ) : isCancelled ? (
              <>
                <XCircle size={12} className="text-orange-500" />
                <span className="text-[10px] text-muted-foreground">Cancelled — access until {formatDate(subscription.cycle_end)}</span>
              </>
            ) : isExpired ? (
              <>
                <AlertCircle size={12} className="text-red-500" />
                <span className="text-[10px] text-muted-foreground">Expired — re-subscribe to restore access</span>
              </>
            ) : null}
          </div>
          {isActive && subscription.auto_renew && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => onUnsubscribe(subscription.feature)}
              className="text-[9px] font-bold uppercase tracking-widest h-7 px-3 text-red-500 border-red-500/30 hover:bg-red-500/5"
            >
              {actionLoading ? <Loader2 size={10} className="animate-spin" /> : 'Cancel'}
            </Button>
          )}
        </div>
      </PaperCardContent>
    </PaperCard>
  );
}

// --- Ledger Row ---

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.direction === 'credit';
  return (
    <tr className="border-b border-border/10 hover:bg-muted/20 transition-colors">
      <td className="py-3 px-4">
        <span className="text-xs text-foreground">{formatDateTime(entry.created_at)}</span>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest rounded-[2px] border-border">
          {eventTypeLabel(entry.event_type)}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-muted-foreground">{entry.description}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className={cn('text-xs font-bold font-mono', isCredit ? 'text-green-500' : 'text-red-500')}>
          {isCredit ? '+' : '-'}{parseFloat(entry.amount).toFixed(2)}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-xs font-mono text-muted-foreground">
          {parseFloat(entry.balance_after).toFixed(2)}
        </span>
      </td>
    </tr>
  );
}

// --- Main Page ---

export default function SubscriptionsPage() {
  const router = useRouter();
  const { credits, loading: creditsLoading } = useCredits();
  const { configs, loading: configLoading, getConfig } = useBillingConfig();
  const { pricing, loading: pricingLoading } = useUserPricing();
  const { subscriptions, loading: subsLoading, actionLoading, unsubscribe, refetch: refetchSubs } = useSubscriptions();
  const { entries: ledgerEntries, total: ledgerTotal, page: ledgerPage, totalPages: ledgerTotalPages, loading: ledgerLoading, fetchLedger } = useLedger();

  const balance = Number(credits?.available_credits) || 0;
  const creditValueInr = pricing.credit_value_inr_default || getConfig('credit_value_inr_default') || '4.0';
  const voiceCostPerMin = getConfig('voice_cost_per_minute') || '1.0';
  const recordingSurcharge = getConfig('recording_surcharge_per_minute') || '0.5';

  const isLoading = creditsLoading || configLoading || pricingLoading || subsLoading;

  const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'active' || s.status === 'cancelled'), [subscriptions]);
  const expiredSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'expired'), [subscriptions]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-10 pb-32">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-medium tracking-tighter text-foreground">Subscriptions</h1>
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border-primary/40 text-primary bg-primary/5 uppercase tracking-widest"
              >
                Beta
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Your pricing, active subscriptions, and transaction history.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => { refetchSubs(); fetchLedger(); }}
            disabled={isLoading}
            className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {isLoading && subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading billing data...</p>
          </div>
        ) : (
          <>
            {/* Pricing & Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Credit Balance */}
              <PaperCard variant="mesh" shaderProps={{ positions: 15, grainOverlay: 0.95 }} className="border-primary/20 bg-primary/[0.01]">
                <PaperCardHeader className="p-6 pb-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-primary">Credit Balance</span>
                </PaperCardHeader>
                <PaperCardContent className="p-6 pt-2">
                  <p className="text-4xl font-medium tracking-tighter leading-none">
                    {creditsLoading ? '---' : balance.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-2">
                    Available credits
                  </p>
                </PaperCardContent>
              </PaperCard>

              {/* Your Rate */}
              <PaperCard className="border-border/40 bg-card/50">
                <PaperCardHeader className="p-6 pb-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Your Pricing</span>
                </PaperCardHeader>
                <PaperCardContent className="p-6 pt-2 space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium tracking-tighter">₹{parseFloat(creditValueInr).toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">/credit</span>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-border/20">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Voice base rate</span>
                      <span className="font-bold text-foreground">{voiceCostPerMin} cr/min</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Recording surcharge</span>
                      <span className="font-bold text-foreground">+{recordingSurcharge} cr/min</span>
                    </div>
                  </div>
                </PaperCardContent>
              </PaperCard>

              {/* Quick Stats */}
              <PaperCard className="border-border/40 bg-card/50">
                <PaperCardHeader className="p-6 pb-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Active Subscriptions</span>
                </PaperCardHeader>
                <PaperCardContent className="p-6 pt-2">
                  <p className="text-4xl font-medium tracking-tighter leading-none">{activeSubscriptions.length}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-2">
                    {activeSubscriptions.length === 1 ? 'Feature active' : 'Features active'}
                  </p>
                </PaperCardContent>
              </PaperCard>
            </div>

            {/* Active Subscriptions */}
            <section className="space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Active Subscriptions</h2>
              {activeSubscriptions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/50 rounded-lg">
                  <CreditCard size={24} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-xs text-muted-foreground">No active subscriptions. Feature bundles like RAG Engine can be subscribed from their respective pages.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSubscriptions.map(sub => (
                    <SubscriptionCard
                      key={sub.id}
                      subscription={sub}
                      onUnsubscribe={unsubscribe}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Expired Subscriptions */}
            {expiredSubscriptions.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Expired</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expiredSubscriptions.map(sub => (
                    <SubscriptionCard
                      key={sub.id}
                      subscription={sub}
                      onUnsubscribe={unsubscribe}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Transaction Ledger */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Transaction History</h2>
                <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border-border text-muted-foreground uppercase tracking-widest">
                  {ledgerTotal} entries
                </Badge>
              </div>

              {ledgerLoading && ledgerEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/50 rounded-lg">
                  <p className="text-xs text-muted-foreground italic">No transactions yet. Top-ups, subscription charges, and refunds will appear here.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-border/30">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Date</th>
                        <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Type</th>
                        <th className="py-3 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Description</th>
                        <th className="py-3 px-4 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Amount</th>
                        <th className="py-3 px-4 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map(entry => (
                        <LedgerRow key={entry.id} entry={entry} />
                      ))}
                    </tbody>
                  </table>

                  {ledgerTotalPages > 1 && (
                    <div className="px-4 py-3 flex items-center justify-between border-t border-border/20">
                      <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                        Page {ledgerPage} of {ledgerTotalPages}
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => fetchLedger({ page: ledgerPage - 1 })}
                          disabled={ledgerPage <= 1 || ledgerLoading}
                          className="text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => fetchLedger({ page: ledgerPage + 1 })}
                          disabled={ledgerPage >= ledgerTotalPages || ledgerLoading}
                          className="text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
