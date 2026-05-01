'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Save,
  Sparkles,
  Target,
  Trash2,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DataPointDefinition,
  PostProcessingTemplateContent,
  PostProcessingTemplateSummary,
  QualificationBucket,
  TemplateFieldType,
  usePostProcessingTemplates,
} from '@/app/hooks/use-post-processing-templates';

type StudioBucket = QualificationBucket & { rowId: string };
type StudioDataPoint = DataPointDefinition & { rowId: string };

type FormState = {
  name: string;
  description: string;
  qualification_buckets: StudioBucket[];
  data_points: StudioDataPoint[];
  custom_instructions: string[];
};

type ValidationState = {
  name?: string;
  qualificationBuckets?: string;
  bucketErrors: Record<string, string[]>;
  dataPointErrors: Record<string, string[]>;
  instructionErrors: Record<number, string>;
};

const createRowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toSnakeCase = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .replace(/_+/g, '_')
  .slice(0, 41);

const createBucket = (overrides: Partial<StudioBucket> = {}): StudioBucket => ({
  rowId: createRowId(),
  key: '',
  label: '',
  description: '',
  confidence_range: null,
  ...overrides,
});

const createDataPoint = (overrides: Partial<StudioDataPoint> = {}): StudioDataPoint => ({
  rowId: createRowId(),
  key: '',
  label: '',
  description: '',
  type: 'string',
  ...overrides,
});

const createBlankForm = (): FormState => ({
  name: '',
  description: '',
  qualification_buckets: [
    createBucket(),
    createBucket(),
  ],
  data_points: [
    createDataPoint({ type: 'number' }),
  ],
  custom_instructions: [''],
});

const buildFormFromContent = (content: PostProcessingTemplateContent): FormState => ({
  name: content.name || '',
  description: content.description || '',
  qualification_buckets: (content.qualification_buckets || []).map((bucket) => createBucket(bucket)),
  data_points: (content.data_points || []).map((dataPoint) => createDataPoint(dataPoint)),
  custom_instructions: content.custom_instructions?.length ? content.custom_instructions : [''],
});

const serializeForm = (form: FormState): PostProcessingTemplateContent => ({
  name: form.name.trim(),
  description: form.description.trim() || undefined,
  qualification_buckets: form.qualification_buckets.map((bucket) => ({
    key: bucket.key.trim(),
    label: bucket.label.trim(),
    description: bucket.description.trim(),
    confidence_range: bucket.confidence_range ?? undefined,
  })),
  data_points: form.data_points
    .filter((dataPoint) => dataPoint.label.trim() || dataPoint.key.trim() || dataPoint.description.trim())
    .map((dataPoint) => ({
      key: dataPoint.key.trim(),
      label: dataPoint.label.trim(),
      description: dataPoint.description.trim(),
      type: dataPoint.type,
    })),
  custom_instructions: form.custom_instructions.map((instruction) => instruction.trim()).filter(Boolean),
});

const emptyValidation: ValidationState = {
  bucketErrors: {},
  dataPointErrors: {},
  instructionErrors: {},
};

const validateForm = (form: FormState): ValidationState => {
  const nextErrors: ValidationState = {
    name: form.name.trim() ? undefined : 'Template name is required.',
    qualificationBuckets: undefined,
    bucketErrors: {},
    dataPointErrors: {},
    instructionErrors: {},
  };

  const bucketKeys = new Set<string>();
  const dataPointKeys = new Set<string>();

  if (form.qualification_buckets.length < 2 || form.qualification_buckets.length > 10) {
    nextErrors.qualificationBuckets = 'Add between 2 and 10 outcome buckets.';
  }

  form.qualification_buckets.forEach((bucket) => {
    const rowErrors: string[] = [];
    const key = bucket.key.trim();

    if (!bucket.label.trim()) rowErrors.push('Label is required.');
    if (!key) rowErrors.push('Internal key is required.');
    if (key && !/^[a-z][a-z0-9_]{0,40}$/.test(key)) rowErrors.push('Key must be snake_case and start with a letter.');
    if (!bucket.description.trim()) rowErrors.push('Description is required.');
    if (key && bucketKeys.has(key)) rowErrors.push('Each bucket key must be unique.');
    if (bucket.confidence_range) {
      const [low, high] = bucket.confidence_range;
      if (Number.isNaN(low) || Number.isNaN(high) || low < 0 || high > 100 || low > high) {
        rowErrors.push('Confidence range must stay between 0 and 100, with low <= high.');
      }
    }
    if (key) bucketKeys.add(key);
    if (rowErrors.length > 0) nextErrors.bucketErrors[bucket.rowId] = rowErrors;
  });

  form.data_points.forEach((dataPoint) => {
    const hasContent = dataPoint.label.trim() || dataPoint.key.trim() || dataPoint.description.trim();
    if (!hasContent) return;

    const rowErrors: string[] = [];
    const key = dataPoint.key.trim();

    if (!dataPoint.label.trim()) rowErrors.push('Label is required.');
    if (!key) rowErrors.push('Internal key is required.');
    if (key && !/^[a-z][a-z0-9_]{0,40}$/.test(key)) rowErrors.push('Key must be snake_case and start with a letter.');
    if (!dataPoint.description.trim()) rowErrors.push('Description is required.');
    if (key && dataPointKeys.has(key)) rowErrors.push('Each captured field key must be unique.');
    if (key) dataPointKeys.add(key);
    if (rowErrors.length > 0) nextErrors.dataPointErrors[dataPoint.rowId] = rowErrors;
  });

  return nextErrors;
};

