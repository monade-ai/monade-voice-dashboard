'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Loader2,
  ArrowUpRight,
  Sparkles,
  Target,
  SlidersHorizontal,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent, PaperCardHeader } from '@/components/ui/paper-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  PostProcessingTemplate,
  PostProcessingTemplateSummary,
  usePostProcessingTemplates,
} from '@/app/hooks/use-post-processing-templates';

const formatRelativeDate = (date?: string) => {
  if (!date) return 'Recently updated';

  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const TemplateCard = ({
  template,
  isActive,
  onActivate,
  onDelete,
  fetchTemplate,
}: {
  template: PostProcessingTemplateSummary;
  isActive: boolean;
  onActivate: (templateId: string) => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
  fetchTemplate: (templateId: string) => Promise<PostProcessingTemplate | null>;
}) => {
  const router = useRouter();
  const [details, setDetails] = useState<PostProcessingTemplate | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetchTemplate(template.id)
      .then((result) => {
        if (isMounted) {
          setDetails(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDetails(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchTemplate, template.id]);

  const bucketCount = details?.content?.qualification_buckets?.length ?? null;
  const dataPointCount = details?.content?.data_points?.length ?? null;
  const guidanceCount = details?.content?.custom_instructions?.length ?? null;
  const previewBuckets = details?.content?.qualification_buckets?.slice(0, 3) ?? [];

  return (
    <PaperCard
      variant="mesh"
      shaderProps={{ positions: 18, waveX: 0.36, grainOverlay: 0.92 }}
      className="border-border/40 hover:border-primary/40 transition-all duration-500"
    >
      <PaperCardHeader className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]',
                  template.is_system_default
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : 'border-border/40 bg-background/70 text-muted-foreground',
                )}
              >
                {template.is_system_default ? 'Default Monade Rules' : 'Custom'}
              </Badge>
              {isActive && (
                <Badge className="rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-[9px] font-bold uppercase tracking-[0.2em]">
                  Live Ruleset
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-medium tracking-tight text-foreground">{template.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl">
                {template.description || 'No description yet. Open the studio to define its qualification logic.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/qualification-studio?templateId=${encodeURIComponent(template.id)}`)}
            className="w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-black shrink-0"
            aria-label={`Open ${template.name}`}
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
      </PaperCardHeader>

      <PaperCardContent className="p-6 pt-0 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {loadingDetails ? (
            ['Outcomes', 'Fields', 'Guidance'].map((label) => (
              <div key={label} className="rounded-md border border-border/20 bg-muted/10 p-4">
                <div className="h-3 w-16 bg-muted rounded-sm animate-pulse mb-3" />
                <div className="h-6 w-10 bg-muted rounded-sm animate-pulse" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-md border border-border/20 bg-background/70 p-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">Outcomes</span>
                <p className="mt-2 text-2xl font-mono font-bold text-foreground">{bucketCount ?? '--'}</p>
              </div>
              <div className="rounded-md border border-border/20 bg-background/70 p-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">Fields</span>
                <p className="mt-2 text-2xl font-mono font-bold text-foreground">{dataPointCount ?? '--'}</p>
              </div>
              <div className="rounded-md border border-border/20 bg-background/70 p-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">Guidance</span>
                <p className="mt-2 text-2xl font-mono font-bold text-foreground">{guidanceCount ?? '--'}</p>
              </div>
            </>
          )}
        </div>

        {previewBuckets.length > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/60">
              Outcome Preview
            </span>
            <div className="flex flex-wrap gap-2">
              {previewBuckets.map((bucket) => (
                <Badge
                  key={bucket.key}
                  variant="outline"
                  className="rounded-full bg-muted/10 border-border/30 text-[10px] uppercase tracking-[0.16em]"
                >
                  {bucket.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/10">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
            Updated {formatRelativeDate(template.updated_at || template.created_at)}
          </span>

          <div className="flex items-center gap-2">
            {!isActive && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onActivate(template.id)}
                className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] border-border/40"
              >
                Set Live
              </Button>
            )}
            {!template.is_system_default && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(template.id)}
                className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </PaperCardContent>
    </PaperCard>
  );
};

export default function TemplateLibraryPage() {
  const router = useRouter();
  const {
    templates,
    activeTemplateId,
    resolvedTemplate,
    loading,
    saving,
    fetchTemplate,
    setActiveTemplate,
    deleteTemplate,
  } = usePostProcessingTemplates();
  const [search, setSearch] = useState('');
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (showLiveOnly && template.id !== activeTemplateId) return false;
      if (!normalizedSearch) return true;

      return template.name.toLowerCase().includes(normalizedSearch)
        || template.description?.toLowerCase().includes(normalizedSearch);
    });
  }, [activeTemplateId, search, showLiveOnly, templates]);

  const orderedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      if (a.id === activeTemplateId) return -1;
      if (b.id === activeTemplateId) return 1;
      if (a.is_system_default && !b.is_system_default) return -1;
      if (b.is_system_default && !a.is_system_default) return 1;

      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    });
  }, [activeTemplateId, filteredTemplates]);

  const handleActivate = async (templateId: string) => {
    try {
      await setActiveTemplate(templateId);
      toast.success('Live ruleset updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update live ruleset');
    }
  };

  const handleDelete = async (templateId: string) => {
    const confirmed = window.confirm('Delete this qualification template? Existing analytics will remain, but you will lose this saved ruleset.');
    if (!confirmed) return;

    try {
      await deleteTemplate(templateId);
      toast.success('Template deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete template');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-12 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-border/40 pb-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Template Library</h1>
            <p className="text-muted-foreground text-sm font-medium">
              Browse and manage the qualification rule sets that shape every analyzed call.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates..."
                className="pl-9 h-10 w-full sm:w-72 bg-muted/10 border-border/40 text-xs rounded-md"
              />
            </div>
            <Button
              type="button"
              variant={showLiveOnly ? 'default' : 'outline'}
              onClick={() => setShowLiveOnly((current) => !current)}
              className={cn(
                'h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em]',
                showLiveOnly ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border/40',
              )}
            >
              <SlidersHorizontal size={14} className="mr-2" />
              {showLiveOnly ? 'Showing Live Only' : 'Show Live Only'}
            </Button>
            <Button
              type="button"
              onClick={() => router.push('/qualification-studio')}
              className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-[4px] text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <Plus size={16} />
              Create Template
            </Button>
          </div>
        </div>

        <PaperCard className="border-primary/20 bg-primary/[0.03]">
          <PaperCardContent className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.26em]">Live Ruleset</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-medium tracking-tight text-foreground">
                  {resolvedTemplate?.name || 'Default Monade Rules'}
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  {resolvedTemplate?.description || 'You are currently using the fallback Monade qualification logic for all future calls.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-background text-foreground border border-border/30 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]">
                  {resolvedTemplate?.resolved_via === 'user_active' ? 'Custom Live Rules' : 'System Default'}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[9px] font-bold uppercase tracking-[0.18em] border-border/30">
                  {resolvedTemplate?.content?.qualification_buckets?.length ?? 0} Outcomes
                </Badge>
                <Badge variant="outline" className="rounded-full text-[9px] font-bold uppercase tracking-[0.18em] border-border/30">
                  {resolvedTemplate?.content?.data_points?.length ?? 0} Fields
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {activeTemplateId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTemplate(null).then(() => toast.success('Live ruleset reset to default')).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not reset ruleset'))}
                  disabled={saving}
                  className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                >
                  Reset to Default
                </Button>
              )}
              <Link href={activeTemplateId ? `/qualification-studio?templateId=${encodeURIComponent(activeTemplateId)}` : '/qualification-studio'}>
                <Button type="button" className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em]">
                  <Target size={14} className="mr-2" />
                  Open Studio
                </Button>
              </Link>
            </div>
          </PaperCardContent>
        </PaperCard>

        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">Saved Templates</h2>
            <div className="h-px flex-1 bg-border/20" />
            <Badge variant="secondary" className="bg-muted text-foreground text-[9px] font-mono">
              {orderedTemplates.length} TOTAL
            </Badge>
          </div>

          {loading && templates.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Loading templates...
              </span>
            </div>
          ) : orderedTemplates.length === 0 ? (
            <PaperCard className="border-dashed border-border/40 bg-muted/5">
              <PaperCardContent className="p-12 text-center space-y-4">
                <CheckCircle2 className="mx-auto text-primary/60" size={24} />
                <div className="space-y-2">
                  <h3 className="text-xl font-medium tracking-tight">No templates match this view</h3>
                  <p className="text-sm text-muted-foreground">
                    Clear your filters or create a new qualification template to start shaping the dashboard output.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => router.push('/qualification-studio')}
                  className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  <Plus size={14} className="mr-2" />
                  Create Template
                </Button>
              </PaperCardContent>
            </PaperCard>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {orderedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isActive={template.id === activeTemplateId}
                  onActivate={handleActivate}
                  onDelete={handleDelete}
                  fetchTemplate={fetchTemplate}
                />
              ))}
            </div>
          )}
        </section>

        {saving && (
          <div className="fixed bottom-6 right-6 z-40">
            <div className="rounded-full border border-border/40 bg-background/95 backdrop-blur px-4 py-2 flex items-center gap-2 shadow-lg">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Syncing rules...
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
