'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Plus, FileText, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { PaperCard } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import type { useVobizWhatsapp, WhatsappTemplate } from '@/app/hooks/use-vobiz-whatsapp';
import { useWhatsappFlows, type WhatsappFlow } from '@/app/hooks/use-whatsapp-flows';

import { TemplateStatusBadge } from './status-badges';
import { TemplateFormDialog } from './template-form-dialog';

type WhatsappApi = ReturnType<typeof useVobizWhatsapp>;
type StatusFilter = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED';

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];
const HEAD_CLASS = 'text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// A flow mapping points at template.name + template.language inside its mappings JSON.
interface TemplateUsage {
  assistant: string;
  outcomeKey: string;
}

const collectUsage = (template: WhatsappTemplate, flows: WhatsappFlow[]): TemplateUsage[] => {
  const usage: TemplateUsage[] = [];

  flows.forEach((flow) => {
    const assistantName = flow.assistant?.name || flow.assistant_id || 'Assistant';
    Object.entries(flow.mappings || {}).forEach(([outcomeKey, mapping]) => {
      if (mapping?.template_name === template.name && mapping?.language === template.language) {
        usage.push({ assistant: assistantName, outcomeKey });
      }
    });
  });

  return usage;
};

export function TemplatesTab({ whatsapp }: { whatsapp: WhatsappApi }) {
  const { channels, fetchTemplates, syncTemplates, createTemplate, saving } = whatsapp;
  const { fetchFlows } = useWhatsappFlows();

  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [flows, setFlows] = useState<WhatsappFlow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [resubmitTarget, setResubmitTarget] = useState<WhatsappTemplate | null>(null);

  // Default to the first connected channel once channels load.
  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const loadTemplates = useCallback(async (channelId: string, status: StatusFilter) => {
    if (!channelId) return;
    setLoadingTemplates(true);
    try {
      const result = await fetchTemplates(channelId, status === 'ALL' ? undefined : status);
      setTemplates(result);
    } catch (err) {
      console.error('[TemplatesTab] loadTemplates error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load templates');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [fetchTemplates]);

  const loadFlows = useCallback(async (channelId: string) => {
    if (!channelId) return;
    try {
      const result = await fetchFlows({ whatsapp_channel_connection_id: channelId });
      setFlows(result);
    } catch (err) {
      console.error('[TemplatesTab] loadFlows error:', err);
      setFlows([]);
    }
  }, [fetchFlows]);

  useEffect(() => {
    if (selectedChannelId) {
      loadTemplates(selectedChannelId, statusFilter);
      loadFlows(selectedChannelId);
    }
  }, [selectedChannelId, statusFilter, loadTemplates, loadFlows]);

  const handleSyncFromMeta = async () => {
    if (!selectedChannelId) return;
    setSyncing(true);
    try {
      await syncTemplates(selectedChannelId);
      await Promise.all([loadTemplates(selectedChannelId, statusFilter), loadFlows(selectedChannelId)]);
    } catch {
      // toast handled in hook
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmitTemplate = async (payload: Parameters<typeof createTemplate>[1]) => {
    const result = await createTemplate(selectedChannelId, payload);
    await loadTemplates(selectedChannelId, statusFilter);

    return result;
  };

  const usageByTemplate = useMemo(() => {
    const map = new Map<string, TemplateUsage[]>();
    templates.forEach((template) => {
      map.set(`${template.name}::${template.language}`, collectUsage(template, flows));
    });

    return map;
  }, [templates, flows]);

  const channelOptions = useMemo(
    () => channels.map((channel) => ({
      id: channel.id,
      label: channel.label || channel.display_name || channel.phone_number || channel.id,
    })),
    [channels],
  );

  if (channels.length === 0) {
    return (
      <PaperCard variant="default" className="border-border/40">
        <div className="py-16 px-6 text-center space-y-3">
          <MessageCircle className="mx-auto text-primary/50" size={26} />
          <h3 className="text-lg font-medium tracking-tight">Connect a number first</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Templates belong to a connected WhatsApp channel. Add one from the Connected Numbers tab
            to manage templates here.
          </p>
        </div>
      </PaperCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
            <SelectTrigger className="h-9 w-60 text-xs">
              <SelectValue placeholder="Select a channel" />
            </SelectTrigger>
            <SelectContent>
              {channelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex p-1 bg-muted rounded-md">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  'px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all',
                  statusFilter === filter
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadTemplates(selectedChannelId, statusFilter)}
            disabled={loadingTemplates}
            className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] border-border/40"
          >
            <RefreshCw size={13} className={cn(loadingTemplates && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncFromMeta}
            disabled={syncing || saving}
            className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] border-border/40"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Sync from Meta
          </Button>
          <Button
            type="button"
            onClick={() => { setResubmitTarget(null); setFormOpen(true); }}
            className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus size={14} />
            Create template
          </Button>
        </div>
      </div>

      <PaperCard variant="default" className="border-border/40">
        {loadingTemplates && templates.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary/50" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Loading templates...
            </span>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <FileText className="mx-auto text-primary/50" size={26} />
            <h3 className="text-lg font-medium tracking-tight">No templates found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Sync from Meta to pull templates created outside Monade, or create a new template for
              approval.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className={HEAD_CLASS}>Template name</TableHead>
                <TableHead className={HEAD_CLASS}>Language</TableHead>
                <TableHead className={HEAD_CLASS}>Category</TableHead>
                <TableHead className={HEAD_CLASS}>Status</TableHead>
                <TableHead className={HEAD_CLASS}>Used by</TableHead>
                <TableHead className={HEAD_CLASS}>Updated</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const usage = usageByTemplate.get(`${template.name}::${template.language}`) ?? [];
                const isRejected = (template.status || '').toUpperCase() === 'REJECTED';

                return (
                  <TableRow
                    key={`${template.id || template.name}-${template.language}`}
                    className="border-border/20 hover:bg-muted/30 align-top"
                  >
                    <TableCell className="font-medium font-mono text-xs">
                      {template.name}
                      {isRejected && template.rejection_reason && (
                        <p className="mt-1 font-sans text-[10px] font-normal text-red-500/80 max-w-[220px]">
                          {template.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{template.language}</TableCell>
                    <TableCell className="text-xs">{template.category || '—'}</TableCell>
                    <TableCell><TemplateStatusBadge status={template.status} /></TableCell>
                    <TableCell>
                      {usage.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground/60 italic">Unused</span>
                      ) : (
                        <div className="space-y-0.5">
                          {usage.slice(0, 3).map((entry, index) => (
                            <p key={`${entry.assistant}-${entry.outcomeKey}-${index}`} className="text-[11px]">
                              <span className="font-medium">{entry.assistant}</span>
                              <span className="text-muted-foreground"> / {entry.outcomeKey}</span>
                            </p>
                          ))}
                          {usage.length > 3 && (
                            <p className="text-[10px] text-muted-foreground">+{usage.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDate(template.provider_updated_at || template.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isRejected ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setResubmitTarget(template); setFormOpen(true); }}
                          className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw size={12} />
                          Resubmit
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </PaperCard>

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setResubmitTarget(null); }}
        onSubmit={handleSubmitTemplate}
        saving={saving}
        resubmitFrom={resubmitTarget}
      />
    </div>
  );
}
