'use client';

import React from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { signOut } from '@/app/actions/auth';
import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LeadIcon } from '@/components/ui/lead-icon';
import { ApiKeyManager } from './components/api-key-dialog';
import { toast } from 'sonner';

// --- Sub-Components ---

const SettingRow = ({ 
    icon: Icon, 
    label, 
    value, 
    action 
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

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(user.email);
    toast.success('Reset link sent to ' + user.email);
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
                <PaperCardContent className="p-8">
                    <ApiKeyManager />
                </PaperCardContent>
            </PaperCard>
        </section>

      </main>
    </div>
  );
}