const hasValidationErrors = (validation: ValidationState) => (
  Boolean(validation.name)
  || Boolean(validation.qualificationBuckets)
  || Object.keys(validation.bucketErrors).length > 0
  || Object.keys(validation.dataPointErrors).length > 0
  || Object.keys(validation.instructionErrors).length > 0
);

const renderFieldTypeLabel = (type: TemplateFieldType) => {
  if (type === 'number') return 'Number';
  if (type === 'list') return 'List';
  if (type === 'boolean') return 'Yes / No';

  return 'Text';
};

const StudioStep = ({
  number,
  title,
  description,
  action,
  children,
}: {
  number: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="space-y-6 pb-10 border-b border-border/10 last:border-0 last:pb-0">
    <div className="flex items-start justify-between gap-6">
      <div className="flex gap-5">
        <span className="text-6xl font-bold text-foreground/[0.12] leading-none -mt-2 select-none">{number}</span>
        <div className="space-y-1">
          <h2 className="text-2xl font-medium tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{description}</p>
        </div>
      </div>
      {action}
    </div>
    <div className="pl-[84px]">{children}</div>
  </section>
);

function TemplateRail({
  templates,
  activeTemplateId,
  currentTemplateId,
}: {
  templates: PostProcessingTemplateSummary[];
  activeTemplateId: string | null;
  currentTemplateId: string | null;
}) {
  return (
    <PaperCard className="border-border/30 bg-muted/[0.03]">
      <PaperCardHeader className="p-5 pb-3">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">Saved Templates</span>
          <h3 className="text-lg font-medium tracking-tight">Quick Switch</h3>
        </div>
      </PaperCardHeader>
      <PaperCardContent className="p-5 pt-0 space-y-2">
        <Link
          href="/qualification-studio"
          className={cn(
            'flex items-center justify-between rounded-md border px-3 py-3 transition-all',
            !currentTemplateId ? 'border-primary/30 bg-primary/10' : 'border-border/20 hover:bg-muted/30',
          )}
        >
          <div>
            <p className="text-sm font-medium text-foreground">New Template</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Blank draft</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>

        {templates.map((template) => {
          const isCurrent = currentTemplateId === template.id;
          const isActive = activeTemplateId === template.id;

          return (
            <Link
              key={template.id}
              href={`/qualification-studio?templateId=${encodeURIComponent(template.id)}`}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-3 transition-all',
                isCurrent ? 'border-primary/30 bg-primary/10' : 'border-border/20 hover:bg-muted/30',
              )}
            >
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                <div className="flex flex-wrap gap-2">
                  {template.is_system_default && (
                    <Badge variant="outline" className="rounded-full text-[9px] uppercase tracking-[0.16em]">
                      Default
                    </Badge>
                  )}
                  {isActive && (
                    <Badge className="rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-[9px] uppercase tracking-[0.16em]">
                      Live
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </PaperCardContent>
    </PaperCard>
  );
}

function QualificationStudioScreen({ selectedTemplateId }: { selectedTemplateId: string | null }) {
  const router = useRouter();
  const {
    templates,
    activeTemplateId,
    loading,
    saving,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    setActiveTemplate,
  } = usePostProcessingTemplates();

  const [form, setForm] = useState<FormState>(createBlankForm);
  const [validation, setValidation] = useState<ValidationState>(emptyValidation);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSystemDefault, setIsSystemDefault] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(JSON.stringify(serializeForm(createBlankForm())));

  useEffect(() => {
    let isMounted = true;

    if (!selectedTemplateId) {
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingTemplate(true);
    fetchTemplate(selectedTemplateId, true)
      .then((template) => {
        if (!isMounted || !template?.content) return;
        const nextForm = buildFormFromContent({
          name: template.name,
          description: template.description || '',
          qualification_buckets: template.content.qualification_buckets || [],
          data_points: template.content.data_points || [],
          custom_instructions: template.content.custom_instructions || [],
        });
        setForm(nextForm);
        setValidation(emptyValidation);
        setSavedSnapshot(JSON.stringify(serializeForm(nextForm)));
        setIsSystemDefault(Boolean(template.is_system_default));
        setLoadedTemplateName(template.name);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not load template');
      })
      .finally(() => {
        if (isMounted) setIsLoadingTemplate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchTemplate, selectedTemplateId]);

  const serializedCurrentForm = useMemo(() => JSON.stringify(serializeForm(form)), [form]);
  const isDirty = serializedCurrentForm !== savedSnapshot;
  const isLiveTemplate = Boolean(selectedTemplateId && activeTemplateId === selectedTemplateId);

  const applyValidation = () => {
    const nextValidation = validateForm(form);
    setValidation(nextValidation);

    return !hasValidationErrors(nextValidation);
  };

  const handleSave = async (activateAfterSave = false) => {
    if (isSystemDefault) return;
    if (!applyValidation()) {
      toast.error('Please resolve the highlighted issues first.');

      return;
    }

    try {
      const payload = serializeForm(form);
      let templateId = selectedTemplateId;

      if (selectedTemplateId) {
        await updateTemplate(selectedTemplateId, payload);
        templateId = selectedTemplateId;
        toast.success('Template updated');
      } else {
        const created = await createTemplate(payload);
        templateId = created.id;
        toast.success('Template created');
        router.replace(`/qualification-studio?templateId=${encodeURIComponent(created.id)}`);
      }

      if (templateId && activateAfterSave) {
        await setActiveTemplate(templateId);
        toast.success('Template is now your live ruleset');
      }

      setSavedSnapshot(JSON.stringify(payload));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save template');
    }
  };

  const updateBucket = (rowId: string, updates: Partial<StudioBucket>) => {
    setForm((current) => ({
      ...current,
      qualification_buckets: current.qualification_buckets.map((bucket) => (
        bucket.rowId === rowId ? { ...bucket, ...updates } : bucket
      )),
    }));
  };

  const updateDataPoint = (rowId: string, updates: Partial<StudioDataPoint>) => {
    setForm((current) => ({
      ...current,
      data_points: current.data_points.map((dataPoint) => (
        dataPoint.rowId === rowId ? { ...dataPoint, ...updates } : dataPoint
      )),
    }));
  };

  const activeBadgeLabel = isSystemDefault ? 'Default Template' : isLiveTemplate ? 'Live Ruleset' : selectedTemplateId ? 'Saved Draft' : 'New Draft';

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10 pb-24">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-border/40 pb-8">
          <div className="space-y-4">
            <Link
              href="/template-library"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} />
              Back to Library
            </Link>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] uppercase tracking-[0.18em]">
                  Qualification Studio
                </Badge>
                <Badge variant="outline" className="rounded-full text-[9px] uppercase tracking-[0.18em] border-border/30">
                  {activeBadgeLabel}
                </Badge>
                {isDirty && (
                  <Badge variant="outline" className="rounded-full text-[9px] uppercase tracking-[0.18em] border-orange-500/30 text-orange-500">
                    Unsaved
                  </Badge>
                )}
              </div>
              <h1 className="text-5xl font-medium tracking-tighter text-foreground">Qualification Studio</h1>
              <p className="text-muted-foreground text-sm font-medium max-w-3xl">
                Define the outcomes, captured fields, and analyzer guidance that will shape every future call review.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {selectedTemplateId && !isLiveTemplate && !isSystemDefault && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTemplate(selectedTemplateId).then(() => toast.success('Template is now live')).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not update live ruleset'))}
                disabled={saving}
                className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
              >
                <Target size={14} className="mr-2" />
                Set as Live Ruleset
              </Button>
            )}
            {!isSystemDefault && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving || isLoadingTemplate}
                  className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                >
                  <Save size={14} className="mr-2" />
                  Save Template
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving || isLoadingTemplate}
                  className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  <Sparkles size={14} className="mr-2" />
                  Save and Go Live
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          <div className="space-y-8">
            <PaperCard className="border-primary/20 bg-primary/[0.03]">
              <PaperCardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Live Behavior</span>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Once a template is set live, it is used for all future calls. Past calls remain unchanged until we add the re-analysis workflow in the next pass.
                  </p>
                </div>
                {selectedTemplateId && !isSystemDefault && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/template-library`)}
                    className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                  >
                    Open Library
                  </Button>
                )}
              </PaperCardContent>
            </PaperCard>

            {isLoadingTemplate ? (
              <PaperCard className="border-border/30">
                <PaperCardContent className="p-16 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    Loading template...
                  </span>
                </PaperCardContent>
              </PaperCard>
            ) : (
              <PaperCard className="border-border/30 bg-card/80">
                <PaperCardContent className="p-8 space-y-10">
                  <StudioStep
                    number="01"
                    title="Identity"
                    description="Give this ruleset a clear business-facing name so it is obvious which calls it is meant to qualify."
                    action={isSystemDefault ? (
                      <Badge className="rounded-full bg-muted text-muted-foreground border border-border/30 px-3 py-1 text-[9px] uppercase tracking-[0.18em]">
                        <Lock size={10} className="mr-1" />
                        Read Only
                      </Badge>
                    ) : undefined}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Template Name</label>
                        <Input
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          readOnly={isSystemDefault}
                          placeholder="Clinic appointment qualifier"
                          className={cn('bg-muted/10 border-border/30', validation.name && 'border-destructive')}
                        />
                        {validation.name && <p className="text-xs text-destructive">{validation.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Status</label>
                        <div className="h-10 rounded-md border border-border/30 bg-muted/10 px-4 flex items-center">
                          <span className="text-sm font-medium text-foreground">{activeBadgeLabel}</span>
                        </div>
                      </div>

                      <div className="lg:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Description</label>
                        <Textarea
                          value={form.description}
                          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                          readOnly={isSystemDefault}
                          placeholder="For inbound clinic calls where we need clear booking and follow-up signals."
                          className="min-h-[110px] bg-muted/10 border-border/30"
                        />
                      </div>
                    </div>
                  </StudioStep>

                  <StudioStep
                    number="02"
                    title="Outcome Buckets"
                    description="These are the business outcomes the analyzer can assign to a call. Use clear labels and make the descriptions unambiguous."
                    action={!isSystemDefault ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm((current) => ({
                          ...current,
                          qualification_buckets: [...current.qualification_buckets, createBucket()],
                        }))}
                        disabled={form.qualification_buckets.length >= 10}
                        className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                      >
                        <Plus size={14} className="mr-2" />
                        Add Outcome
                      </Button>
                    ) : undefined}
                  >
                    <div className="space-y-5">
                      {validation.qualificationBuckets && (
                        <p className="text-xs text-destructive">{validation.qualificationBuckets}</p>
                      )}

                      {form.qualification_buckets.map((bucket, index) => {
                        const rowErrors = validation.bucketErrors[bucket.rowId] || [];

                        return (
                          <div key={bucket.rowId} className={cn('rounded-lg border p-5 space-y-5', rowErrors.length > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border/20 bg-muted/[0.03]')}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">
                                Outcome {index + 1}
                              </span>
                              {!isSystemDefault && form.qualification_buckets.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setForm((current) => ({
                                    ...current,
                                    qualification_buckets: current.qualification_buckets.filter((item) => item.rowId !== bucket.rowId),
                                  }))}
                                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Label</label>
                                <Input
                                  value={bucket.label}
                                  readOnly={isSystemDefault}
                                  onChange={(event) => {
                                    const nextLabel = event.target.value;
                                    updateBucket(bucket.rowId, {
                                      label: nextLabel,
                                      key: bucket.key ? bucket.key : toSnakeCase(nextLabel),
                                    });
                                  }}
                                  placeholder="Appointment Booked"
                                  className="bg-background/80 border-border/30"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Internal Key</label>
                                <Input
                                  value={bucket.key}
                                  readOnly={isSystemDefault}
                                  onChange={(event) => updateBucket(bucket.rowId, { key: toSnakeCase(event.target.value) })}
                                  placeholder="appointment_booked"
                                  className="bg-background/80 border-border/30 font-mono text-xs"
                                />
                              </div>

                              <div className="lg:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Description</label>
                                <Textarea
                                  value={bucket.description}
                                  readOnly={isSystemDefault}
                                  onChange={(event) => updateBucket(bucket.rowId, { description: event.target.value })}
                                  placeholder="Customer confirmed a specific time or date."
                                  className="min-h-[92px] bg-background/80 border-border/30"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Confidence Low</label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  readOnly={isSystemDefault}
                                  value={bucket.confidence_range?.[0] ?? ''}
                                  onChange={(event) => {
                                    const nextLow = event.target.value === '' ? null : Number(event.target.value);
                                    updateBucket(bucket.rowId, {
                                      confidence_range: nextLow === null
                                        ? null
                                        : [nextLow, bucket.confidence_range?.[1] ?? 100],
                                    });
                                  }}
                                  className="bg-background/80 border-border/30"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Confidence High</label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  readOnly={isSystemDefault}
                                  value={bucket.confidence_range?.[1] ?? ''}
                                  onChange={(event) => {
                                    const nextHigh = event.target.value === '' ? null : Number(event.target.value);
                                    updateBucket(bucket.rowId, {
                                      confidence_range: nextHigh === null
                                        ? null
                                        : [bucket.confidence_range?.[0] ?? 0, nextHigh],
                                    });
                                  }}
                                  className="bg-background/80 border-border/30"
                                />
                              </div>
                            </div>

                            {rowErrors.length > 0 && (
                              <div className="space-y-1">
                                {rowErrors.map((error) => (
                                  <p key={error} className="text-xs text-destructive">{error}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </StudioStep>

                  <StudioStep
                    number="03"
                    title="Captured Fields"
                    description="Define the fields that should be extracted from calls. Number fields unlock schema-driven filtering later for things like interest score or qualification score."
                    action={!isSystemDefault ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm((current) => ({
                          ...current,
                          data_points: [...current.data_points, createDataPoint()],
                        }))}
                        disabled={form.data_points.length >= 12}
                        className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                      >
                        <Plus size={14} className="mr-2" />
                        Add Field
                      </Button>
                    ) : undefined}
                  >
                    <div className="space-y-5">
                      {form.data_points.map((dataPoint, index) => {
                        const rowErrors = validation.dataPointErrors[dataPoint.rowId] || [];

                        return (
                          <div key={dataPoint.rowId} className={cn('rounded-lg border p-5 space-y-5', rowErrors.length > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border/20 bg-muted/[0.03]')}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">
                                Field {index + 1}
                              </span>
                              {!isSystemDefault && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setForm((current) => ({
                                    ...current,
                                    data_points: current.data_points.filter((item) => item.rowId !== dataPoint.rowId),
                                  }))}
                                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Label</label>
                                <Input
                                  value={dataPoint.label}
                                  readOnly={isSystemDefault}
                                  onChange={(event) => {
                                    const nextLabel = event.target.value;
                                    updateDataPoint(dataPoint.rowId, {
                                      label: nextLabel,
                                      key: dataPoint.key ? dataPoint.key : toSnakeCase(nextLabel),
                                    });
                                  }}
                                  placeholder="Interest Score"
                                  className="bg-background/80 border-border/30"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Internal Key</label>
                                <Input
                                  value={dataPoint.key}
                                  readOnly={isSystemDefault}
                                  onChange={(event) => updateDataPoint(dataPoint.rowId, { key: toSnakeCase(event.target.value) })}
                                  placeholder="interest_score"
                                  className="bg-background/80 border-border/30 font-mono text-xs"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Field Type</label>
                                <Select
                                  value={dataPoint.type}
                                  onValueChange={(value: TemplateFieldType) => updateDataPoint(dataPoint.rowId, { type: value })}
                                  disabled={isSystemDefault}
                                >
                                  <SelectTrigger className="bg-background/80 border-border/30">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="list">List</SelectItem>
                                    <SelectItem value="boolean">Yes / No</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Filter Behavior</label>
                                <div className="h-10 rounded-md border border-border/30 bg-background/80 px-4 flex items-center">
                                  <span className="text-sm text-foreground">{renderFieldTypeLabel(dataPoint.type)}-based filter later</span>
                                </div>
                              </div>

                              <div className="lg:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Description</label>
                                <Textarea
                                  value={dataPoint.description}
                                  readOnly={isSystemDefault}
                                  onChange={(event) => updateDataPoint(dataPoint.rowId, { description: event.target.value })}
                                  placeholder="A normalized score from 0 to 100 based on caller intent."
                                  className="min-h-[92px] bg-background/80 border-border/30"
                                />
                              </div>
                            </div>

                            {rowErrors.length > 0 && (
                              <div className="space-y-1">
                                {rowErrors.map((error) => (
                                  <p key={error} className="text-xs text-destructive">{error}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </StudioStep>

                  <StudioStep
                    number="04"
                    title="Analyzer Guidance"
                    description="Use short rules to steer how the model interprets ambiguous situations. Keep them specific and business-relevant."
                    action={!isSystemDefault ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm((current) => ({
                          ...current,
                          custom_instructions: [...current.custom_instructions, ''],
                        }))}
                        disabled={form.custom_instructions.length >= 15}
                        className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                      >
                        <Plus size={14} className="mr-2" />
                        Add Guidance
                      </Button>
                    ) : undefined}
                  >
                    <div className="space-y-4">
                      {form.custom_instructions.map((instruction, index) => (
                        <div key={`${index}-${instruction.length}`} className="rounded-lg border border-border/20 bg-muted/[0.03] p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                              Guidance {index + 1}
                            </span>
                            {!isSystemDefault && form.custom_instructions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setForm((current) => ({
                                  ...current,
                                  custom_instructions: current.custom_instructions.filter((_, itemIndex) => itemIndex !== index),
                                }))}
                                className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                          <Textarea
                            value={instruction}
                            readOnly={isSystemDefault}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setForm((current) => ({
                                ...current,
                                custom_instructions: current.custom_instructions.map((item, itemIndex) => (
                                  itemIndex === index ? nextValue : item
                                )),
                              }));
                            }}
                            placeholder="Treat 'maybe later' as follow-up only if the caller mentions a timeframe."
                            className="min-h-[84px] bg-background/80 border-border/30"
                          />
                          {validation.instructionErrors[index] && (
                            <p className="text-xs text-destructive">{validation.instructionErrors[index]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </StudioStep>
                </PaperCardContent>
              </PaperCard>
            )}
          </div>

          <div className="space-y-6 xl:sticky xl:top-6">
            <TemplateRail
              templates={templates}
              activeTemplateId={activeTemplateId}
              currentTemplateId={selectedTemplateId}
            />

            <PaperCard className="border-border/30 bg-muted/[0.03]">
              <PaperCardHeader className="p-5 pb-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">At a Glance</span>
                  <h3 className="text-lg font-medium tracking-tight">{loadedTemplateName || form.name || 'Unsaved Template'}</h3>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="p-5 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border/20 bg-background/80 p-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Outcomes</span>
                    <p className="mt-2 text-2xl font-mono font-bold text-foreground">{form.qualification_buckets.length}</p>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/80 p-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Fields</span>
                    <p className="mt-2 text-2xl font-mono font-bold text-foreground">{form.data_points.filter((item) => item.label || item.key || item.description).length}</p>
                  </div>
                </div>

                <div className="rounded-md border border-border/20 bg-background/80 p-4 space-y-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Filter Readiness</span>
                  <div className="space-y-2">
                    {form.data_points.filter((item) => item.type === 'number').length > 0 ? (
                      <p className="text-sm text-foreground">
                        {form.data_points.filter((item) => item.type === 'number').length} numeric field(s) are ready for threshold filters later.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add number fields like &lsquo;interest_score&rsquo; or &lsquo;qualification_score&rsquo; if you want schema-driven filtering later.
                      </p>
                    )}
                  </div>
                </div>
              </PaperCardContent>
            </PaperCard>
          </div>
        </div>

        {(saving || loading) && (
          <div className="fixed bottom-6 right-6 z-40">
            <div className="rounded-full border border-border/40 bg-background/95 backdrop-blur px-4 py-2 flex items-center gap-2 shadow-lg">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Saving rules...
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function QualificationStudioPage() {
  const searchParams = useSearchParams();
  const selectedTemplateId = searchParams.get('templateId');

  return <QualificationStudioScreen key={selectedTemplateId || 'new'} selectedTemplateId={selectedTemplateId} />;
}
