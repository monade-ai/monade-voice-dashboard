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
import { MONADE_API_CONFIG } from '@/types/monade-api.types';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: string;
  api_key?: string;
  key?: string;
  prefix?: string;
  name?: string;
  created_at?: string;
  createdAt?: string;
  is_active?: boolean;
  isActive?: boolean;
}

export function ApiKeyManager() {
  const { userUid, loading: userLoading, error: userError, refetch } = useMonadeUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const authApiKeyBase = `${MONADE_API_CONFIG.BASE_URL}/api/auth/api-key`;

  const extractKeys = (payload: any): ApiKey[] => {
    const raw = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.api_keys)
        ? payload.api_keys
        : (Array.isArray(payload?.keys)
          ? payload.keys
          : (Array.isArray(payload?.data) ? payload.data : [])));

    return raw.map((key: any) => ({
      ...key,
      id: String(key?.id ?? key?.keyId ?? key?.key_id ?? key?.prefix ?? Math.random()),
    }));
  };

  const requestWithFallback = async (
    candidates: string[],
    init?: RequestInit,
  ): Promise<Response> => {
    let lastResponse: Response | null = null;
    for (const url of candidates) {
      const response = await fetch(url, {
        ...init,
        credentials: 'include',
      });
      if (response.ok) return response;
      lastResponse = response;
      if (response.status !== 404) return response;
    }
    if (lastResponse) return lastResponse;
    throw new Error('No endpoint candidates provided');
  };

  // Fetch Keys
  const fetchKeys = useCallback(async () => {
    if (!userUid) {
      setLoading(false);

      return;
    }
    try {
      setLoading(true);
      const res = await requestWithFallback([
        `${authApiKeyBase}/list-api-keys`,
        `${authApiKeyBase}/list`,
      ]);
      if (res.ok) {
        const data = await res.json();
        setKeys(extractKeys(data));
      } else {
        toast.error('Failed to fetch API keys');
      }
    } catch {
      console.error('Failed to fetch API keys');
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, [authApiKeyBase, userUid]);

  useEffect(() => {
    if (userUid) {
      fetchKeys();
    } else if (!userLoading) {
      setLoading(false);
    }
  }, [userUid, userLoading, fetchKeys]);

  // Generate Key
  const handleGenerate = async () => {
    if (!userUid) return;
    setIsGenerating(true);
    try {
      const res = await requestWithFallback(
        [
          `${authApiKeyBase}/create-api-key`,
          `${authApiKeyBase}/create`,
        ],
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Dashboard Key ${new Date().toISOString()}` }),
        },
      );
      
      if (res.ok) {
        const data = await res.json();
        // The API returns the new key object
        const key = data?.api_key || data?.key || data?.token || data?.rawKey || null;
        setNewKey(key);
        await fetchKeys();
        toast.success('New Access Key Generated');
      } else {
        toast.error('Failed to generate key');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete Key
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will immediately revoke access for any application using this key.')) return;
    
    try {
      const res = await requestWithFallback(
        [
          `${authApiKeyBase}/delete-api-key`,
          `${authApiKeyBase}/delete`,
        ],
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyId: id }),
        },
      );
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success('Key Revoked');
      } else {
        toast.error('Failed to revoke key');
      }
    } catch {
      toast.error('Network error');
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
                    {(key.prefix || key.api_key || key.key || key.name || key.id).toString().substring(0, 18)}...
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
                                Created {new Date(key.created_at || key.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopy((key.api_key || key.key || key.prefix || key.id).toString())}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
                  title="Copy Key"
                >
                  <Copy size={13} />
                </button>
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

      {/* --- The Reveal Modal (One-Time View) --- */}
      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <ShieldCheck className="text-green-500" size={20} />
                    Credentials Generated
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
                    This key grants full access to your Monade account. It will only be displayed once.
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
                        Store this key securely. Monade cannot recover lost keys. If you lose it, you must generate a new one.
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
