'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';
import type {
  WhatsappCadenceConfig,
  WhatsappCadenceSchedule,
  WhatsappCadenceTemplateAssignment,
  WhatsappCadenceTemplateRequirement,
} from '@/app/hooks/use-whatsapp-flows';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { templateBodyText, templateUsesName } from '@/lib/whatsapp-cadence';

const NONE = '__none__';
const TEMPLATE_SEPARATOR = '___cadence_language___';

const SCHEDULE_FIELDS: Array<{
  key: keyof WhatsappCadenceSchedule;
  label: string;
  type: 'text' | 'time' | 'number';
}> = [
  { key: 'timezone', label: 'Timezone', type: 'text' },
  { key: 'call_window_start', label: 'Call window starts', type: 'time' },
  { key: 'call_window_end', label: 'Call window ends', type: 'time' },
  { key: 'c2_delay_minutes', label: 'C2 delay (minutes)', type: 'number' },
  { key: 'evening_window_start', label: 'Evening window starts', type: 'time' },
  { key: 'evening_window_end', label: 'Evening window ends', type: 'time' },
  { key: 'c4_delay_minutes_min', label: 'C4 minimum delay', type: 'number' },
  { key: 'c4_delay_minutes_max', label: 'C4 maximum delay', type: 'number' },
  { key: 'late_lead_morning_start', label: 'Late-lead window starts', type: 'time' },
  { key: 'late_lead_morning_end', label: 'Late-lead window ends', type: 'time' },
  { key: 'whatsapp_window_start', label: 'WhatsApp window starts', type: 'time' },
  { key: 'whatsapp_window_end', label: 'WhatsApp window ends', type: 'time' },
  { key: 'max_touches_24h', label: 'Maximum touches / 24h', type: 'number' },
  { key: 'm1_delay_days', label: 'M1 delay (days)', type: 'number' },
  { key: 'm2_delay_days', label: 'M2 delay (days)', type: 'number' },
];

const optionValue = (template: WhatsappTemplate) =>
  `${template.name}${TEMPLATE_SEPARATOR}${template.language}`;

const parseOption = (value: string): WhatsappCadenceTemplateAssignment => {
  const divider = value.lastIndexOf(TEMPLATE_SEPARATOR);
  return {
    template_name: divider < 0 ? value : value.slice(0, divider),
    language: divider < 0 ? '' : value.slice(divider + TEMPLATE_SEPARATOR.length),
  };
};

const expectedCategory = (requirement: WhatsappCadenceTemplateRequirement) =>
  String(requirement.expected_category ?? '').toUpperCase();

interface Props {
  config: WhatsappCadenceConfig;
  requirements: WhatsappCadenceTemplateRequirement[];
  templates: WhatsappTemplate[];
  loadingTemplates: boolean;
  errors: string[];
  onChange: (config: WhatsappCadenceConfig) => void;
}

