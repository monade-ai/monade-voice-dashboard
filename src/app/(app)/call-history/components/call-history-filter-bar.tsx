'use client';

import React from 'react';
import {
  Search,
  X,
  ChevronDown,
  Calendar,
  Activity,
  Zap,
  Clock,
  FolderOpen,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export interface CallHistoryFilterState {
  verdicts: string[];
  qualities: string[];
  hasConversation: boolean;
  search: string;
  timeRange: string;
  durationRange: string;
  campaigns: string[];
}

interface CallHistoryFilterBarProps {
  filters: CallHistoryFilterState;
  onFilterChange: (filters: CallHistoryFilterState) => void;
  availableCampaigns?: string[];
}

const VERDICT_OPTIONS = [
  { label: 'Interested', value: 'interested', color: 'bg-green-500' },
  { label: 'Not Interested', value: 'not_interested', color: 'bg-red-500' },
  { label: 'Callback', value: 'callback', color: 'bg-blue-500' },
  { label: 'No Answer', value: 'no_answer', color: 'bg-gray-500' },
  { label: 'In Progress', value: 'conversation', color: 'bg-yellow-500' },
];

const QUALITY_OPTIONS = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Abrupt End', value: 'abrupt_end' },
];

const TIME_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'week' },
  { label: 'Last 30 Days', value: 'month' },
];

const DURATION_OPTIONS = [
  { label: 'All Durations', value: 'all' },
  { label: 'Short (< 1 min)', value: 'short' },
  { label: 'Medium (1-5 min)', value: 'medium' },
  { label: 'Long (> 5 min)', value: 'long' },
];

