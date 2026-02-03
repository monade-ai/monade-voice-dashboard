// app/dashboard/components/dashboard-header.tsx

import React from 'react';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardHeaderProps {
  title: string;
  dateRange: string;
  onDateRangeChange?: (dateRange: string) => void;
  groupBy: string;
  onGroupByChange?: (groupBy: string) => void;
  assistantFilter: string;
  onAssistantFilterChange?: (filter: string) => void;
}

export function DashboardHeader({
  title,
  dateRange,
  onDateRangeChange: _onDateRangeChange,
  groupBy,
  onGroupByChange,
  assistantFilter,
  onAssistantFilterChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-amber-700">{title}</h1>
      
      <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <Button
          variant="outline"
          className="h-10 px-4 py-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
          <span>{dateRange}</span>
        </Button>
        
        <Select
          value={groupBy}
          onValueChange={onGroupByChange}
        >
          <SelectTrigger className="w-32 h-10 bg-white border-gray-300 text-gray-700">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300 text-gray-700">
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={assistantFilter}
          onValueChange={onAssistantFilterChange}
        >
          <SelectTrigger className="w-48 h-10 bg-white border-gray-300 text-gray-700">
            <SelectValue placeholder="Filter by Assistant" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300 text-gray-700">
            <SelectItem value="all">All Assistants</SelectItem>
            <SelectItem value="new">New Assistant</SelectItem>
            <SelectItem value="unknown">Unknown Assistant</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