export function CadenceEditor({
  config,
  requirements,
  templates,
  loadingTemplates,
  errors,
  onChange,
}: Props) {
  const approvedTemplates = useMemo(
    () => templates.filter((template) => String(template.status).toUpperCase() === 'APPROVED'),
    [templates],
  );
  const groupedRequirements = useMemo(() => {
    return requirements.reduce<Record<string, WhatsappCadenceTemplateRequirement[]>>((groups, item) => {
      (groups[item.group] ??= []).push(item);
      return groups;
    }, {});
  }, [requirements]);

  const updateSchedule = (key: keyof WhatsappCadenceSchedule, value: string, type: string) => {
    onChange({
      ...config,
      schedule: {
        ...config.schedule,
        [key]: type === 'number' ? Number(value) : value,
      },
    });
  };

  const updateAssignment = (key: string, assignment: WhatsappCadenceTemplateAssignment | null) => {
    const nextTemplates = { ...config.templates };
    if (assignment) nextTemplates[key] = assignment;
    else delete nextTemplates[key];
    onChange({ ...config, templates: nextTemplates });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
        <h3 className="text-sm font-semibold">College Vidya 24-hour cadence</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Configure all ten scheduler-owned messages here. Save keeps the flow disabled;
          activation is a separate action after every assignment is approved and valid.
        </p>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-4" role="alert">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle size={15} /> Cadence needs attention
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700/90 dark:text-amber-300/90">
            {errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Schedule</h3>
          <p className="text-xs text-muted-foreground">Defaults are supplied by the backend capability response.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCHEDULE_FIELDS.map((field) => (
            <label key={field.key} className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {field.label}
              </span>
              <Input
                type={field.type}
                min={field.type === 'number' ? 0 : undefined}
                value={String(config.schedule[field.key] ?? '')}
                onChange={(event) => updateSchedule(field.key, event.target.value, field.type)}
                className="h-9 text-xs"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="text-base font-medium">Required templates</h3>
          <p className="text-xs text-muted-foreground">
            The expected category and final approved copy come from the backend.
          </p>
        </div>
        {Object.entries(groupedRequirements).map(([group, slots]) => (
          <div key={group} className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group}</h4>
            <div className="grid gap-3 lg:grid-cols-2">
              {slots.map((requirement) => {
                const assignment = config.templates[requirement.key];
                const selected = templates.find((template) =>
                  template.name === assignment?.template_name && template.language === assignment?.language);
                const categoryMatches = !selected || !expectedCategory(requirement)
                  || String(selected.category).toUpperCase() === expectedCategory(requirement);
                const usesName = selected ? templateUsesName(templateBodyText(selected.components)) : false;
                const noNameTemplates = approvedTemplates.filter((template) =>
                  !templateUsesName(templateBodyText(template.components))
                  && (!expectedCategory(requirement)
                    || String(template.category).toUpperCase() === expectedCategory(requirement)));
                const value = assignment?.template_name && assignment?.language
                  ? `${assignment.template_name}${TEMPLATE_SEPARATOR}${assignment.language}`
                  : NONE;

                return (
                  <article key={requirement.key} className="space-y-3 rounded-md border border-border/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-bold">{requirement.key}</p>
                        <p className="text-xs text-muted-foreground">{requirement.label}</p>
                      </div>
                      {requirement.expected_category ? (
                        <span className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          {requirement.expected_category}
                        </span>
                      ) : null}
                    </div>

                    <Select
                      value={value}
                      disabled={loadingTemplates}
                      onValueChange={(next) => updateAssignment(
                        requirement.key,
                        next === NONE ? null : parseOption(next),
                      )}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select approved template" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Not assigned —</SelectItem>
                        {approvedTemplates.map((template) => (
                          <SelectItem key={optionValue(template)} value={optionValue(template)}>
                            {template.name} ({template.language}) · {template.category || 'No category'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!categoryMatches ? (
                      <p className="flex gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={12} className="shrink-0" />
                        Meta category is {selected?.category || 'missing'}; {requirement.expected_category} is required.
                      </p>
                    ) : selected ? (
                      <p className="flex gap-1.5 text-[10px] text-emerald-600">
                        <CheckCircle2 size={12} /> Approved with the expected category
                      </p>
                    ) : null}

                    {usesName ? (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Optional no-name variant
                        </span>
                        <Select
                          value={assignment?.template_name_no_name || NONE}
                          onValueChange={(next) => updateAssignment(requirement.key, {
                            ...assignment!,
                            template_name_no_name: next === NONE ? null : next,
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— None (skip nameless leads) —</SelectItem>
                            {noNameTemplates.map((template) => (
                              <SelectItem key={`no-name-${optionValue(template)}`} value={template.name}>
                                {template.name} ({template.language})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    {(requirement.body || requirement.footer || requirement.buttons?.length) ? (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium text-foreground">Expected final copy</summary>
                        {requirement.body ? <p className="mt-2 whitespace-pre-wrap">{requirement.body}</p> : null}
                        {requirement.footer ? <p className="mt-2 text-[10px]">Footer: {requirement.footer}</p> : null}
                        {requirement.buttons?.length ? (
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[10px]">
                            {JSON.stringify(requirement.buttons, null, 2)}
                          </pre>
                        ) : null}
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
