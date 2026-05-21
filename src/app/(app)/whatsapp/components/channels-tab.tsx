'use client';

import React, { useState } from 'react';
import { Loader2, RefreshCw, Plus, DownloadCloud, MessageCircle } from 'lucide-react';

import { PaperCard } from '@/components/ui/paper-card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { useVobizWhatsapp } from '@/app/hooks/use-vobiz-whatsapp';

import { ChannelStatusBadge, VerificationBadge } from './status-badges';
import { ConnectChannelDialog } from './connect-channel-dialog';
import { ImportChannelDialog } from './import-channel-dialog';

type WhatsappApi = ReturnType<typeof useVobizWhatsapp>;

const HEAD_CLASS = 'text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70';

export function ChannelsTab({ whatsapp }: { whatsapp: WhatsappApi }) {
  const { channels, loadingChannels, saving, fetchChannels, connectChannel, importChannel, syncChannel } = whatsapp;
  const [connectOpen, setConnectOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      await syncChannel(connectionId);
    } catch {
      // toast handled in hook
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">Connected Numbers</h2>
          <span className="text-[9px] font-mono text-muted-foreground">{channels.length} TOTAL</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchChannels()}
            disabled={loadingChannels}
            className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] border-border/40"
          >
            <RefreshCw size={13} className={cn(loadingChannels && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] border-border/40"
          >
            <DownloadCloud size={13} />
            Import channel
          </Button>
          <Button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="h-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus size={14} />
            Connect BYO WABA
          </Button>
        </div>
      </div>

      <PaperCard variant="default" className="border-border/40">
        {loadingChannels && channels.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary/50" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Loading channels...
            </span>
          </div>
        ) : channels.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <MessageCircle className="mx-auto text-primary/50" size={26} />
            <h3 className="text-lg font-medium tracking-tight">No WhatsApp numbers connected</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect a Bring Your Own WABA number, or import a channel that already exists in your
              Vobiz account.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className={HEAD_CLASS}>Label</TableHead>
                <TableHead className={HEAD_CLASS}>Display name</TableHead>
                <TableHead className={HEAD_CLASS}>WhatsApp number</TableHead>
                <TableHead className={HEAD_CLASS}>WABA ID</TableHead>
                <TableHead className={HEAD_CLASS}>Channel ID</TableHead>
                <TableHead className={HEAD_CLASS}>Connection</TableHead>
                <TableHead className={HEAD_CLASS}>Verification</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((channel) => (
                <TableRow key={channel.id} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="font-medium">{channel.label || '—'}</TableCell>
                  <TableCell>{channel.display_name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{channel.phone_number || '—'}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{channel.waba_id || '—'}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {channel.channel_id || '—'}
                  </TableCell>
                  <TableCell><ChannelStatusBadge status={channel.connection_status} /></TableCell>
                  <TableCell><VerificationBadge status={channel.verification_status} /></TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(channel.id)}
                      disabled={Boolean(syncingId)}
                      className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw size={12} className={cn(syncingId === channel.id && 'animate-spin')} />
                      Sync
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PaperCard>

      <ConnectChannelDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnect={connectChannel}
        saving={saving}
      />
      <ImportChannelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importChannel}
        saving={saving}
      />
    </div>
  );
}
