'use client';

import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Check,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { MONADE_API_CONFIG } from '@/types/monade-api.types';
import { cn } from '@/lib/utils';

interface WebhookEndpoint {
  id: string;
  user_uid: string;
  url: string;
  event_types: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'call_analytics.completed': 'Call Analytics Completed',
};

/**
 * Sanitize webhook URLs before saving.
 * - Strips #!/view/ from webhook.site browser URLs (common copy-paste mistake)
 * - Removes hash fragments (never sent in HTTP requests, so they'd cause 404s)
 */
const sanitizeWebhookUrl = (url: string): string => {
  let sanitized = url.trim();
  // webhook.site: user copies browser URL with #!/view/ instead of the API receiver URL
  sanitized = sanitized.replace(/\/#!\/view\//, '/');
  // Strip any remaining hash fragments — they're client-side only
  const hashIndex = sanitized.indexOf('#');
  if (hashIndex !== -1) {
    sanitized = sanitized.substring(0, hashIndex);
  }
  // Remove trailing slashes for consistency
  sanitized = sanitized.replace(/\/+$/, '');
  return sanitized;
};

export function WebhookManager() {
  const { userUid } = useMonadeUser();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEventTypes, setFormEventTypes] = useState<string[]>([]);

  const baseUrl = MONADE_API_CONFIG.BASE_URL;

  // Fetch endpoints
  const fetchEndpoints = async () => {
    if (!userUid) return;
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/users/${userUid}/webhooks`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setEndpoints(Array.isArray(data.endpoints) ? data.endpoints : []);
      }
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch supported event types
  const fetchSupportedEvents = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/webhooks/supported-events`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSupportedEvents(Array.isArray(data.event_types) ? data.event_types : []);
      }
    } catch (err) {
      console.error('Failed to fetch supported events:', err);
    }
  };

  useEffect(() => {
    fetchEndpoints();
    fetchSupportedEvents();
  }, [userUid]);

  const resetForm = () => {
    setFormUrl('');
    setFormDescription('');
    setFormEventTypes([]);
    setEditingEndpoint(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (endpoint: WebhookEndpoint) => {
    setEditingEndpoint(endpoint);
    setFormUrl(endpoint.url);
    setFormDescription(endpoint.description || '');
    setFormEventTypes([...endpoint.event_types]);
    setShowCreateDialog(true);
  };

  const toggleEventType = (eventType: string) => {
    setFormEventTypes(prev =>
      prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
  };

  // Create endpoint
  const handleCreate = async () => {
    if (!userUid) return;
    if (!formUrl || formEventTypes.length === 0) {
      toast.error('URL and at least one event type are required.');
      return;
    }

    // Basic URL validation
    try {
      new URL(formUrl);
    } catch {
      toast.error('Please enter a valid URL (e.g. https://example.com/webhook)');
      return;
    }

    const targetUrl = sanitizeWebhookUrl(formUrl);

    setIsCreating(true);
    try {
      const res = await fetch(`${baseUrl}/api/users/${userUid}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: targetUrl,
          event_types: formEventTypes,
          description: formDescription || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Webhook endpoint created');
        setShowCreateDialog(false);
        resetForm();
        await fetchEndpoints();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to create webhook');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsCreating(false);
    }
  };

  // Update endpoint
  const handleUpdate = async () => {
    if (!userUid || !editingEndpoint) return;
    if (!formUrl || formEventTypes.length === 0) {
      toast.error('URL and at least one event type are required.');
      return;
    }

    try {
      new URL(formUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const targetUrl = sanitizeWebhookUrl(formUrl);

    setIsCreating(true);
    try {
      const res = await fetch(`${baseUrl}/api/users/${userUid}/webhooks/${editingEndpoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: targetUrl,
          event_types: formEventTypes,
          description: formDescription || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Webhook endpoint updated');
        setShowCreateDialog(false);
        resetForm();
        await fetchEndpoints();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to update webhook');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle active/inactive
  const handleToggle = async (endpoint: WebhookEndpoint) => {
    if (!userUid) return;
    try {
      const res = await fetch(`${baseUrl}/api/users/${userUid}/webhooks/${endpoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !endpoint.is_active }),
      });

      if (res.ok) {
        setEndpoints(prev =>
          prev.map(ep => ep.id === endpoint.id ? { ...ep, is_active: !ep.is_active } : ep)
        );
        toast.success(endpoint.is_active ? 'Webhook paused' : 'Webhook activated');
      } else {
        toast.error('Failed to update webhook');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  // Delete endpoint
  const handleDelete = async (id: string) => {
    if (!userUid) return;
    if (!confirm('Delete this webhook endpoint? It will stop receiving events immediately.')) return;

    try {
      const res = await fetch(`${baseUrl}/api/users/${userUid}/webhooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setEndpoints(prev => prev.filter(ep => ep.id !== id));
        toast.success('Webhook deleted');
      } else {
        toast.error('Failed to delete webhook');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Webhook Endpoints</h3>
          <p className="text-xs text-muted-foreground">Receive real-time POST notifications when events occur.</p>
        </div>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-[4px] text-[10px] font-bold uppercase tracking-widest"
        >
          <Plus size={12} />
          Add Endpoint
        </Button>
      </div>

      {/* Endpoint List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading webhooks...</div>
        ) : endpoints.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border/40 rounded-md bg-muted/5">
            <Webhook size={20} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground italic">No webhook endpoints configured.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Add one to receive event notifications via HTTP POST.</p>
          </div>
        ) : (
          endpoints.map((ep) => (
            <div key={ep.id} className="group flex items-center justify-between p-3 rounded-md bg-muted/10 border border-border/20 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  ep.is_active ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground'
                )}>
                  <Webhook size={14} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-mono font-medium text-foreground truncate">
                    {ep.url}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ep.description && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">{ep.description}</span>
                    )}
                    <div className="flex items-center gap-1">
                      {ep.event_types.map(t => (
                        <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary/80 font-medium uppercase tracking-wider">
                          {t.split('.').pop()}
                        </span>
                      ))}
                    </div>
                    <span className={cn(
                      'text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider',
                      ep.is_active
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-muted/30 text-muted-foreground'
                    )}>
                      {ep.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handleToggle(ep)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
                  title={ep.is_active ? 'Pause webhook' : 'Activate webhook'}
                >
                  {ep.is_active ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={() => openEditDialog(ep)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(ep.id)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-destructive hover:bg-background/80 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <Webhook size={20} className="text-primary" />
              {editingEndpoint ? 'Edit Webhook' : 'New Webhook Endpoint'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingEndpoint
                ? 'Update the endpoint URL, events, or description.'
                : 'We\'ll send a POST request to this URL whenever selected events occur.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-2">
            {/* URL */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Endpoint URL</label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="bg-muted/10 border-border/20 font-mono text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Description <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Production CRM integration"
                className="bg-muted/10 border-border/20"
              />
            </div>

            {/* Event Types */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Events to Subscribe</label>
              <div className="space-y-2">
                {supportedEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Loading events...</p>
                ) : (
                  supportedEvents.map(eventType => (
                    <button
                      key={eventType}
                      type="button"
                      onClick={() => toggleEventType(eventType)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-md border transition-all text-left',
                        formEventTypes.includes(eventType)
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/20 bg-muted/5 hover:border-border/40'
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {EVENT_TYPE_LABELS[eventType] || eventType}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{eventType}</span>
                      </div>
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                        formEventTypes.includes(eventType)
                          ? 'border-primary bg-primary'
                          : 'border-border/40'
                      )}>
                        {formEventTypes.includes(eventType) && <Check size={12} className="text-background" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowCreateDialog(false); resetForm(); }}
              className="h-9 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-background"
            >
              Cancel
            </Button>
            <Button
              onClick={editingEndpoint ? handleUpdate : handleCreate}
              disabled={isCreating || !formUrl || formEventTypes.length === 0}
              className="h-9 text-[10px] font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90"
            >
              {isCreating ? (
                <Loader2 size={12} className="animate-spin mr-2" />
              ) : null}
              {editingEndpoint ? 'Save Changes' : 'Create Endpoint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
