'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, X } from 'lucide-react';

import type { WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';
import type { WhatsappFlowStep, WhatsappFlowStepCondition } from '@/app/hooks/use-whatsapp-flows';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  cadenceSlot,
  cadenceSlotsForBucket,
  nextCadenceSlot,
  templateBodyText,
  templateUsesName,
} from '@/lib/whatsapp-cadence';

import { TemplateStatusBadge } from '../../whatsapp/components/status-badges';

const NONE = '__none__';

export const optionValueForTemplate = (templateName: string, language: string) =>
  `${templateName}__${language}`;

export const parseTemplateValue = (value: string) => {
  const divider = value.lastIndexOf('__');
  if (divider === -1) return { template_name: value, language: '' };

  return { template_name: value.slice(0, divider), language: value.slice(divider + 2) };
};

const CONDITION_LABELS: Record<WhatsappFlowStepCondition, string> = {
  always: 'Always',
  missed: 'Follow-up call missed',
  connected: 'Follow-up call connected',
};

interface Props {
  bucketKey: string;
  steps: WhatsappFlowStep[];
  templates: WhatsappTemplate[];
  approvedTemplates: WhatsappTemplate[];
  disabled: boolean;
  onChange: (steps: WhatsappFlowStep[]) => void;
}

/**
 * Ordered template sequence for one qualification bucket.
 *
 * The first step is the post-call follow-up; the rest are the first-24h ladder
 * reminders. Previously this was a single Select, which made the ladder
 * impossible to configure.
 */
export function BucketSequenceEditor({
  bucketKey,
  steps,
  templates,
  approvedTemplates,
  disabled,
  onChange,
}: Props) {
  const usedKeys = useMemo(() => steps.map((step) => step.key), [steps]);
  const nextSlot = useMemo(() => nextCadenceSlot(bucketKey, usedKeys), [bucketKey, usedKeys]);
  const slotOptions = useMemo(() => cadenceSlotsForBucket(bucketKey), [bucketKey]);

  const findTemplate = (name: string, language: string) =>
    templates.find((template) => template.name === name && template.language === language) ?? null;

  const updateStep = (index: number, patch: Partial<WhatsappFlowStep>) => {
    onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  const removeStep = (index: number) => onChange(steps.filter((_, i) => i !== index));

  const moveStep = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addStep = () => {
    const slot = nextSlot;
    onChange([
      ...steps,
      {
        key: slot?.key ?? `step_${steps.length + 1}`,
        template_name: '',
        language: '',
        template_name_no_name: null,
        condition: slot?.condition ?? 'always',
        enabled: true,
      },
    ]);
  };

  if (steps.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          No templates mapped. This bucket sends nothing.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          disabled={disabled}
          className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em]"
        >
          <Plus size={12} />
          Add template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const value = step.template_name
          ? optionValueForTemplate(step.template_name, step.language)
          : NONE;
        const matched = findTemplate(step.template_name, step.language);
        const isStale = Boolean(
          step.template_name
          && !approvedTemplates.some(
            (template) => template.name === step.template_name && template.language === step.language,
          ),
        );
        const slot = cadenceSlot(bucketKey, step.key);
        const needsNoNameVariant = templateUsesName(templateBodyText(matched?.components))
          && !step.template_name_no_name;
        // A no-name variant is only useful if it does NOT itself greet by name.
        const noNameCandidates = approvedTemplates.filter(
          (template) => !templateUsesName(templateBodyText(template.components)),
        );

        return (
          <div
            key={`${step.key}-${index}`}
            className="rounded-md border border-border/30 bg-muted/20 p-3 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                {index + 1}
              </span>
              <Select
                value={step.key}
                onValueChange={(next) => {
                  const picked = slotOptions.find((option) => option.key === next);
                  updateStep(index, { key: next, condition: picked?.condition ?? 'always' });
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 w-[150px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slotOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key} disabled={
                      option.key !== step.key && usedKeys.includes(option.key)
                    }>
                      {option.key} — {option.label}
                    </SelectItem>
                  ))}
                  {!slotOptions.some((option) => option.key === step.key) ? (
                    <SelectItem value={step.key}>{step.key}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {step.condition && step.condition !== 'always' ? (
                <span className="rounded-full border border-border/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {CONDITION_LABELS[step.condition]}
                </span>
              ) : null}
              <TemplateStatusBadge status={matched?.status ?? (step.template_name ? 'MISSING' : undefined)} />
              <div className="ml-auto flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" disabled={disabled || index === 0}
                  onClick={() => moveStep(index, -1)} className="h-7 w-7 p-0">
                  <ArrowUp size={12} />
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={disabled || index === steps.length - 1}
                  onClick={() => moveStep(index, 1)} className="h-7 w-7 p-0">
                  <ArrowDown size={12} />
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={disabled}
                  onClick={() => removeStep(index)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </Button>
              </div>
            </div>

            {slot ? <p className="text-[10px] text-muted-foreground">{slot.hint}</p> : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                  Template
                </label>
                <Select
                  value={value}
                  onValueChange={(next) => {
                    if (next === NONE) {
                      updateStep(index, { template_name: '', language: '' });

                      return;
                    }
                    updateStep(index, parseTemplateValue(next));
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {approvedTemplates.map((template) => (
                      <SelectItem
                        key={optionValueForTemplate(template.name, template.language)}
                        value={optionValueForTemplate(template.name, template.language)}
                      >
                        {template.name} ({template.language})
                      </SelectItem>
                    ))}
                    {isStale ? (
                      <SelectItem value={value}>
                        {step.template_name} ({step.language})
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                  No-name variant
                </label>
                <Select
                  value={step.template_name_no_name || NONE}
                  onValueChange={(next) =>
                    updateStep(index, { template_name_no_name: next === NONE ? null : next })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Not needed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {noNameCandidates.map((template) => (
                      <SelectItem key={`nn-${template.name}-${template.language}`} value={template.name}>
                        {template.name} ({template.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {needsNoNameVariant ? (
              <p className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-500">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>
                  This template greets by name. Leads with no usable name will be skipped
                  entirely unless you pick a no-name variant — WhatsApp rejects an empty name,
                  and we never substitute &quot;there&quot; or &quot;Student&quot;.
                </span>
              </p>
            ) : null}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addStep}
        disabled={disabled}
        className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em]"
      >
        <Plus size={12} />
        {nextSlot ? `Add ${nextSlot.key}` : 'Add template'}
      </Button>
    </div>
  );
}
