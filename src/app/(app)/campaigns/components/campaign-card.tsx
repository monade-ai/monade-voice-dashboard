'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  Square,
  MoreVertical,
  Calendar,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Campaign,
  CampaignStatus,
  canStartCampaign,
  canPauseCampaign,
  canStopCampaign,
  getCampaignProgress,
} from '@/types/campaign.types';

interface CampaignCardProps {
  campaign: Campaign;
  onStart?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onStop?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  disabled?: boolean;
}

const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; pulse?: boolean }> = {
  pending: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', pulse: true },
  paused: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
  stopped: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
  completed: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
};

export function CampaignCard({
  campaign,
  onStart,
  onPause,
  onStop,
  onDelete,
  disabled = false,
}: CampaignCardProps) {
  const router = useRouter();

  const statusStyle = STATUS_STYLES[campaign.status];
  const progress = getCampaignProgress(campaign);

  const handleViewDetails = () => {
    router.push(`/campaigns/${campaign.id}`);
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold truncate cursor-pointer hover:text-primary"
                onClick={handleViewDetails}
              >
                {campaign.name}
              </h3>
              <Badge
                variant="secondary"
                className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.pulse ? 'animate-pulse' : ''}`}
              >
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-sm text-muted-foreground truncate">
                {campaign.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>
                View Details
              </DropdownMenuItem>
              {canStartCampaign(campaign.status) && onStart && (
                <DropdownMenuItem onClick={() => onStart(campaign)}>
                  Start Campaign
                </DropdownMenuItem>
              )}
              {canPauseCampaign(campaign.status) && onPause && (
                <DropdownMenuItem onClick={() => onPause(campaign)}>
                  Pause Campaign
                </DropdownMenuItem>
              )}
              {canStopCampaign(campaign.status) && onStop && (
                <DropdownMenuItem onClick={() => onStop(campaign)}>
                  Stop Campaign
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(campaign)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Campaign
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar (for active/completed campaigns) */}
        {campaign.total_contacts > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-green-600">
                {campaign.successful_calls} successful
              </span>
              <span>{progress.statusLabel}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{campaign.total_contacts} contacts</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {campaign.daily_start_time} - {campaign.daily_end_time}
            </span>
          </div>
        </div>

        {/* Created Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
            </span>
          </div>
          {campaign.started_at && (
            <span>
              Started {formatDistanceToNow(new Date(campaign.started_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2">
          {canStartCampaign(campaign.status) && onStart && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onStart(campaign)}
              disabled={disabled || campaign.total_contacts === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {canPauseCampaign(campaign.status) && onPause && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onPause(campaign)}
              disabled={disabled}
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {canStopCampaign(campaign.status) && onStop && (
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => onStop(campaign)}
              disabled={disabled}
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleViewDetails}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
