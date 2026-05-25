'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsappInbox, type WhatsappInboxMessage, type WhatsappInboxThread } from '@/app/hooks/use-whatsapp-inbox';
import { useVobizWhatsapp } from '@/app/hooks/use-vobiz-whatsapp';
import { ChannelStatusBadge } from '@/app/(app)/whatsapp/components/status-badges';
import { cn } from '@/lib/utils';

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const withinDateRange = (value: string | null | undefined, fromDate: string, toDate: string) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (fromDate) {
    const from = startOfDay(new Date(`${fromDate}T00:00:00`));
    if (date < from) return false;
  }

  if (toDate) {
    const to = new Date(`${toDate}T23:59:59.999`);
    if (date > to) return false;
  }

  return true;
};

const messageTone = (message: WhatsappInboxMessage) => {
  if (message.sender === 'user') {
    return 'bg-muted text-foreground border-border/30 self-start';
  }

  return 'bg-foreground text-background border-foreground/20 self-end';
};

export default function WhatsappInboxPage() {
  const whatsapp = useVobizWhatsapp();
  const {
    loadingThreads,
    loadingMessages,
    clearingThreadId,
    fetchThreads,
    fetchMessages,
    clearThreadById,
    clearThreadByChannelPhone,
  } = useWhatsappInbox();

  const { channels, loadingChannels } = whatsapp;

  const [threads, setThreads] = useState<WhatsappInboxThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [messages, setMessages] = useState<WhatsappInboxMessage[]>([]);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [wabaFilter, setWabaFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadThreads = useCallback(async () => {
    const filters = {
      limit: 100,
      connection_id: channelFilter === 'all' ? undefined : channelFilter,
      waba_id: wabaFilter === 'all' ? undefined : wabaFilter,
      q: search.trim() || undefined,
    };
    const result = await fetchThreads(filters);
    setThreads(result.threads);
  }, [channelFilter, fetchThreads, search, wabaFilter]);

  const loadMessages = useCallback(async (threadId: string) => {
    const result = await fetchMessages(threadId, { limit: 250, offset: 0 });
    setMessages(result.messages);
  }, [fetchMessages]);

  useEffect(() => {
    loadThreads().catch(() => undefined);
  }, [loadThreads]);

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedThreadId('');
      setMessages([]);
      return;
    }

    if (!selectedThreadId || !threads.some((thread) => thread.thread_id === selectedThreadId)) {
      setSelectedThreadId(threads[0].thread_id);
    }
  }, [selectedThreadId, threads]);

  useEffect(() => {
    if (!selectedThreadId) return;
    loadMessages(selectedThreadId).catch(() => undefined);
  }, [loadMessages, selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.thread_id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  const visibleMessages = useMemo(() => {
    return messages.filter((message) => message.sender === 'user' || message.sender === 'bot');
  }, [messages]);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (fromDate || toDate) {
        return withinDateRange(thread.last_message_at, fromDate, toDate);
      }

      return true;
    });
  }, [fromDate, threads, toDate]);

  const channelOptions = useMemo(() => {
    return channels.map((channel) => ({
      id: channel.id,
      label: channel.label || channel.display_name || channel.phone_number || channel.id,
      waba_id: channel.waba_id || '',
    }));
  }, [channels]);

  const wabaOptions = useMemo(() => {
    const unique = new Map<string, { id: string; label: string }>();
    channelOptions.forEach((channel) => {
      if (channel.waba_id && !unique.has(channel.waba_id)) {
        unique.set(channel.waba_id, {
          id: channel.waba_id,
          label: `${channel.waba_id}${channel.label ? ` · ${channel.label}` : ''}`,
        });
      }
    });

    return Array.from(unique.values());
  }, [channelOptions]);

  const handleClearSelectedThread = async () => {
    if (!selectedThread) return;
    await clearThreadById(selectedThread.thread_id);
    await loadThreads();
  };

  const handleClearThreadFromRail = async (thread: WhatsappInboxThread) => {
    if (thread.whatsapp_channel_connection_id && thread.phone) {
      await clearThreadByChannelPhone(thread.whatsapp_channel_connection_id, thread.phone);
    } else {
      await clearThreadById(thread.thread_id);
    }
    await loadThreads();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <MessageCircle size={12} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Redis Inbox Memory</span>
            </div>
            <h1 className="text-5xl font-medium tracking-tighter text-foreground flex items-center gap-3">
              <Inbox className="text-primary" size={40} />
              WhatsApp Inbox
            </h1>
            <p className="text-muted-foreground text-sm font-medium max-w-3xl">
              Monitor and manage inbound WhatsApp conversations across every connected sender number from one unified operations view.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="rounded-full border border-border/30 px-3 py-1">
                {loadingChannels ? 'Loading accounts...' : `${channels.length} connected account${channels.length === 1 ? '' : 's'}`}
              </span>
              <span className="rounded-full border border-border/30 px-3 py-1">
                {filteredThreads.length} active thread{filteredThreads.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => loadThreads()}
            disabled={loadingThreads}
            className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
          >
            <RefreshCw size={14} className={cn(loadingThreads && 'animate-spin')} />
            Refresh Inbox
          </Button>
        </div>

        <PaperCard variant="mesh" shaderProps={{ positions: 22, waveX: 0.36, grainOverlay: 0.88 }} className="border-border/40">
          <PaperCardContent className="p-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_180px_180px]">
            <div className="space-y-2">
              <PaperCardTitle>Search Threads</PaperCardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search phone, snippet, or digits..."
                  className="pl-9 h-11 bg-background/90 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <PaperCardTitle>WhatsApp Account</PaperCardTitle>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-11 text-xs bg-background/90">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>{channel.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <PaperCardTitle>WABA</PaperCardTitle>
              <Select value={wabaFilter} onValueChange={setWabaFilter}>
                <SelectTrigger className="h-11 text-xs bg-background/90">
                  <SelectValue placeholder="All WABAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All WABAs</SelectItem>
                  {wabaOptions.map((waba) => (
                    <SelectItem key={waba.id} value={waba.id}>{waba.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <PaperCardTitle>From</PaperCardTitle>
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-11 bg-background/90 text-xs"
              />
            </div>

            <div className="space-y-2">
              <PaperCardTitle>To</PaperCardTitle>
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-11 bg-background/90 text-xs"
              />
            </div>
          </PaperCardContent>
        </PaperCard>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8 items-start">
          {!loadingChannels && channels.length === 0 ? (
            <PaperCard variant="default" className="border-border/40 xl:col-span-2">
              <PaperCardContent className="py-20 px-6 text-center space-y-4">
                <MessageCircle className="mx-auto text-primary/50" size={30} />
                <h2 className="text-2xl font-medium tracking-tight">Connect a WhatsApp number first</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  The inbox pulls Redis-backed conversations from your connected WhatsApp Business accounts. Once at least one account is connected, threads will appear here automatically.
                </p>
              </PaperCardContent>
            </PaperCard>
          ) : null}

          {loadingChannels || channels.length > 0 ? (
            <>
          <PaperCard variant="default" className="border-border/40">
            <PaperCardHeader className="p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                <PaperCardTitle>Thread Rail</PaperCardTitle>
                <h2 className="text-2xl font-medium tracking-tight">Unified Conversations</h2>
                </div>
                <div className="rounded-full border border-border/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {filteredThreads.length} number{filteredThreads.length === 1 ? '' : 's'}
                </div>
              </div>
            </PaperCardHeader>
            <PaperCardContent className="p-0">
              {loadingThreads ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-primary/50" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Loading threads...</span>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-3">
                  <MessageCircle className="mx-auto text-primary/50" size={28} />
                  <h3 className="text-lg font-medium tracking-tight">No inbox threads found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Adjust the filters, or wait for inbound WhatsApp activity to create Redis-backed conversation memory.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[72vh]">
                  <div className="p-3 space-y-2">
                    {filteredThreads.map((thread) => {
                      const isActive = selectedThreadId === thread.thread_id;
                      const clearingKey = thread.whatsapp_channel_connection_id && thread.phone
                        ? `${thread.whatsapp_channel_connection_id}:${thread.phone}`
                        : thread.thread_id;

                      return (
                        <div
                          key={thread.thread_id}
                          className={cn(
                            'w-full rounded-md border p-3 transition-all',
                            isActive ? 'border-primary/30 bg-primary/10' : 'border-border/20 hover:bg-muted/40',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedThreadId(thread.thread_id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <p className="text-sm font-medium truncate">{thread.phone}</p>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">
                                  {thread.channel?.label || thread.channel?.display_name || thread.waba_id || 'Unknown account'}
                                </p>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatTime(thread.last_message_at)}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                              {thread.last_direction ? (
                                <span className="rounded-full border border-border/20 px-2 py-0.5 uppercase tracking-[0.16em]">
                                  {thread.last_direction}
                                </span>
                              ) : null}
                              {thread.last_status ? (
                                <span className="rounded-full border border-border/20 px-2 py-0.5 uppercase tracking-[0.16em]">
                                  {thread.last_status}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                              {thread.last_text || 'No preview available'}
                            </p>
                          </button>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-mono text-muted-foreground truncate">
                              {thread.waba_id || 'No WABA'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await handleClearThreadFromRail(thread);
                              }}
                              disabled={clearingThreadId === clearingKey}
                              className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-destructive"
                            >
                              {clearingThreadId === clearingKey ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              Clear
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </PaperCardContent>
          </PaperCard>

          <PaperCard variant="default" className="border-border/40">
            <PaperCardHeader className="p-6 pb-4">
              {selectedThread ? (
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                      <PaperCardTitle>Conversation Pane</PaperCardTitle>
                      <h2 className="text-2xl font-medium tracking-tight">{selectedThread.phone}</h2>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span>Last message: {formatDateTime(selectedThread.last_message_at)}</span>
                      <span>WABA: {selectedThread.waba_id || '—'}</span>
                      <span>Provider channel: {selectedThread.channel_id || '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {selectedThread.channel?.connection_status ? (
                      <ChannelStatusBadge status={selectedThread.channel.connection_status} />
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearSelectedThread}
                      disabled={clearingThreadId === selectedThread.thread_id}
                      className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] border-border/40"
                    >
                      {clearingThreadId === selectedThread.thread_id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Reset Chat Context
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <PaperCardTitle>Conversation Pane</PaperCardTitle>
                  <h2 className="text-2xl font-medium tracking-tight">No thread selected</h2>
                </div>
              )}
            </PaperCardHeader>
            <PaperCardContent className="p-0">
              {!selectedThread ? (
                <div className="py-24 px-6 text-center space-y-3">
                  <Inbox className="mx-auto text-primary/50" size={30} />
                  <h3 className="text-lg font-medium tracking-tight">Choose a thread from the rail</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    The full Redis-backed chat log will appear here, with statuses, bot replies, and template sends in one scrollable view.
                  </p>
                </div>
              ) : loadingMessages ? (
                <div className="py-24 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-primary/50" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Loading messages...</span>
                </div>
              ) : visibleMessages.length === 0 ? (
                <div className="py-24 px-6 text-center space-y-3">
                  <MessageCircle className="mx-auto text-primary/50" size={28} />
                  <h3 className="text-lg font-medium tracking-tight">No user or bot messages in this thread</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Status events are hidden here, so this thread currently has no visible conversation messages to show.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[72vh]">
                  <div className="p-6 space-y-4">
                    {visibleMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'max-w-[78%] rounded-2xl border px-4 py-3 space-y-2',
                          messageTone(message),
                        )}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em] opacity-80">
                          <span>{message.sender || 'message'}</span>
                          <span>{formatTime(message.created_at)}</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.text || 'No text content'}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] opacity-75">
                          {message.direction ? (
                            <span className="rounded-full border border-current/15 px-2 py-0.5">{message.direction}</span>
                          ) : null}
                          {message.status ? (
                            <span className="rounded-full border border-current/15 px-2 py-0.5">{message.status}</span>
                          ) : null}
                          {message.message_type ? (
                            <span className="rounded-full border border-current/15 px-2 py-0.5">{message.message_type}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </PaperCardContent>
          </PaperCard>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
