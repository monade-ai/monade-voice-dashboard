'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  LogOut, 
  Shield, 
  Key, 
  Bell, 
  Mail, 
  User, 
  Building,
  CreditCard,
  History,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { signOut } from '@/app/actions/auth';
import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LeadIcon } from '@/components/ui/lead-icon';
import { fetchJson } from '@/lib/http';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';

import { ApiKeyManager } from './components/api-key-dialog';

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
  const { userUid, apiKey } = useMonadeUser();
  const [isCreatingTrunk, setIsCreatingTrunk] = useState(false);
  const [trunksLoading, setTrunksLoading] = useState(false);
  const [userTrunks, setUserTrunks] = useState<any[]>([]);
  const [trunkForm, setTrunkForm] = useState({
    name: '',
    address: '',
    numbers: '',
    authUsername: '',
    authPassword: '',
  });

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(user.email);
    toast.success('Reset link sent to ' + user.email);
  };

  const fetchUserTrunks = async () => {
    if (!userUid) return;
    setTrunksLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const data = await fetchJson<any[]>(
        `${MONADE_API_CONFIG.BASE_URL}/api/users/${userUid}/trunks`,
        { headers },
      );
      setUserTrunks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch trunks:', err);
    } finally {
      setTrunksLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTrunks();
  }, [userUid]);

  const handleCreateTrunk = async () => {
    if (!userUid) {
      toast.error('User not available. Please sign in again.');

      return;
    }

    const numbers = trunkForm.numbers
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (!trunkForm.name || !trunkForm.address || numbers.length === 0) {
      toast.error('Please provide name, address, and at least one number.');

      return;
    }

    setIsCreatingTrunk(true);
    try {
      const payload: Record<string, unknown> = {
        name: trunkForm.name,
        address: trunkForm.address,
        numbers,
      };
      if (trunkForm.authUsername) payload.auth_username = trunkForm.authUsername;
      if (trunkForm.authPassword) payload.auth_password = trunkForm.authPassword;

      // 1) Register provider trunk (LiveKit)
      await fetchJson('/api/proxy-trunks/trunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        retry: { retries: 0 },
      });

      // 2) Assign trunk to user (DB services)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      await fetchJson(`${MONADE_API_CONFIG.BASE_URL}/api/users/${userUid}/trunks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        retry: { retries: 0 },
      });

      toast.success('Trunk created and assigned.');
      setTrunkForm({ name: '', address: '', numbers: '', authUsername: '', authPassword: '' });
      fetchUserTrunks();
    } catch (err) {
      console.error('Failed to create trunk:', err);
      toast.error('Failed to create trunk. Please check the details and try again.');
    } finally {
      setIsCreatingTrunk(false);
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
          <form action={signOut}>
            <Button
              type="submit"
              variant="destructive"
              className="h-10 px-4 gap-2 rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
            >
              <LogOut size={14} />
                  Sign Out
            </Button>
          </form>
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

        {/* --- Trunks --- */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Trunks</h2>
          <PaperCard className="border-border/40 bg-background shadow-sm">
            <PaperCardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Your SIP Trunks</h3>
                  <p className="text-xs text-muted-foreground">Create and manage trunks for outbound calls.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUserTrunks}
                  className="h-8 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-background"
                >
                  Refresh
                </Button>
              </div>

              <div className="space-y-2">
                {trunksLoading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Loading trunks...</div>
                ) : userTrunks.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-border/40 rounded-md bg-muted/5">
                    <p className="text-xs text-muted-foreground italic">No trunks yet.</p>
                  </div>
                ) : (
                  userTrunks.map((trunk) => (
                    <div key={trunk.id || trunk.name} className="flex items-center justify-between p-3 rounded-md bg-muted/10 border border-border/20">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{trunk.name}</span>
                        <span className="text-[10px] text-muted-foreground">{trunk.address}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{(trunk.numbers || []).length} numbers</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border/10 pt-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Trunk</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                    <Input
                      value={trunkForm.name}
                      onChange={(e) => setTrunkForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="My SIP Trunk"
                      className="bg-muted/10 border-border/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Address</label>
                    <Input
                      value={trunkForm.address}
                      onChange={(e) => setTrunkForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="sip.provider.com"
                      className="bg-muted/10 border-border/20"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Numbers</label>
                    <Input
                      value={trunkForm.numbers}
                      onChange={(e) => setTrunkForm((prev) => ({ ...prev, numbers: e.target.value }))}
                      placeholder="+1234567890, +1234567891 (comma or newline separated)"
                      className="bg-muted/10 border-border/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auth Username</label>
                    <Input
                      value={trunkForm.authUsername}
                      onChange={(e) => setTrunkForm((prev) => ({ ...prev, authUsername: e.target.value }))}
                      placeholder="myuser"
                      className="bg-muted/10 border-border/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auth Password</label>
                    <Input
                      type="password"
                      value={trunkForm.authPassword}
                      onChange={(e) => setTrunkForm((prev) => ({ ...prev, authPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="bg-muted/10 border-border/20"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setTrunkForm({ name: '', address: '', numbers: '', authUsername: '', authPassword: '' })}
                    className="h-9 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-background"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleCreateTrunk}
                    disabled={isCreatingTrunk}
                    className="h-9 text-[10px] font-bold uppercase tracking-widest"
                  >
                    {isCreatingTrunk ? 'Creating...' : 'Create Trunk'}
                  </Button>
                </div>
              </div>
            </PaperCardContent>
          </PaperCard>
        </section>

      </main>

    </div>
  );
}
