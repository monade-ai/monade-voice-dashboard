'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, FilePlus2, RefreshCw, AlertTriangle } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateTemplatePayload, WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTemplatePayload) => Promise<unknown>;
  saving: boolean;
  /** When set, the dialog opens pre-filled to resubmit a corrected version. */
  resubmitFrom?: WhatsappTemplate | null;
}

const CATEGORIES = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
    {children}
    {required && <span className="text-primary">*</span>}
  </Label>
);

const getBodyText = (template?: WhatsappTemplate | null): string => {
  const body = template?.components?.find((component) => component.type?.toUpperCase() === 'BODY');

  return typeof body?.text === 'string' ? body.text : '';
};

// WhatsApp placeholders look like {{1}}, {{2}} — collect the unique, ordered set.
const extractPlaceholders = (text: string): number[] => {
  const found = new Set<number>();
  const matcher = /\{\{\s*(\d+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    found.add(Number(match[1]));
  }

  return [...found].sort((a, b) => a - b);
};

export function TemplateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
  resubmitFrom,
}: TemplateFormDialogProps) {
  const isResubmit = Boolean(resubmitFrom);

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState('UTILITY');
  const [bodyText, setBodyText] = useState('');
  const [examples, setExamples] = useState<Record<number, string>>({});

  // Re-seed the form whenever the dialog opens (fresh create or a resubmit prefill).
  useEffect(() => {
    if (!open) return;

    if (resubmitFrom) {
      setName(resubmitFrom.name ? `${resubmitFrom.name}_v2` : '');
      setLanguage(resubmitFrom.language || 'en_US');
      setCategory((resubmitFrom.category || 'UTILITY').toUpperCase());
      setBodyText(getBodyText(resubmitFrom));
    } else {
      setName('');
      setLanguage('en_US');
      setCategory('UTILITY');
      setBodyText('');
    }
    setExamples({});
  }, [open, resubmitFrom]);

  const placeholders = useMemo(() => extractPlaceholders(bodyText), [bodyText]);

  const canSubmit = name.trim()
    && language.trim()
    && category
    && bodyText.trim()
    && placeholders.every((index) => (examples[index] || '').trim());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) return;

    const component: CreateTemplatePayload['components'][number] = {
      type: 'BODY',
      text: bodyText.trim(),
    };
    if (placeholders.length > 0) {
      component.example = {
        body_text: [placeholders.map((index) => (examples[index] || '').trim())],
      };
    }

    try {
      await onSubmit({
        name: name.trim(),
        language: language.trim(),
        category,
        components: [component],
      });
      onOpenChange(false);
    } catch {
      // error toast handled in the hook; keep the dialog open so the user can adjust
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
            {isResubmit ? <RefreshCw size={18} className="text-primary" /> : <FilePlus2 size={18} className="text-primary" />}
            {isResubmit ? 'Resubmit template' : 'Create template'}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {isResubmit
              ? 'Edit the corrected template and submit it through Vobiz. If duplicate names are rejected, keep a versioned name such as qualified_followup_v2.'
              : 'Submit a new WhatsApp template for approval. Approval can take 1-2 days — refresh status from the templates table afterwards.'}
          </DialogDescription>
        </DialogHeader>

        {isResubmit && resubmitFrom?.rejection_reason && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/25 bg-red-500/10 p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
                Rejection reason
              </p>
              <p className="text-xs text-muted-foreground">{resubmitFrom.rejection_reason}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <FieldLabel required>Template name</FieldLabel>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="qualified_followup"
              />
              <p className="text-[10px] text-muted-foreground">Lowercase letters, numbers and underscores.</p>
            </div>
            <div className="space-y-1.5">
              <FieldLabel required>Language</FieldLabel>
              <Input
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="en_US"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel required>Category</FieldLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FieldLabel required>Body text</FieldLabel>
            <Textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              rows={4}
              placeholder="Hi {{1}}, thanks for speaking with us. Our team will follow up shortly."
            />
            <p className="text-[10px] text-muted-foreground">
              Use {'{{1}}'}, {'{{2}}'} for variables. Each one needs a sample value below.
            </p>
          </div>

          {placeholders.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/40 bg-muted/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Sample values
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {placeholders.map((index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-[10px] font-mono text-muted-foreground">{`{{${index}}}`}</Label>
                    <Input
                      value={examples[index] || ''}
                      onChange={(event) => setExamples((current) => ({ ...current, [index]: event.target.value }))}
                      placeholder="Customer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {isResubmit ? 'Resubmit for approval' : 'Submit for approval'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
