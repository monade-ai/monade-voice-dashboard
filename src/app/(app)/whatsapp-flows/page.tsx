'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, Play, Save, Square, Workflow } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import {
  usePostProcessingTemplates,
  type QualificationBucket,
} from '@/app/hooks/use-post-processing-templates';
import { useVobizWhatsapp, type WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';
import {
  mappingToSteps,
  stepsToMapping,
  useWhatsappFlows,
  type WhatsappCadenceConfig,
  type WhatsappCadenceSchedule,
  type WhatsappPilotConfig,
  type WhatsappPilotSchedule,
  type WhatsappFlow,
  type WhatsappFlowMode,
  type WhatsappFlowStep,
} from '@/app/hooks/use-whatsapp-flows';
import { ApiError } from '@/lib/http';
import { areOutcomeKeysSynced, INVALID_OUTCOME_KEYS_MESSAGE } from '@/lib/post-processing-outcomes';
import { cn } from '@/lib/utils';

import { BucketDescription } from './components/bucket-description';
import { BucketSequenceEditor } from './components/bucket-sequence-editor';
import { CadenceEditor } from './components/cadence-editor';
import { PilotEditor } from './components/pilot-editor';

type DirectionFilter = 'all' | 'outbound' | 'inbound';
/** One bucket now holds an ordered sequence of templates, not a single one. */
type MappingState = Record<string, WhatsappFlowStep[]>;
type FlowBucket = QualificationBucket & { system?: boolean };

const HEAD_CLASS = 'text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70';
const DID_NOT_PICK_UP_BUCKET: FlowBucket = {
  key: 'did_not_pick_up',
  label: 'Call not picked up / No answer',
  description: 'System bucket used for unanswered calls. Map it to any approved WhatsApp template you want to send.',
  system: true,
};

const DEFAULT_CADENCE_SCHEDULE: WhatsappCadenceSchedule = {
  timezone: 'Asia/Kolkata', call_window_start: '09:00', call_window_end: '21:00',
  c2_delay_minutes: 120, evening_window_start: '19:00', evening_window_end: '21:00',
  c4_delay_minutes_min: 45, c4_delay_minutes_max: 60,
  late_lead_morning_start: '09:00', late_lead_morning_end: '11:00',
  whatsapp_window_start: '09:00', whatsapp_window_end: '20:00', max_touches_24h: 3,
  m1_delay_days: 3, m2_delay_days: 7,
};

const emptyCadenceConfig = (schedule?: WhatsappCadenceSchedule | null): WhatsappCadenceConfig => ({
  schedule: { ...DEFAULT_CADENCE_SCHEDULE, ...(schedule ?? {}) },
  templates: {},
});
const DEFAULT_PILOT_SCHEDULE: WhatsappPilotSchedule = {
  timezone: 'Asia/Kolkata', call_window_start: '09:00', last_dial: '20:45',
  whatsapp_window_end: '21:00', day1_attempts: 6, day2_attempts: 4,
  day1_release_hours: 24, day2_release_hours: 48, release_guard_minutes: 30,
  min_call_gap_minutes: 60, failed_dial_retry_minutes: 15,
  whatsapp_after_call_minutes: 2, reply_pause_minutes: 60,
  band_targets: ['10:15', '12:15', '14:00', '16:00', '18:00', '19:45'],
};
const emptyPilotConfig = (schedule?: WhatsappPilotSchedule | null): WhatsappPilotConfig => ({
  schedule: { ...DEFAULT_PILOT_SCHEDULE, ...(schedule ?? {}) },
  templates: {},
});

const apiValidationErrors = (error: unknown): string[] => {
  const data = error instanceof ApiError ? error.data as any : null;
  const value = data?.cadence_draft_errors ?? data?.details ?? data?.detail;
  if (!value) return error instanceof Error ? [error.message] : ['Unable to save the cadence.'];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item));

  return Object.entries(value).map(([key, item]) => `${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
};

export default function WhatsAppFlowsPage() {
  const { assistants } = useAssistants();
  const { templates, fetchTemplate } = usePostProcessingTemplates();
  const { channels, fetchTemplates } = useVobizWhatsapp();
  const { fetchAssistantFlow, fetchFlowCapabilities, fetchFlows, saveFlow, savingFlow } = useWhatsappFlows();

  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [assistantId, setAssistantId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [flowMode, setFlowMode] = useState<WhatsappFlowMode>('standard');
  const [cadenceConfig, setCadenceConfig] = useState<WhatsappCadenceConfig>(emptyCadenceConfig());
  const [pilotConfig, setPilotConfig] = useState<WhatsappPilotConfig>(emptyPilotConfig());
  const [pilotAvailable, setPilotAvailable] = useState(false);
  const [pilotRequirements, setPilotRequirements] = useState<Awaited<ReturnType<typeof fetchFlowCapabilities>>['cv_counselor_pilot']['templates']>([]);
  const [cadenceErrors, setCadenceErrors] = useState<string[]>([]);
  const [cadenceAvailable, setCadenceAvailable] = useState(false);
  const [cadenceScheduleDefaults, setCadenceScheduleDefaults] = useState<WhatsappCadenceSchedule>(DEFAULT_CADENCE_SCHEDULE);
  const [pilotScheduleDefaults, setPilotScheduleDefaults] = useState<WhatsappPilotSchedule>(DEFAULT_PILOT_SCHEDULE);
  const [cadenceRequirements, setCadenceRequirements] = useState<Awaited<ReturnType<typeof fetchFlowCapabilities>>['cv_24h_cadence']['templates']>([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);
  const [mappings, setMappings] = useState<MappingState>({});
  const [rawMappings, setRawMappings] = useState<WhatsappFlow['mappings']>({});
  const [buckets, setBuckets] = useState<QualificationBucket[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsappTemplate[]>([]);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingWaTemplates, setLoadingWaTemplates] = useState(false);
  const [storedOutcomeKeys, setStoredOutcomeKeys] = useState<string[] | null>(null);
  const [existingFlows, setExistingFlows] = useState<WhatsappFlow[]>([]);
  const [loadingExistingFlows, setLoadingExistingFlows] = useState(false);

  const publishedAssistants = useMemo(
    () => assistants.filter((assistant) => !assistant.id.startsWith('local-')),
    [assistants],
  );

  const visibleAssistants = useMemo(() => {
    return publishedAssistants.filter((assistant) => {
      if (direction === 'all') return true;
      if (direction === 'outbound') {
        return assistant.call_direction === 'outbound' || assistant.call_direction === 'both';
      }

      return assistant.call_direction === 'inbound' || assistant.call_direction === 'both';
    });
  }, [direction, publishedAssistants]);

  const handleAssistantChange = (value: string) => {
    setAssistantId(value);
  };

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    setBuckets([]);
    setMappings({});
    setWaTemplates([]);
    setConnectionId('');
    setEnabled(false);
    setFlowMode('standard');
    setCadenceConfig(emptyCadenceConfig(cadenceScheduleDefaults));
    setPilotConfig(emptyPilotConfig(pilotScheduleDefaults));
    setCadenceErrors([]);
    setRawMappings({});
    setStoredOutcomeKeys(null);
  };

  useEffect(() => {
    let isMounted = true;
    fetchFlowCapabilities()
      .then(({ cv_24h_cadence: capability, cv_counselor_pilot: pilot }) => {
        if (!isMounted) return;
        setCadenceAvailable(capability.available);
        setCadenceRequirements(capability.templates);
        setPilotAvailable(pilot.available);
        setPilotRequirements(pilot.templates);
        setPilotScheduleDefaults({ ...DEFAULT_PILOT_SCHEDULE, ...(pilot.schedule ?? {}) });
        setPilotConfig((current) => ({ ...current,
          schedule: { ...current.schedule, ...(pilot.schedule ?? {}) } }));
        setCadenceScheduleDefaults({ ...DEFAULT_CADENCE_SCHEDULE, ...(capability.schedule ?? {}) });
        setCadenceConfig((current) => ({
          schedule: { ...current.schedule, ...(capability.schedule ?? {}) },
          templates: current.templates,
        }));
      })
      .catch((error) => {
        if (isMounted) console.error('[WhatsAppFlowsPage] fetchFlowCapabilities error:', error);
      })
      .finally(() => {
        if (isMounted) setLoadingCapabilities(false);
      });

    return () => { isMounted = false; };
  }, [fetchFlowCapabilities]);

  const handleConnectionChange = (value: string) => {
    setConnectionId(value);
    setWaTemplates([]);
  };

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) {
        setLoadingExistingFlows(true);
      }
    });
    fetchFlows()
      .then((flows) => {
        if (isMounted) {
          setExistingFlows(flows);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('[WhatsAppFlowsPage] fetchFlows error:', error);
          setExistingFlows([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingExistingFlows(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchFlows]);

  useEffect(() => {
    let isMounted = true;

    if (!templateId) {
      return () => {
        isMounted = false;
      };
    }

    Promise.resolve().then(() => {
      if (isMounted) {
        setLoadingBuckets(true);
      }
    });
    fetchTemplate(templateId)
      .then((result) => {
        if (!isMounted) return;
        setBuckets(result?.content?.qualification_buckets ?? []);
        setStoredOutcomeKeys(result?.outcome_keys ?? null);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('[WhatsAppFlowsPage] fetchTemplate error:', error);
        setBuckets([]);
        setStoredOutcomeKeys(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingBuckets(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchTemplate, templateId]);

  useEffect(() => {
    let isMounted = true;

    if (!assistantId || !templateId) {
      return () => {
        isMounted = false;
      };
    }

    Promise.resolve().then(() => {
      if (isMounted) {
        setLoadingFlow(true);
      }
    });
    fetchAssistantFlow(assistantId, templateId)
      .then((flow) => {
        if (!isMounted) return;
        if (flow) {
          setConnectionId(flow.whatsapp_channel_connection_id || '');
          setEnabled(Boolean(flow.enabled));
          setFlowMode(flow.flow_mode);
          setRawMappings(flow.mappings ?? {});
          setCadenceErrors(flow.cadence_draft_errors ?? []);
          setCadenceConfig({
            schedule: {
              ...DEFAULT_CADENCE_SCHEDULE,
              ...(flow.cadence_config?.schedule ?? {}),
            },
            templates: { ...(flow.cadence_config?.templates ?? {}) },
          });
          setPilotConfig(emptyPilotConfig(pilotScheduleDefaults));
          if (flow.flow_mode === 'cv_counselor_pilot') {
            const saved = flow.cadence_config as Partial<WhatsappPilotConfig>;
            setPilotConfig({
              ...emptyPilotConfig(pilotScheduleDefaults), ...saved,
              schedule: { ...pilotScheduleDefaults, ...(saved.schedule ?? {}) } as WhatsappPilotSchedule,
              templates: { ...(saved.templates ?? {}) },
            });
          }
          // Legacy single-template mappings read as a one-step sequence, so a
          // flow saved before the ladder existed opens without any migration.
          setMappings(
            Object.fromEntries(
              Object.entries(flow.mappings ?? {}).map(([key, entry]) => [key, mappingToSteps(entry)]),
            ),
          );

          return;
        }

        setConnectionId('');
        setEnabled(false);
        setFlowMode('standard');
        setRawMappings({});
        setCadenceErrors([]);
        setCadenceConfig((current) => emptyCadenceConfig(current.schedule));
        setPilotConfig(emptyPilotConfig(pilotScheduleDefaults));
        setMappings({});
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('[WhatsAppFlowsPage] fetchAssistantFlow error:', error);
        setConnectionId('');
        setEnabled(false);
        setFlowMode('standard');
        setRawMappings({});
        setCadenceErrors([]);
        setPilotConfig(emptyPilotConfig(pilotScheduleDefaults));
        setMappings({});
      })
      .finally(() => {
        if (isMounted) {
          setLoadingFlow(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [assistantId, fetchAssistantFlow, pilotScheduleDefaults, templateId]);

  useEffect(() => {
    let isMounted = true;

    if (!connectionId) {
      return () => {
        isMounted = false;
      };
    }

    Promise.resolve().then(() => {
      if (isMounted) {
        setLoadingWaTemplates(true);
      }
    });
    fetchTemplates(connectionId)
      .then((result) => {
        if (isMounted) {
          setWaTemplates(result);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('[WhatsAppFlowsPage] fetchTemplates error:', error);
        setWaTemplates([]);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingWaTemplates(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [connectionId, fetchTemplates]);

  const approvedTemplates = useMemo(
    () => waTemplates.filter((template) => (template.status || '').toUpperCase() === 'APPROVED'),
    [waTemplates],
  );
  const visibleExistingFlows = useMemo(() => {
    return existingFlows.filter((flow) => {
      const flowDirection = flow.assistant?.call_direction;
      if (direction === 'all') return true;
      if (direction === 'outbound') {
        return flowDirection === 'outbound' || flowDirection === 'both';
      }

      return flowDirection === 'inbound' || flowDirection === 'both';
    });
  }, [direction, existingFlows]);
  const outcomeKeyState = useMemo(
    () => areOutcomeKeysSynced(storedOutcomeKeys, buckets),
    [storedOutcomeKeys, buckets],
  );
  const flowBuckets = useMemo<FlowBucket[]>(
    () => [...buckets, DID_NOT_PICK_UP_BUCKET],
    [buckets],
  );
  const hasInvalidOutcomeKeys = Boolean(templateId) && buckets.length > 0 && !outcomeKeyState.valid;

  const channelOptions = useMemo(() => {
    return channels.map((channel) => ({
      id: channel.id,
      label: channel.label || channel.display_name || channel.phone_number || channel.id,
    }));
  }, [channels]);

  const updateBucketSteps = (outcomeKey: string, steps: WhatsappFlowStep[]) => {
    setMappings((current) => {
      const next = { ...current };
      if (steps.length === 0) {
        delete next[outcomeKey];
      } else {
        next[outcomeKey] = steps;
      }

      return next;
    });
  };

  const openExistingFlow = (assistantValue: string, templateValue: string) => {
    setAssistantId(assistantValue);
    setTemplateId(templateValue);
    setBuckets([]);
    setMappings({});
    setWaTemplates([]);
    setConnectionId('');
    setEnabled(false);
    setFlowMode('standard');
    setCadenceConfig(emptyCadenceConfig(cadenceScheduleDefaults));
    setPilotConfig(emptyPilotConfig(pilotScheduleDefaults));
    setRawMappings({});
    setCadenceErrors([]);
    setStoredOutcomeKeys(null);
  };

  const serializedMappings = () => Object.fromEntries(
    Object.entries(mappings)
      .map(([key, steps]) => [key, steps.filter((step) => step.template_name)] as const)
      .filter(([, steps]) => steps.length > 0)
      .map(([key, steps]) => [key, stepsToMapping(steps)]),
  );

  const localCadenceErrors = useMemo(() => {
    if (flowMode !== 'cv_24h_cadence') return [];
    const errors: string[] = [];
    const requiredKeys = cadenceRequirements.map((item) => item.key);
    for (const requirement of cadenceRequirements) {
      const assignment = cadenceConfig.templates[requirement.key];
      if (!assignment?.template_name || !assignment.language) {
        errors.push(`${requirement.key}: select an approved template.`);
        continue;
      }
      if (!/^en(?:_|$)/i.test(assignment.language)) {
        errors.push(`${requirement.key}: the template language must be English.`);
      }
      const template = waTemplates.find((item) =>
        item.name === assignment.template_name && item.language === assignment.language);
      if (!template || String(template.status).toUpperCase() !== 'APPROVED') {
        errors.push(`${requirement.key}: assigned template is not approved.`);
      } else if (requirement.expected_category
        && String(template.category).toUpperCase() !== String(requirement.expected_category).toUpperCase()) {
        errors.push(`${requirement.key}: Meta category must be ${requirement.expected_category}.`);
      }
    }
    if (requiredKeys.length !== 10) errors.push('The backend must return all ten required cadence slots.');
    if (cadenceConfig.schedule.c4_delay_minutes_min > cadenceConfig.schedule.c4_delay_minutes_max) {
      errors.push('C4 minimum delay cannot exceed its maximum delay.');
    }
    const timeToMinutes = (value: string) => {
      const match = /^(\d{2}):(\d{2})$/.exec(value);
      if (!match) return null;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);

      return hours <= 23 && minutes <= 59 ? (hours * 60) + minutes : null;
    };
    const timeWindows: Array<[string, string, string]> = [
      [cadenceConfig.schedule.call_window_start, cadenceConfig.schedule.call_window_end, 'Call window'],
      [cadenceConfig.schedule.evening_window_start, cadenceConfig.schedule.evening_window_end, 'Evening window'],
      [cadenceConfig.schedule.late_lead_morning_start, cadenceConfig.schedule.late_lead_morning_end, 'Late-lead window'],
      [cadenceConfig.schedule.whatsapp_window_start, cadenceConfig.schedule.whatsapp_window_end, 'WhatsApp window'],
    ];
    for (const [start, end, label] of timeWindows) {
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        errors.push(`${label} must have valid start and end times.`);
      }
    }
    const integerRanges: Array<[number, number, number, string]> = [
      [cadenceConfig.schedule.c2_delay_minutes, 1, 720, 'C2 delay'],
      [cadenceConfig.schedule.c4_delay_minutes_min, 1, 180, 'C4 minimum delay'],
      [cadenceConfig.schedule.c4_delay_minutes_max, 1, 180, 'C4 maximum delay'],
      [cadenceConfig.schedule.max_touches_24h, 1, 3, 'Maximum touches'],
      [cadenceConfig.schedule.m1_delay_days, 1, 30, 'M1 delay'],
      [cadenceConfig.schedule.m2_delay_days, 1, 30, 'M2 delay'],
    ];
    for (const [value, minimum, maximum, label] of integerRanges) {
      if (!Number.isInteger(value) || value < minimum || value > maximum) {
        errors.push(`${label} must be an integer from ${minimum} to ${maximum}.`);
      }
    }
    const callStart = timeToMinutes(cadenceConfig.schedule.call_window_start);
    const callEnd = timeToMinutes(cadenceConfig.schedule.call_window_end);
    const eveningStart = timeToMinutes(cadenceConfig.schedule.evening_window_start);
    const eveningEnd = timeToMinutes(cadenceConfig.schedule.evening_window_end);
    const whatsappStart = timeToMinutes(cadenceConfig.schedule.whatsapp_window_start);
    const whatsappEnd = timeToMinutes(cadenceConfig.schedule.whatsapp_window_end);
    if (callStart !== null && callEnd !== null && (callStart < 540 || callEnd > 1260)) {
      errors.push('Call window must stay within 09:00–21:00 IST.');
    }
    if (eveningStart !== null && eveningEnd !== null && callStart !== null && callEnd !== null
      && (eveningStart < callStart || eveningEnd > callEnd)) {
      errors.push('Evening window must fit inside the call window.');
    }
    if (whatsappStart !== null && whatsappEnd !== null && (whatsappStart < 540 || whatsappEnd > 1200)) {
      errors.push('WhatsApp window must stay within 09:00–20:00 IST.');
    }
    if (cadenceConfig.schedule.timezone !== 'Asia/Kolkata') {
      errors.push('Timezone must be Asia/Kolkata for this cadence.');
    }

    return errors;
  }, [cadenceConfig, cadenceRequirements, flowMode, waTemplates]);

  const localPilotErrors = useMemo(() => {
    if (flowMode !== 'cv_counselor_pilot') return [];
    const errors: string[] = [];
    if (pilotRequirements.length !== 7) errors.push('The backend must advertise all seven pilot template slots.');
    for (const slot of pilotRequirements) {
      const assignment = pilotConfig.templates[slot.key];
      const template = waTemplates.find((item) => item.name === assignment?.template_name
        && item.language === assignment?.language);
      if (!template || String(template.status).toUpperCase() !== 'APPROVED'
        || String(template.category).toUpperCase() !== 'UTILITY') {
        errors.push(`${slot.key}: choose an approved Utility template.`);
      }
    }
    if (pilotConfig.schedule.band_targets.length !== 6) {
      errors.push('The pilot requires exactly six call-band targets.');
    }
    pilotConfig.schedule.band_targets.forEach((value, index) => {
      const match = /^(\d{2}):(\d{2})$/.exec(value);
      const minute = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
      if (minute < 540 + index * 120 || minute >= 660 + index * 120 || minute > 1245) {
        errors.push(`B${index + 1}: target must be in its band, at or before 20:45.`);
      }
    });
    for (const [value, label] of [
      [pilotConfig.schedule.whatsapp_after_call_minutes, 'WhatsApp delay'],
      [pilotConfig.schedule.reply_pause_minutes, 'Reply pause'],
    ] as const) {
      if (!Number.isInteger(value) || value < 1 || value > 120) {
        errors.push(`${label} must be an integer from 1 to 120 minutes.`);
      }
    }

    return errors;
  }, [flowMode, pilotConfig, pilotRequirements, waTemplates]);

  const handleSave = async (activateCadence = false) => {
    if (!assistantId || !templateId || !connectionId
      || (flowMode === 'standard' && hasInvalidOutcomeKeys)) return;

    try {
      const cadenceMode = flowMode !== 'standard';
      const saved = await saveFlow(assistantId, {
        post_processing_template_id: templateId,
        whatsapp_channel_connection_id: connectionId,
        enabled: cadenceMode ? activateCadence : enabled,
        flow_mode: flowMode,
        mappings: cadenceMode ? rawMappings : serializedMappings(),
        cadence_config: flowMode === 'cv_counselor_pilot' ? pilotConfig
          : cadenceMode ? cadenceConfig : {},
      });
      if (saved) {
        setEnabled(saved.enabled);
        setCadenceErrors(saved.cadence_draft_errors);
        setRawMappings(saved.mappings);
      }
    } catch (error) {
      if (flowMode !== 'standard') setCadenceErrors(apiValidationErrors(error));
    }
  };

  const readyToEdit = assistantId && templateId;
  const canSave = Boolean(
    assistantId
    && templateId
    && connectionId
    && (flowMode !== 'standard' || !hasInvalidOutcomeKeys),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground flex items-center gap-3">
              <Workflow className="text-primary" size={40} />
              WhatsApp Flows
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Send a WhatsApp follow-up automatically after a call is qualified.
            </p>
          </div>
        </div>

        <PaperCard variant="default" className="border-border/40">
          <PaperCardContent className="p-6 space-y-6">
            <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Direction
                </span>
                <div className="flex p-1 bg-muted rounded-md w-fit">
                  {(['all', 'outbound', 'inbound'] as DirectionFilter[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDirection(value)}
                      className={cn(
                        'px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all',
                        direction === value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Assistant
                </span>
                <Select value={assistantId} onValueChange={handleAssistantChange}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select an assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleAssistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Post-Processing Template
                </span>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  WhatsApp Channel
                </span>
                <Select value={connectionId} onValueChange={handleConnectionChange}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {flowMode === 'standard' ? <div className="space-y-2">
                {/* block, not inline: the sibling here is a bare button rather
                    than a full-width Select, so an inline label shares its line
                    and pushes the switch out of the grid cell. */}
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Enabled
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Enable this WhatsApp flow"
                  aria-checked={enabled}
                  onClick={() => setEnabled((value) => !value)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    enabled ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      // left-0 is load-bearing. Without it the knob is an
                      // abspos box with no inline offset, so its static
                      // position comes from the button's UA text-align:center
                      // and left resolves to 22px — then translate adds 22
                      // more and the knob lands outside the track. The sibling
                      // switches in trunks/ and new-phone-dialog both set left.
                      'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                      enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </div> : <div />}
            </div>

            {cadenceAvailable || pilotAvailable ? (
              <div className="space-y-2 border-t border-border/30 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Flow mode
                </span>
                <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                  {([
                    ['standard', 'Standard', 'Existing post-call outcome mappings.'],
                    ...(cadenceAvailable ? [['cv_24h_cadence', 'CV 24-hour cadence (legacy)', 'Existing C1–C4 automation; disable this at pilot cutover.']] : []),
                    ...(pilotAvailable ? [['cv_counselor_pilot', 'CV counselor pilot', 'Six day-one calls, four uncertain day-two calls, five WhatsApp reminders.']] : []),
                  ] as Array<[WhatsappFlowMode, string, string]>).map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setFlowMode(value);
                        setCadenceErrors([]);
                        if (value !== 'standard') setEnabled(false);
                      }}
                      className={cn(
                        'rounded-md border p-3 text-left transition-colors',
                        flowMode === value ? 'border-primary bg-primary/5' : 'border-border/40 hover:bg-muted/30',
                      )}
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : loadingCapabilities ? (
              <p className="text-[10px] text-muted-foreground">Checking available flow modes…</p>
            ) : null}
          </PaperCardContent>
        </PaperCard>

        <PaperCard variant="default" className="border-border/40">
          <PaperCardContent className="p-0">
            {!readyToEdit ? (
              <div className="py-10 px-6 space-y-6">
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-medium tracking-tight">Pick an assistant and a post-processing template to begin</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Or jump into an existing saved flow below and continue editing its mappings.
                  </p>
                </div>

                {loadingExistingFlows ? (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-primary/50" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                      Loading saved flows...
                    </span>
                  </div>
                ) : visibleExistingFlows.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleExistingFlows.map((flow) => (
                      <button
                        key={flow.id || `${flow.assistant_id}-${flow.post_processing_template_id}`}
                        type="button"
                        onClick={() => openExistingFlow(flow.assistant_id, flow.post_processing_template_id)}
                        className="rounded-md border border-border/30 bg-muted/[0.03] p-4 text-left hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {flow.assistant?.name || flow.assistant_id}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">
                              {flow.post_processing_template?.name || flow.post_processing_template_id}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                        </div>
                        <div className="mt-4 space-y-1 text-[11px] text-muted-foreground">
                          <p>
                            Channel: {flow.whatsapp_channel_connection?.display_name || flow.whatsapp_channel_connection?.phone_number || flow.whatsapp_channel_connection_id}
                          </p>
                          <p>
                            Mappings: {Object.keys(flow.mappings || {}).length}
                          </p>
                          <p>Mode: {flow.flow_mode === 'cv_counselor_pilot' ? 'CV counselor pilot'
                            : flow.flow_mode === 'cv_24h_cadence' ? 'CV 24-hour cadence' : 'Standard'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No saved WhatsApp flows yet for this direction filter.
                  </div>
                )}
              </div>
            ) : loadingFlow || loadingBuckets ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-primary/50" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Loading flow...
                </span>
              </div>
            ) : flowMode !== 'standard' ? (
              <>
                {flowMode === 'cv_24h_cadence' ? <CadenceEditor
                  config={cadenceConfig}
                  requirements={cadenceRequirements}
                  templates={waTemplates}
                  loadingTemplates={loadingWaTemplates}
                  errors={cadenceErrors}
                  onChange={(next) => {
                    setCadenceConfig(next);
                    setCadenceErrors([]);
                  }}
                /> : <PilotEditor
                  config={pilotConfig}
                  requirements={pilotRequirements}
                  templates={waTemplates}
                  loadingTemplates={loadingWaTemplates}
                  disabled={enabled}
                  errors={[...cadenceErrors, ...localPilotErrors]}
                  onChange={(next) => {
                    setPilotConfig(next);
                    setCadenceErrors([]);
                  }}
                />}
                <div className="flex flex-col gap-3 border-t border-border/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {enabled
                      ? `${flowMode === 'cv_counselor_pilot' ? 'Pilot' : 'Cadence'} is active. Disable it before making draft changes.`
                      : `Save draft keeps this flow disabled. Enable requires ${flowMode === 'cv_counselor_pilot' ? 'seven approved Utility template assignments' : 'ten valid template slots'}.`}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {enabled ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={!canSave || savingFlow}
                        className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.16em]"
                      >
                        {savingFlow ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
                        Disable {flowMode === 'cv_counselor_pilot' ? 'pilot' : 'cadence'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSave(false)}
                          disabled={!canSave || savingFlow}
                          className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.16em]"
                        >
                          {savingFlow ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Save disabled draft
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleSave(true)}
                          disabled={!canSave || savingFlow || (flowMode === 'cv_counselor_pilot' ? localPilotErrors : localCadenceErrors).length > 0}
                          title={(flowMode === 'cv_counselor_pilot' ? localPilotErrors : localCadenceErrors)[0]}
                          className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.16em] bg-foreground text-background hover:bg-foreground/90"
                        >
                          {savingFlow ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          Enable {flowMode === 'cv_counselor_pilot' ? 'pilot' : 'cadence'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!enabled && (flowMode === 'cv_counselor_pilot' ? localPilotErrors : localCadenceErrors).length > 0 ? (
                  <div className="border-t border-border/20 px-6 py-3 text-[10px] text-muted-foreground">
                    Enable blocked: {(flowMode === 'cv_counselor_pilot' ? localPilotErrors : localCadenceErrors)[0]}
                  </div>
                ) : null}
              </>
            ) : flowBuckets.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <h3 className="text-lg font-medium tracking-tight">This template has no outcomes yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Add qualification buckets in the post-processing template before wiring WhatsApp follow-ups.
                </p>
              </div>
            ) : (
              <>
                {hasInvalidOutcomeKeys && (
                  <div className="mx-6 mt-6 flex items-start gap-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        {INVALID_OUTCOME_KEYS_MESSAGE}
                      </p>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90">
                        Saved snapshot: {outcomeKeyState.snapshotKeys.join(', ') || 'none'}
                      </p>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90">
                        Current buckets: {outcomeKeyState.bucketKeys.join(', ') || 'none'}
                      </p>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className={cn(HEAD_CLASS, 'px-6')} scope="col">Outcome key</TableHead>
                      <TableHead className={cn(HEAD_CLASS, 'px-6')} scope="col">Outcome label</TableHead>
                      <TableHead className={cn(HEAD_CLASS, 'px-6')} scope="col">Template sequence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flowBuckets.map((bucket) => {
                      const steps = mappings[bucket.key] ?? [];

                      return (
                        <TableRow key={bucket.key} className="border-border/20 hover:bg-muted/30">
                          <TableCell className="px-6 align-top font-mono text-xs break-all text-foreground">
                            {bucket.key}
                          </TableCell>
                          <TableCell className="px-6 align-top">
                            <div className="max-w-[320px]">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{bucket.label}</p>
                                {bucket.system ? (
                                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                    System
                                  </span>
                                ) : null}
                              </div>
                              {bucket.description ? (
                                <BucketDescription description={bucket.description} />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 align-top">
                            {connectionId ? (
                              <BucketSequenceEditor
                                steps={steps}
                                templates={waTemplates}
                                approvedTemplates={approvedTemplates}
                                disabled={loadingWaTemplates}
                                onChange={(next) => updateBucketSteps(bucket.key, next)}
                              />
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                Pick a WhatsApp channel to enable template mapping.
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/20 px-6 py-4">
                  <div className="text-[11px] text-muted-foreground">
                    {loadingWaTemplates
                      ? 'Refreshing live WhatsApp template statuses...'
                      : 'Only approved templates are offered for new mappings. Existing stale mappings stay visible until you replace or clear them.'}
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={!canSave || savingFlow}
                    className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.18em] bg-foreground text-background hover:bg-foreground/90"
                  >
                    {savingFlow ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save flow
                  </Button>
                </div>
              </>
            )}
          </PaperCardContent>
        </PaperCard>
      </main>
    </div>
  );
}
