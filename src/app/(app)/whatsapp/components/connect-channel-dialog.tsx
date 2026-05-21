'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, MessageCircle } from 'lucide-react';

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
import type { ConnectChannelPayload } from '@/app/hooks/use-vobiz-whatsapp';

interface ConnectChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (payload: ConnectChannelPayload) => Promise<unknown>;
  saving: boolean;
}

const EMPTY_FORM = {
  label: '',
  waba_id: '',
  phone_number_id: '',
  phone_number: '',
  display_name: '',
  access_token: '',
};

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
    {children}
    {required && <span className="text-primary">*</span>}
  </Label>
);

export function ConnectChannelDialog({ open, onOpenChange, onConnect, saving }: ConnectChannelDialogProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const setField = (key: keyof typeof EMPTY_FORM) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const canSubmit = form.waba_id.trim()
    && form.phone_number_id.trim()
    && form.phone_number.trim()
    && form.access_token.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) return;

    try {
      await onConnect({
        label: form.label.trim() || undefined,
        waba_id: form.waba_id.trim(),
        phone_number_id: form.phone_number_id.trim(),
        phone_number: form.phone_number.trim(),
        display_name: form.display_name.trim() || undefined,
        access_token: form.access_token.trim(),
      });
      setForm({ ...EMPTY_FORM });
      onOpenChange(false);
    } catch {
      // error toast handled in the hook; keep the dialog open for correction
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <MessageCircle size={18} className="text-primary" />
            Connect a WhatsApp Business number
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Create or prepare your Meta WhatsApp Business Account first. Then paste the WABA ID,
            phone number ID, sender phone number, and Meta system-user access token here. Monade
            connects it to Vobiz and stores only the channel metadata needed to send messages.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel>Internal label</FieldLabel>
            <Input
              value={form.label}
              onChange={setField('label')}
              placeholder="Primary WhatsApp Channel"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <FieldLabel required>WABA ID</FieldLabel>
              <Input value={form.waba_id} onChange={setField('waba_id')} placeholder="1345061194213831" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel required>Phone number ID</FieldLabel>
              <Input
                value={form.phone_number_id}
                onChange={setField('phone_number_id')}
                placeholder="1084153438123146"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <FieldLabel required>Sender phone number</FieldLabel>
              <Input value={form.phone_number} onChange={setField('phone_number')} placeholder="+15551234567" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Display name</FieldLabel>
              <Input value={form.display_name} onChange={setField('display_name')} placeholder="Monade" />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel required>Meta system-user access token</FieldLabel>
            <Input
              type="password"
              autoComplete="off"
              value={form.access_token}
              onChange={setField('access_token')}
              placeholder="EAAG..."
            />
            <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2">
              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                This token is used only for the connection step. We do not store or display the access token after submission.
              </p>
            </div>
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
              Connect number
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
