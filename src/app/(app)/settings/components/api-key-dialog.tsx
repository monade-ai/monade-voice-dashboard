'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: number;
  api_key: string;
  created_at: string;
  is_active: boolean;
}

export function ApiKeyManager() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Keys
  const fetchKeys = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${MONADE_API_CONFIG.BASE_URL}/api/users/${user.id}/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [user?.id]);

  // Generate Key
  const handleGenerate = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${MONADE_API_CONFIG.BASE_URL}/api/users/${user.id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const data = await res.json();
        // The API returns the new key object
        const key = data.api_key || data.key; 
        setNewKey(key);
        await fetchKeys();
        toast.success('New Access Key Generated');
      } else {
        toast.error('Failed to generate key');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete Key
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will immediately revoke access for any application using this key.')) return;
    
    try {
      const res = await fetch(`${MONADE_API_CONFIG.BASE_URL}/api/api-keys/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success('Key Revoked');
      } else {
        toast.error('Failed to revoke key');
      }
    } catch (err) {
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
          disabled={isGenerating}
          size="sm"
          className="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
        >
          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Generate New
        </Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading secure vault...</div>
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
                    {key.api_key.substring(0, 12)}...
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
                                Created {new Date(key.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(key.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all"
                title="Revoke Key"
              >
                <Trash2 size={14} />
              </button>
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
