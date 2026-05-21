'use client';

import React, { useState } from 'react';
import { Loader2, DownloadCloud } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ImportChannelPayload } from '@/app/hooks/use-vobiz-whatsapp';

interface ImportChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (payload: ImportChannelPayload) => Promise<unknown>;
  saving: boolean;
}

export function ImportChannelDialog({ open, onOpenChange, onImport, saving }: ImportChannelDialogProps) {
  const [channelId, setChannelId] = useState('');
  const [label, setLabel] = useState('');

  const canSubmit = channelId.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) return;

    try {
      await onImport({ channel_id: channelId.trim(), label: label.trim() || undefined });
      setChannelId('');
      setLabel('');
      onOpenChange(false);
    } catch {
      // error toast handled in the hook (a 409 means the channel belongs to another user)
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <DownloadCloud size={18} className="text-primary" />
            Import existing Vobiz channel
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Use this when a channel is already visible in your Vobiz account. Paste its Vobiz
            channel ID below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Vobiz channel ID<span className="text-primary">*</span>
            </Label>
            <Input
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
              placeholder="ad89af91-a153-4e33-a3a7-84eca638dc44"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Internal label
            </Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Existing Monade WhatsApp"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || saving}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Import channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
