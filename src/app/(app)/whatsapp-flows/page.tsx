'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, Save, Workflow, X } from 'lucide-react';

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
import { useWhatsappFlows } from '@/app/hooks/use-whatsapp-flows';
import { areOutcomeKeysSynced, INVALID_OUTCOME_KEYS_MESSAGE } from '@/lib/post-processing-outcomes';
import { cn } from '@/lib/utils';

import { TemplateStatusBadge } from '../whatsapp/components/status-badges';

type DirectionFilter = 'all' | 'outbound' | 'inbound';
type MappingState = Record<string, { template_name: string; language: string }>;
type FlowBucket = QualificationBucket & { system?: boolean };

const HEAD_CLASS = 'text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70';
const DID_NOT_PICK_UP_BUCKET: FlowBucket = {
  key: 'did_not_pick_up',
  label: 'Call not picked up / No answer',
  description: 'System bucket used for unanswered calls. Map it to any approved WhatsApp template you want to send.',
  system: true,
};

const optionValueForTemplate = (templateName: string, language: string) => `${templateName}__${language}`;

const parseTemplateValue = (value: string) => {
  const divider = value.lastIndexOf('__');
  if (divider === -1) {
    return { template_name: value, language: '' };
  }

  return {
    template_name: value.slice(0, divider),
    language: value.slice(divider + 2),
  };
};

export default function WhatsAppFlowsPage() {
  const { assistants } = useAssistants();
  const { templates, fetchTemplate } = usePostProcessingTemplates();
  const { channels, fetchTemplates } = useVobizWhatsapp();
  const { fetchAssistantFlow, fetchFlows, saveFlow, savingFlow } = useWhatsappFlows();

  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [assistantId, setAssistantId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [mappings, setMappings] = useState<MappingState>({});
  const [buckets, setBuckets] = useState<QualificationBucket[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsappTemplate[]>([]);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingWaTemplates, setLoadingWaTemplates] = useState(false);
  const [storedOutcomeKeys, setStoredOutcomeKeys] = useState<string[] | null>(null);
  const [existingFlows, setExistingFlows] = useState<ReturnType<typeof useWhatsappFlows> extends any ? any[] : never>([]);
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
    setStoredOutcomeKeys(null);
  };

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
          setMappings((flow.mappings ?? {}) as MappingState);

          return;
        }

        setConnectionId('');
        setEnabled(false);
        setMappings({});
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('[WhatsAppFlowsPage] fetchAssistantFlow error:', error);
        setConnectionId('');
        setEnabled(false);
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
  }, [assistantId, fetchAssistantFlow, templateId]);

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

  const updateMapping = (outcomeKey: string, value: string) => {
    if (value === '__none__') {
      setMappings((current) => {
        const next = { ...current };
        delete next[outcomeKey];

        return next;
      });

      return;
    }

    const parsed = parseTemplateValue(value);
    setMappings((current) => ({
      ...current,
      [outcomeKey]: parsed,
    }));
  };

  const openExistingFlow = (assistantValue: string, templateValue: string) => {
    setAssistantId(assistantValue);
    setTemplateId(templateValue);
    setBuckets([]);
    setMappings({});
    setWaTemplates([]);
    setConnectionId('');
    setEnabled(false);
    setStoredOutcomeKeys(null);
  };

  const handleSave = async () => {
    if (!assistantId || !templateId || !connectionId || hasInvalidOutcomeKeys) return;

    try {
      await saveFlow(assistantId, {
        post_processing_template_id: templateId,
        whatsapp_channel_connection_id: connectionId,
        enabled,
        mappings: Object.fromEntries(
          Object.entries(mappings).map(([key, value]) => [key, { ...value, parameters: [] }]),
        ),
      });
    } catch {}
  };

  const readyToEdit = assistantId && templateId;
  const canSave = Boolean(assistantId && templateId && connectionId && !hasInvalidOutcomeKeys);

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

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Enabled
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setEnabled((value) => !value)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    enabled ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                      enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </div>
            </div>
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
                      <TableHead className={HEAD_CLASS}>Outcome key</TableHead>
                      <TableHead className={HEAD_CLASS}>Outcome label</TableHead>
                      <TableHead className={HEAD_CLASS}>WhatsApp template</TableHead>
                      <TableHead className={HEAD_CLASS}>Language</TableHead>
                      <TableHead className={HEAD_CLASS}>Template status</TableHead>
                      <TableHead className={cn(HEAD_CLASS, 'text-right')}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flowBuckets.map((bucket) => {
                      const mapping = mappings[bucket.key];
                      const currentValue = mapping
                        ? optionValueForTemplate(mapping.template_name, mapping.language)
                        : '__none__';
                      const mappedTemplate = mapping
                        ? waTemplates.find(
                          (template) => template.name === mapping.template_name && template.language === mapping.language,
                        )
                        : null;
                      const hasStaleMapping = Boolean(
                        mapping
                        && !approvedTemplates.some(
                          (template) => template.name === mapping.template_name && template.language === mapping.language,
                        ),
                      );

                      return (
                        <TableRow key={bucket.key} className="border-border/20 hover:bg-muted/30 align-top">
                          <TableCell className="font-mono text-xs text-foreground">{bucket.key}</TableCell>
                          <TableCell>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{bucket.label}</p>
                                {bucket.system ? (
                                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                                    System
                                  </span>
                                ) : null}
                              </div>
                              {bucket.description ? (
                                <p className="mt-1 text-[11px] text-muted-foreground max-w-[320px]">
                                  {bucket.description}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Select
                                value={currentValue}
                                onValueChange={(value) => updateMapping(bucket.key, value)}
                                disabled={!connectionId || loadingWaTemplates}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder={connectionId ? 'Select a template' : 'Select a channel first'} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— None —</SelectItem>
                                  {approvedTemplates.map((template) => (
                                    <SelectItem
                                      key={optionValueForTemplate(template.name, template.language)}
                                      value={optionValueForTemplate(template.name, template.language)}
                                    >
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                  {hasStaleMapping && mapping ? (
                                    <SelectItem value={currentValue}>
                                      {mapping.template_name} ({mapping.language})
                                    </SelectItem>
                                  ) : null}
                                </SelectContent>
                              </Select>
                              {!connectionId ? (
                                <p className="text-[10px] text-muted-foreground">Pick a WhatsApp channel to enable template mapping.</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {mapping?.language || '—'}
                          </TableCell>
                          <TableCell>
                            <TemplateStatusBadge status={mappedTemplate?.status ?? (mapping ? 'MISSING' : undefined)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateMapping(bucket.key, '__none__')}
                              disabled={!mapping}
                              className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                            >
                              <X size={12} />
                              Clear
                            </Button>
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
                    onClick={handleSave}
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
