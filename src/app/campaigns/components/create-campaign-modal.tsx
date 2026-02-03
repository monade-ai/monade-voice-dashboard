'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useTrunks } from '@/app/hooks/use-trunks';
import { useCampaignApi } from '@/app/hooks/use-campaign-api';
import {
  Campaign,
  CampaignProvider,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';

const { DEFAULTS, LIMITS } = CAMPAIGN_API_CONFIG;

// Common timezones for India
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
];

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated?: (campaign: Campaign) => void;
}

interface FormData {
  name: string;
  description: string;
  assistantId: string;
  provider: CampaignProvider;
  trunkName: string;
  maxConcurrent: number;
  callsPerSecond: number;
  dailyStartTime: string;
  dailyEndTime: string;
  timezone: string;
  maxRetries: number;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  assistantId: '',
  provider: 'vobiz',
  trunkName: '',
  maxConcurrent: DEFAULTS.MAX_CONCURRENT,
  callsPerSecond: DEFAULTS.CALLS_PER_SECOND,
  dailyStartTime: DEFAULTS.DAILY_START_TIME,
  dailyEndTime: DEFAULTS.DAILY_END_TIME,
  timezone: DEFAULTS.TIMEZONE,
  maxRetries: DEFAULTS.MAX_RETRIES,
};

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCampaignCreated,
}: CreateCampaignModalProps) {
  const { assistants } = useAssistants();
  const { trunks } = useTrunks();
  const { createCampaign, loading, error: apiError } = useCampaignApi();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Campaign name must be 100 characters or less';
    }

    if (!formData.assistantId) {
      newErrors.assistantId = 'Please select an assistant';
    }

    if (!formData.trunkName) {
      newErrors.trunkName = 'Please select a provider/trunk';
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.dailyStartTime)) {
      newErrors.dailyStartTime = 'Invalid time format (HH:MM)';
    }
    if (!timeRegex.test(formData.dailyEndTime)) {
      newErrors.dailyEndTime = 'Invalid time format (HH:MM)';
    }

    // Validate end time is after start time
    if (formData.dailyStartTime >= formData.dailyEndTime) {
      newErrors.dailyEndTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const campaign = await createCampaign({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        provider: formData.provider,
        trunk_name: formData.trunkName,
        max_concurrent: formData.maxConcurrent,
        calls_per_second: formData.callsPerSecond,
        daily_start_time: formData.dailyStartTime,
        daily_end_time: formData.dailyEndTime,
        timezone: formData.timezone,
        max_retries: formData.maxRetries,
      });

      toast.success('Campaign created successfully');
      setFormData(initialFormData);
      setErrors({});
      onOpenChange(false);
      onCampaignCreated?.(campaign);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      // Error is handled by the hook and shown via apiError
    }
  };

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Determine provider from selected trunk
  const handleTrunkChange = (trunkName: string) => {
    const trunk = trunks.find((t) => t.name === trunkName);
    if (trunk) {
      handleChange('trunkName', trunkName);
      // Set provider based on trunk
      const provider = trunk.name.toLowerCase().includes('twilio') ? 'twilio' : 'vobiz';
      handleChange('provider', provider);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData(initialFormData);
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Set up a new outbound calling campaign with your voice assistant.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Q4 Sales Outreach"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this campaign"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            {/* Assistant Selection */}
            <div className="space-y-2">
              <Label>Voice Assistant *</Label>
              <Select
                value={formData.assistantId}
                onValueChange={(value) => handleChange('assistantId', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an assistant" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assistantId && (
                <p className="text-sm text-destructive">{errors.assistantId}</p>
              )}
            </div>

            {/* Trunk/Provider Selection */}
            <div className="space-y-2">
              <Label>Provider / Trunk *</Label>
              <Select
                value={formData.trunkName}
                onValueChange={handleTrunkChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trunk" />
                </SelectTrigger>
                <SelectContent>
                  {trunks.map((trunk) => (
                    <SelectItem key={trunk.name} value={trunk.name}>
                      {trunk.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.trunkName && (
                <p className="text-sm text-destructive">{errors.trunkName}</p>
              )}
            </div>

            {/* Scheduling Section */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">Scheduling</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.dailyStartTime}
                    onChange={(e) => handleChange('dailyStartTime', e.target.value)}
                    disabled={loading}
                  />
                  {errors.dailyStartTime && (
                    <p className="text-xs text-destructive">{errors.dailyStartTime}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-xs text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.dailyEndTime}
                    onChange={(e) => handleChange('dailyEndTime', e.target.value)}
                    disabled={loading}
                  />
                  {errors.dailyEndTime && (
                    <p className="text-xs text-destructive">{errors.dailyEndTime}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleChange('timezone', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Section */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">Advanced Settings</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="concurrent" className="text-xs text-muted-foreground">
                    Max Concurrent
                  </Label>
                  <Select
                    value={String(formData.maxConcurrent)}
                    onValueChange={(value) => handleChange('maxConcurrent', Number(value))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: LIMITS.MAX_CONCURRENT }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callsPerSec" className="text-xs text-muted-foreground">
                    Calls/sec
                  </Label>
                  <Select
                    value={String(formData.callsPerSecond)}
                    onValueChange={(value) => handleChange('callsPerSecond', Number(value))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: LIMITS.CALLS_PER_SECOND }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retries" className="text-xs text-muted-foreground">
                    Max Retries
                  </Label>
                  <Select
                    value={String(formData.maxRetries)}
                    onValueChange={(value) => handleChange('maxRetries', Number(value))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: LIMITS.MAX_RETRIES + 1 }, (_, i) => i).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* API Error Display */}
            {apiError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {apiError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
