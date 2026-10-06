'use client';

import type { WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';
import type { WhatsappPilotConfig, WhatsappCadenceTemplateRequirement } from '@/app/hooks/use-whatsapp-flows';
import { Input } from '@/components/ui/input';

interface Props {
  config: WhatsappPilotConfig;
  requirements: WhatsappCadenceTemplateRequirement[];
  templates: WhatsappTemplate[];
  loadingTemplates: boolean;
  disabled: boolean;
  errors: string[];
  onChange: (config: WhatsappPilotConfig) => void;
}

const BANDS = ['B1 09:00–11:00', 'B2 11:00–13:00', 'B3 13:00–15:00',
  'B4 15:00–17:00', 'B5 17:00–19:00', 'B6 19:00–21:00'];

export function PilotEditor({
  config,
  requirements,
  templates,
  loadingTemplates,
  disabled,
  errors,
  onChange,
}: Props) {
  const approved = templates.filter((item) => String(item.status).toUpperCase() === 'APPROVED'
    && String(item.category).toUpperCase() === 'UTILITY');

  return (
    <div className="space-y-7 p-6">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
        <h3 className="text-sm font-semibold">CV single-counselor pilot</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          This flow runs only for the assistant selected above. Use a dedicated assistant for the pilot.
          Up to six calls run before intake +24h; uncertain leads can receive four more before +48h.
          The call window, deadlines, attempt caps and minimum gap are fixed safety rules.
          Call analytics and verified WhatsApp CRM webhooks are sent as soon as they are ready; College Vidya controls counselor hold-off.
        </p>
        {disabled ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          Disable the active pilot before editing its schedule or template assignments.
        </p> : null}
      </div>
      {errors.length > 0 && <div role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
        {errors.map((error, index) => <p key={`${index}-${error}`}>{error}</p>)}
      </div>}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">Call band targets (IST)</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BANDS.map((label, index) => <label key={label} className="space-y-1 text-xs">
            <span>{label}</span>
            <Input type="time" value={config.schedule.band_targets[index] || ''} disabled={disabled}
              onChange={(event) => {
                const band_targets = [...config.schedule.band_targets];
                band_targets[index] = event.target.value;
                onChange({ ...config, schedule: { ...config.schedule, band_targets } });
              }} />
          </label>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['whatsapp_after_call_minutes', 'reply_pause_minutes'] as const).map((key) =>
            <label key={key} className="space-y-1 text-xs">
              <span>{key === 'reply_pause_minutes' ? 'Pause calls after a reply (minutes)' : 'Send WhatsApp after call (minutes)'}</span>
              <Input type="number" min={1} max={120} value={config.schedule[key]} disabled={disabled}
                onChange={(event) => onChange({ ...config,
                  schedule: { ...config.schedule, [key]: Number(event.target.value) } })} />
            </label>)}
        </div>
      </section>
      <section className="space-y-3">
        <h4 className="text-sm font-medium">Pilot WhatsApp templates</h4>
        <p className="text-xs text-muted-foreground">Choose approved Utility templates. The first three reminders use N1–N3 or U1–U3 after calls 1, 3 and 5. If still uncertain, day two repeats the selected U1 and U2 templates after calls 7 and 9. T1 is the qualified confirmation; the total is capped at five messages per lead.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {requirements.map((requirement) => {
            const selected = config.templates[requirement.key];

            return <label key={requirement.key} className="space-y-1 text-xs">
              <span>{requirement.key}{requirement.label !== requirement.key ? ` · ${requirement.label}` : ''}</span>
              <select className="h-9 w-full rounded-md border border-border bg-background px-2"
                disabled={disabled || loadingTemplates}
                value={selected ? `${selected.template_name}|${selected.language}` : ''}
                onChange={(event) => {
                  const next = { ...config.templates };
                  if (!event.target.value) delete next[requirement.key];
                  else {
                    const divider = event.target.value.lastIndexOf('|');
                    next[requirement.key] = {
                      template_name: event.target.value.slice(0, divider),
                      language: event.target.value.slice(divider + 1),
                    };
                  }
                  onChange({ ...config, templates: next });
                }}>
                <option value="">{loadingTemplates ? 'Loading approved templates…' : 'Select approved Utility template'}</option>
                {approved.map((item) => <option key={`${item.name}|${item.language}`}
                  value={`${item.name}|${item.language}`}>{item.name} ({item.language})</option>)}
              </select>
            </label>;
          })}
        </div>
      </section>
    </div>
  );
}
