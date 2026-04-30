'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  LogOut, 
  Shield, 
  Key, 
  Bell, 
  Building,
  CreditCard,
  History,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/auth-context';
import { backendSignOut } from '@/lib/auth/backend-auth';
import { clearClientAuthState } from '@/lib/auth/client-auth-state';
import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LeadIcon } from '@/components/ui/lead-icon';
import { cn } from '@/lib/utils';
import { getUserById, updateAutoEnhancedTranscript } from '@/lib/services/monade-api.service';

import { ApiKeyManager } from './components/api-key-dialog';
import { WebhookManager } from './components/webhook-manager';

// --- Sub-Components ---

const SettingRow = ({ 
  icon: Icon, 
  label, 
  value, 
  action, 
}: { 
    icon: any, 
    label: string, 
    value?: string, 
    action?: React.ReactNode 
}) => (
  <div className="flex items-center justify-between py-4 border-b border-border/10 last:border-0">
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground">
        <Icon size={14} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {value && <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{value}</span>}
      </div>
    </div>
    {action}
  </div>
);

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [autoEnhancedTranscript, setAutoEnhancedTranscript] = useState(false);
  const [isLoadingAutoEnhanced, setIsLoadingAutoEnhanced] = useState(true);
  const [isSavingAutoEnhanced, setIsSavingAutoEnhanced] = useState(false);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    toast.info('Password reset is not exposed in backend auth endpoints yet. Please contact support.');
  };

  useEffect(() => {
    if (!user?.id) {
      setIsLoadingAutoEnhanced(false);
      return;
    }

    let isActive = true;

    const loadAutoEnhancedTranscript = async () => {
      try {
        setIsLoadingAutoEnhanced(true);
        const monadeUser = await getUserById(user.id);
        if (!isActive) return;
        setAutoEnhancedTranscript(Boolean(monadeUser.autoEnhancedTranscript));
      } catch (error) {
        console.error('[SettingsPage] Failed to load auto enhanced transcript setting:', error);
        if (!isActive) return;
        toast.error('Could not load enhanced transcript preference.');
      } finally {
        if (isActive) {
          setIsLoadingAutoEnhanced(false);
        }
      }
    };

    loadAutoEnhancedTranscript();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  const handleToggleAutoEnhancedTranscript = async () => {
    if (!user?.id || isSavingAutoEnhanced || isLoadingAutoEnhanced) return;

    const nextValue = !autoEnhancedTranscript;
    setAutoEnhancedTranscript(nextValue);
    setIsSavingAutoEnhanced(true);

    try {
      const response = await updateAutoEnhancedTranscript(user.id, nextValue);
      setAutoEnhancedTranscript(Boolean(response.autoEnhancedTranscript));
      toast.success(
        nextValue
          ? 'Auto-enhanced transcripts enabled for outbound calls.'
          : 'Auto-enhanced transcripts turned off.',
      );
    } catch (error) {
      console.error('[SettingsPage] Failed to update auto enhanced transcript setting:', error);
      setAutoEnhancedTranscript(!nextValue);
      toast.error('Could not update enhanced transcript preference.');
    } finally {
      setIsSavingAutoEnhanced(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await backendSignOut();
    } catch {
      toast.error('Could not complete sign out cleanly. Redirecting to login.');
    } finally {
      clearClientAuthState();
      window.location.replace('/login');
      // router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-12 pb-32">
        
        {/* Header Horizon */}
        <div className="flex items-end justify-between border-b border-border/40 pb-8">
          <div className="space-y-2">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-4"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your account and preferences.</p>
          </div>
          <Button
            type="button"
            onClick={handleSignOut}
            variant="destructive"
            className="h-10 px-4 gap-2 rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
          >
            <LogOut size={14} />
            Sign Out
          </Button>
        </div>

        {/* --- Identity Section --- */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Your Profile</h2>
          <PaperCard variant="mesh" shaderProps={{ positions: 20 }} className="border-border/40">
            <PaperCardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="shrink-0">
                <LeadIcon seed={user?.id || 'default'} size={80} />
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                    <Input 
                      value={user?.user_metadata?.full_name || 'User'} 
                      readOnly 
                      className="bg-muted/10 border-border/20 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
                    <Input 
                      value={user?.email || ''} 
                      readOnly 
                      className="bg-muted/10 border-border/20 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-green-500/30 text-green-600 bg-green-500/5">Verified User</Badge>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-border/40 text-muted-foreground">ID: {user?.id.substring(0, 8)}...</Badge>
                </div>
              </div>
            </PaperCardContent>
          </PaperCard>
        </section>

        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Call Preferences</h2>
          <PaperCard className="border-border/40 bg-background shadow-sm">
            <PaperCardContent className="p-8">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Auto-generate enhanced transcript</h3>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Outbound calls only
                      </p>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    When enabled, every completed outbound call is automatically sent to the enhanced transcript pipeline
                    once the recording is ready. Inbound calls are not affected.
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground/90">
                    Cost note: each enhanced transcript runs Gemini on the call audio. If you only need this sometimes,
                    leave it off and generate enhanced transcripts manually per call.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={autoEnhancedTranscript}
                  aria-label="Toggle auto-generate enhanced transcript for outbound calls"
                  onClick={handleToggleAutoEnhancedTranscript}
                  disabled={!user?.id || isLoadingAutoEnhanced || isSavingAutoEnhanced}
                  className={cn(
                    'relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    autoEnhancedTranscript
                      ? 'border-primary bg-primary'
                      : 'border-border/70 bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-background shadow-sm transition-transform',
                      autoEnhancedTranscript ? 'translate-x-7' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase tracking-widest border-border/40 text-muted-foreground"
                >
                  {isLoadingAutoEnhanced
                    ? 'Loading'
                    : isSavingAutoEnhanced
                      ? 'Saving'
                      : autoEnhancedTranscript
                        ? 'Enabled'
                        : 'Disabled'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Completed outbound calls usually start processing within 1 to 3 minutes after the call ends.
                </span>
              </div>
            </PaperCardContent>
          </PaperCard>
        </section>

        {/* --- Workspace & Security --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
          {/* Security Panel */}
          <section className="space-y-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Login & Security</h2>
            <PaperCard className="border-border/40 bg-muted/5">
              <PaperCardContent className="p-6">
                <SettingRow 
                  icon={Key} 
                  label="Password" 
                  value="Last changed 30d ago"
                  action={
                    <Button variant="outline" size="sm" onClick={handleResetPassword} className="h-8 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-background">
                                    Change
                    </Button>
                  } 
                />
                <SettingRow 
                  icon={Shield} 
                  label="Two-Factor Auth" 
                  value="Not enabled"
                  action={
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 hover:bg-transparent px-0">
                                    Setup
                    </Button>
                  } 
                />
                <SettingRow 
                  icon={History} 
                  label="Login History" 
                  value="View recent activity"
                  action={
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground hover:bg-transparent">
                      <ArrowUpRight size={14} />
                    </Button>
                  } 
                />
              </PaperCardContent>
            </PaperCard>
          </section>

          {/* Workspace Panel */}
          <section className="space-y-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Team & Billing</h2>
            <PaperCard className="border-border/40 bg-muted/5">
              <PaperCardContent className="p-6">
                <SettingRow 
                  icon={Building} 
                  label="Organization" 
                  value="Monade Inc."
                  action={<Badge variant="secondary" className="text-[9px] bg-foreground text-background">ADMIN</Badge>} 
                />
                <SettingRow 
                  icon={CreditCard} 
                  label="Current Plan" 
                  value="Enterprise"
                  action={<span className="text-[10px] font-bold text-primary">ACTIVE</span>} 
                />
                <SettingRow 
                  icon={Bell} 
                  label="Email Updates" 
                  value="Weekly digests on"
                  action={
                    <div className="w-8 h-4 rounded-full bg-primary relative cursor-pointer">
                      <div className="absolute right-1 top-0.5 w-3 h-3 rounded-full bg-black" />
                    </div>
                  } 
                />
              </PaperCardContent>
            </PaperCard>
          </section>
        </div>

        {/* --- API Zone (Developer) --- */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">API & Integrations</h2>
          <PaperCard className="border-border/40 bg-background shadow-sm">
            <PaperCardContent className="p-8 space-y-6">
              <ApiKeyManager />
            </PaperCardContent>
          </PaperCard>
        </section>

        {/* --- Webhooks --- */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Webhooks</h2>
          <PaperCard className="border-border/40 bg-background shadow-sm">
            <PaperCardContent className="p-8 space-y-6">
              <WebhookManager />
            </PaperCardContent>
          </PaperCard>
        </section>

      </main>

    </div>
  );
}