export function CallHistoryFilterBar({ 
  filters, 
  onFilterChange,
  availableCampaigns = [],
}: CallHistoryFilterBarProps) {
  const toggleVerdict = (value: string) => {
    const newVerdicts = filters.verdicts.includes(value)
      ? filters.verdicts.filter(v => v !== value)
      : [...filters.verdicts, value];
    onFilterChange({ ...filters, verdicts: newVerdicts });
  };

  const toggleQuality = (value: string) => {
    const newQualities = filters.qualities.includes(value)
      ? filters.qualities.filter(q => q !== value)
      : [...filters.qualities, value];
    onFilterChange({ ...filters, qualities: newQualities });
  };

  const toggleCampaign = (value: string) => {
    const newCampaigns = filters.campaigns.includes(value)
      ? filters.campaigns.filter(c => c !== value)
      : [...filters.campaigns, value];
    onFilterChange({ ...filters, campaigns: newCampaigns });
  };

  const clearFilters = () => {
    onFilterChange({
      verdicts: [],
      qualities: [],
      hasConversation: false,
      search: '',
      timeRange: 'all',
      durationRange: 'all',
      campaigns: [],
    });
  };

  const activeCount = 
    filters.verdicts.length + 
    filters.qualities.length + 
    (filters.hasConversation ? 1 : 0) + 
    (filters.timeRange !== 'all' ? 1 : 0) +
    (filters.durationRange !== 'all' ? 1 : 0) +
    filters.campaigns.length;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Unified Glass Island (High Contrast) */}
      <div className="flex items-center bg-muted/20 backdrop-blur-xl border border-border/20 rounded-full h-9 px-1.5 gap-1 shadow-sm overflow-hidden">
        {/* Seamless Search */}
        <div className="relative flex-1 min-w-[140px] group h-full flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground/50 group-focus-within:text-foreground transition-colors" />
          <Input
            placeholder="Search calls..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9 bg-transparent border-none focus-visible:ring-0 h-full text-[12px] placeholder:text-muted-foreground/60 shadow-none ring-offset-0"
          />
        </div>

        <div className="w-[1px] h-4 bg-border/20 mx-1" />

        {/* Verdict Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn(
              'h-7 gap-1.5 hover:bg-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
              filters.verdicts.length > 0 ? 'text-foreground' : 'text-foreground/80',
            )}>
              <Activity className="w-3 h-3 transition-colors" />
              Outcome
              {filters.verdicts.length > 0 && (
                <div className="flex gap-0.5 ml-0.5 animate-in fade-in zoom-in-50 duration-300">
                  {filters.verdicts.map(v => (
                    <div key={v} className={cn('w-1 h-1 rounded-full', VERDICT_OPTIONS.find(o => o.value === v)?.color)} />
                  ))}
                </div>
              )}
              <ChevronDown className="w-2.5 h-2.5 opacity-20" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background/98 backdrop-blur-xl border-border/20 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/40 px-3 py-2">Outcomes</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/10" />
            {VERDICT_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={filters.verdicts.includes(opt.value)}
                onCheckedChange={() => toggleVerdict(opt.value)}
                className="text-xs px-3 py-2 cursor-pointer focus:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.2)]', opt.color)} />
                  {opt.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quality Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn(
              'h-7 gap-1.5 hover:bg-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
              filters.qualities.length > 0 ? 'text-foreground' : 'text-foreground/80',
            )}>
              <Zap className="w-3 h-3 transition-colors" />
              Quality
              {filters.qualities.length > 0 && <div className="w-1 h-1 rounded-full bg-primary ml-0.5 animate-in fade-in zoom-in-50 duration-300" />}
              <ChevronDown className="w-2.5 h-2.5 opacity-20" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background/98 backdrop-blur-xl border-border/20 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/40 px-3 py-2">Call Quality</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/10" />
            {QUALITY_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={filters.qualities.includes(opt.value)}
                onCheckedChange={() => toggleQuality(opt.value)}
                className="text-xs px-3 py-2 cursor-pointer focus:bg-muted/50"
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Duration Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn(
              'h-7 gap-1.5 hover:bg-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
              filters.durationRange !== 'all' ? 'text-foreground' : 'text-foreground/80',
            )}>
              <Clock className="w-3 h-3 transition-colors" />
              Duration
              <ChevronDown className="w-2.5 h-2.5 opacity-20" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background/98 backdrop-blur-xl border-border/20 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/40 px-3 py-2">Call Duration</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/10" />
            <DropdownMenuRadioGroup value={filters.durationRange} onValueChange={(v) => onFilterChange({ ...filters, durationRange: v })}>
              {DURATION_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs px-3 py-2 cursor-pointer focus:bg-muted/50">
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Time Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn(
              'h-7 gap-1.5 hover:bg-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
              filters.timeRange !== 'all' ? 'text-foreground' : 'text-foreground/80',
            )}>
              <Calendar className="w-3 h-3 transition-colors" />
              {TIME_OPTIONS.find(o => o.value === filters.timeRange)?.label || 'Time'}
              <ChevronDown className="w-2.5 h-2.5 opacity-20" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background/98 backdrop-blur-xl border-border/20 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/40 px-3 py-2">Time Horizon</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/10" />
            <DropdownMenuRadioGroup value={filters.timeRange} onValueChange={(v) => onFilterChange({ ...filters, timeRange: v })}>
              {TIME_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs px-3 py-2 cursor-pointer focus:bg-muted/50">
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Campaign Filter (if campaigns available) */}
        {availableCampaigns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={cn(
                'h-7 gap-1.5 hover:bg-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
                filters.campaigns.length > 0 ? 'text-foreground' : 'text-foreground/80',
              )}>
                <FolderOpen className="w-3 h-3 transition-colors" />
                Campaign
                {filters.campaigns.length > 0 && (
                  <span className="ml-0.5 text-[9px] font-mono">({filters.campaigns.length})</span>
                )}
                <ChevronDown className="w-2.5 h-2.5 opacity-20" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background/98 backdrop-blur-xl border-border/20 shadow-2xl max-h-64 overflow-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/40 px-3 py-2">Campaigns</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/10" />
              {availableCampaigns.map((campaign) => (
                <DropdownMenuCheckboxItem
                  key={campaign}
                  checked={filters.campaigns.includes(campaign)}
                  onCheckedChange={() => toggleCampaign(campaign)}
                  className="text-xs px-3 py-2 cursor-pointer focus:bg-muted/50"
                >
                  {campaign}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="w-[1px] h-4 bg-border/20 mx-1" />

        {/* Connected Filter */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({ ...filters, hasConversation: !filters.hasConversation })}
          className={cn(
            'h-7 gap-1.5 hover:bg-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-wider px-3 transition-all',
            filters.hasConversation ? 'text-primary hover:text-primary hover:bg-primary/5' : 'text-foreground/80',
          )}
        >
          <Activity className="w-3 h-3 transition-colors" />
          Connected
        </Button>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 w-7 p-0 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 text-muted-foreground/20 rounded-full transition-all ml-1"
            title="Clear all filters"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
