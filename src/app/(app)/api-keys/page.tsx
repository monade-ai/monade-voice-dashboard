'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Activity,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { MONADE_API_BASE } from '@/config';
import { fetchJson } from '@/lib/http';
import { cn } from '@/lib/utils';

// --- Types ---

interface BaApiKey {
  id: string;
  name?: string;
  start?: string;
  prefix?: string;
  key?: string;
  enabled: boolean;
  requestCount?: number;
  remaining?: number | null;
  expiresAt?: string | null;
  createdAt?: string;
  lastRequest?: string | null;
}

const API_KEY_BASE = `${MONADE_API_BASE}/api/auth/api-key`;

// --- Key Row ---

function ApiKeyRow({
  apiKey,
  fullKey,
  onDelete,
  deleting,
}: {
  apiKey: BaApiKey;
  fullKey?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayKey = fullKey || apiKey.key;
  const prefix = apiKey.start || apiKey.prefix || (displayKey ? displayKey.slice(0, 10) : '');
  const maskedKey = `${prefix}${'•'.repeat(24)}`;

  const handleCopy = () => {
    if (!displayKey) {
      toast.error('Full key is not available for this entry');
      return;
    }
    navigator.clipboard.writeText(displayKey);
    setCopied(true);
    toast.success('Full key copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      'group flex items-center justify-between p-4 rounded-md border transition-all',
      apiKey.enabled
        ? 'bg-card/50 border-border/30 hover:border-border/60'
        : 'bg-muted/10 border-border/20 opacity-60',
    )}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          apiKey.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}>
          <Key size={15} />
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {apiKey.name || 'Unnamed Key'}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[8px] font-bold uppercase tracking-widest px-1.5 py-0 h-4 flex-shrink-0',
                apiKey.enabled
                  ? 'border-green-500/30 text-green-600 bg-green-500/5'
                  : 'border-red-500/30 text-red-500 bg-red-500/5',
              )}
            >
              {apiKey.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground select-all">
            {revealed ? (displayKey || `${prefix}...`) : maskedKey}
          </span>
          <div className="flex items-center gap-3 mt-0.5">
            {apiKey.createdAt && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                <Calendar size={9} />
                {new Date(apiKey.createdAt).toLocaleDateString()}
              </span>
            )}
            {typeof apiKey.requestCount === 'number' && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                <Activity size={9} />
                {apiKey.requestCount.toLocaleString()} requests
              </span>
            )}
            {apiKey.expiresAt && (
              <span className="text-[9px] text-yellow-600 font-medium uppercase tracking-widest">
                Expires {new Date(apiKey.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
        <button
          onClick={() => setRevealed(!revealed)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          title={revealed ? 'Hide key' : 'Show key'}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={handleCopy}
          className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          title="Copy full key"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
        </button>
        <button
          onClick={() => onDelete(apiKey.id)}
          disabled={deleting}
          className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all disabled:opacity-50"
          title="Revoke key"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function ApiKeysPage() {
  const router = useRouter();
  const { userUid, loading: userLoading } = useMonadeUser();

  const [keys, setKeys] = useState<BaApiKey[]>([]);
  const [fullKeys, setFullKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const extractKeys = (payload: unknown): BaApiKey[] => {
    const p = payload as any;
    const raw = Array.isArray(payload)
      ? payload
      : (Array.isArray(p?.apiKeys)
        ? p.apiKeys
        : (Array.isArray(p?.api_keys)
          ? p.api_keys
          : (Array.isArray(p?.keys)
            ? p.keys
            : (Array.isArray(p?.data) ? p.data : []))));

    return (raw as any[]).map((k: any) => ({
      id: String(k?.id ?? k?.keyId ?? k?.key_id ?? Math.random()),
      name: k?.name,
      start: k?.start,
      prefix: k?.prefix,
      key: k?.key ?? k?.api_key ?? k?.rawKey ?? k?.token ?? k?.value ?? undefined,
      enabled: k?.enabled ?? k?.is_active ?? true,
      requestCount: k?.requestCount ?? k?.request_count,
      remaining: k?.remaining,
      expiresAt: k?.expiresAt ?? k?.expires_at,
      createdAt: k?.createdAt ?? k?.created_at,
      lastRequest: k?.lastRequest ?? k?.last_request,
    }));
  };

  const fetchKeys = useCallback(async () => {
    if (!userUid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchJson<unknown>(`${API_KEY_BASE}/list`, { retry: { retries: 1 } });
      setKeys(extractKeys(data));
    } catch (err) {
      console.error('[ApiKeys] fetch error:', err);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    if (!userLoading) fetchKeys();
  }, [userLoading, fetchKeys]);

  const handleCreate = async () => {
    if (!userUid) return;
    setCreating(true);
    try {
      const data = await fetchJson<any>(`${API_KEY_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || `Key ${new Date().toLocaleDateString()}` }),
        retry: { retries: 0 },
      });
      const payload = data?.data ?? data;
      const fullKey = payload?.key ?? payload?.api_key ?? payload?.rawKey ?? payload?.token ?? payload?.value ?? null;
      const keyId = payload?.id ?? payload?.keyId ?? payload?.key_id ?? null;
      if (fullKey && keyId) {
        setFullKeys(prev => ({ ...prev, [String(keyId)]: fullKey }));
      }
      setNewKeyName('');
      setShowCreateForm(false);
      await fetchKeys();
      toast.success('API key created — click the eye icon to reveal it');
    } catch (err) {
      console.error('[ApiKeys] create error:', err);
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Revoke this key? Any applications using it will immediately lose access.')) return;
    setDeletingId(id);
    try {
      await fetchJson(`${API_KEY_BASE}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: id }),
        retry: { retries: 0 },
      });
      setKeys(prev => prev.filter(k => k.id !== id));
      setFullKeys(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Key revoked');
    } catch (err) {
      console.error('[ApiKeys] delete error:', err);
      toast.error('Failed to revoke key');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-10 pb-32">

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
              <h1 className="text-5xl font-medium tracking-tighter text-foreground">API Keys</h1>
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border-border text-muted-foreground uppercase tracking-widest font-mono"
              >
                {keys.filter(k => k.enabled).length} Active
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Manage programmatic access credentials for your Monade account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchKeys}
              disabled={loading}
              className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
              className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-widest"
            >
              <Plus size={14} />
              New Key
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <PaperCard className="bg-primary/5 border-primary/10">
          <PaperCardContent className="p-4 flex items-start gap-3">
            <ShieldCheck size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">How to use your API key</p>
              <p className="text-[11px] text-muted-foreground">
                Use{' '}
                <code className="font-mono bg-muted px-1 rounded text-[10px]">Authorization: Bearer &lt;key&gt;</code>
                {' '}in your API requests. Use the eye icon to reveal keys and the copy button to copy.
              </p>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Create Form (inline) */}
        {showCreateForm && (
          <PaperCard className="border-primary/20 bg-card/30">
            <PaperCardContent className="p-5 space-y-3">
              <span className="text-sm font-semibold text-foreground">New API Key</span>
              <div className="flex gap-3">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production SDK)"
                  className="h-9 text-sm bg-background border-border/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="h-9 px-4 gap-2 bg-primary text-black hover:bg-primary/90 text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
                >
                  {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowCreateForm(false); setNewKeyName(''); }}
                  disabled={creating}
                  className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </PaperCardContent>
          </PaperCard>
        )}

        {/* Keys List */}
        <div className="space-y-3">
          {loading && keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading keys...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center border border-dashed border-border/50 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Key size={24} className="text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-medium tracking-tight text-foreground">No API Keys</h3>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Create a key to authenticate SDK and programmatic API calls.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-widest"
              >
                <Plus size={12} /> Create First Key
              </Button>
            </div>
          ) : (
            keys.map((k) => (
              <ApiKeyRow
                key={k.id}
                apiKey={k}
                fullKey={fullKeys[k.id]}
                onDelete={handleDelete}
                deleting={deletingId === k.id}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
