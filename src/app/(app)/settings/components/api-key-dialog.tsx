'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { createApiKey, deleteApiKeyById, listApiKeys } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';

interface BetterAuthApiKey {
  id: string;
  name?: string | null;
  start?: string | null;
  prefix?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
  enabled?: boolean;
}

function extractCreatedKey(payload: any): string | null {
  const candidates = [
    payload?.key,
    payload?.apiKey?.key,
    payload?.data?.key,
    payload?.data?.apiKey?.key,
    payload?.data?.data?.key,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function normalizeApiKeys(input: any[]): BetterAuthApiKey[] {
  return input.map((raw) => ({
    id: String(raw?.id ?? ''),
    name: raw?.name ?? null,
    start: raw?.start ?? null,
    prefix: raw?.prefix ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? undefined,
    expiresAt: raw?.expiresAt ?? raw?.expires_at ?? null,
    enabled: raw?.enabled ?? true,
  })).filter((key) => key.id.length > 0);
}

function getKeyPreview(key: BetterAuthApiKey) {
  const first = key.start || key.prefix || key.id;
  if (!first) return '********';

  return `${first}...`;
}

export function ApiKeyManager() {
  const { userUid, loading: userLoading, error: userError, refetch } = useMonadeUser();
  const [keys, setKeys] = useState<BetterAuthApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!userUid) {
      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      const listed = await listApiKeys();
      setKeys(normalizeApiKeys(Array.isArray(listed) ? listed : []));
    } catch (error) {
      console.error('Failed to fetch API keys', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    if (userUid) {
      fetchKeys();
    } else if (!userLoading) {
      setLoading(false);
    }
  }, [userUid, userLoading, fetchKeys]);

  const handleGenerate = async () => {
    if (!userUid) return;
    setIsGenerating(true);
    try {
      const data = await createApiKey('Dashboard key');
      const createdKey = extractCreatedKey(data);
      if (!createdKey) {
        throw new Error('API key created, but raw key was not returned.');
      }

      setNewKey(createdKey);
      await fetchKeys();
      toast.success('New API key generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will revoke access for integrations using this key.')) return;

    try {
      await deleteApiKeyById(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('Key revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke key');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">Active Credentials</h3>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !userUid}
          size="sm"
          className="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
        >
          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Generate New
        </Button>
      </div>

      <div className="space-y-2">
        {userLoading || loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading secure vault...</div>
        ) : !userUid ? (
          <div className="py-8 px-4 text-center border border-dashed border-border/40 rounded-md bg-muted/5 space-y-3">
            <p className="text-xs text-muted-foreground italic">
              {userError || 'Your internal Monade account is not ready yet. API keys cannot be loaded.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-[10px] font-bold uppercase tracking-widest"
            >
              Retry
            </Button>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border/40 rounded-md bg-muted/5">
            <p className="text-xs text-muted-foreground italic">No active keys found.</p>
          </div>
        ) : (
          keys.map((key) => (
            <div key={key.id} className="group flex items-center justify-between p-3 rounded-md bg-muted/10 border border-border/20 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Key size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-medium text-foreground">
                    {getKeyPreview(key)}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
                    Created {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDelete(key.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-destructive hover:bg-background/80 transition-all"
                  title="Revoke Key"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <ShieldCheck className="text-green-500" size={20} />
              Credentials Generated
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This key is shown only once. Store it securely now.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 bg-muted/30 border border-border/40 rounded-md space-y-4 my-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Secret Key</label>
              <div className="flex items-center gap-2">
                <Input
                  value={newKey || ''}
                  readOnly
                  className="font-mono text-sm bg-background border-border/40 h-10"
                />
                <Button
                  onClick={() => handleCopy(newKey || '')}
                  className={cn(
                    'h-10 w-10 shrink-0 transition-colors',
                    copied ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-primary hover:bg-primary/90 text-black',
                  )}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-start p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-600">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed font-medium">
                Store this key securely. Monade cannot recover lost keys. If you lose it, generate a new one.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setNewKey(null)}
              disabled={!copied}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {copied ? 'I have stored this key' : 'Copy key to continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
