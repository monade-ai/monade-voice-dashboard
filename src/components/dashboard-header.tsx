// app/dashboard/components/dashboard-header.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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
  onDateRangeChange,
  groupBy,
  onGroupByChange,
  assistantFilter,
  onAssistantFilterChange,
}: DashboardHeaderProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleCalendarSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    setDate(date);
    
    const newEndDate = date;
    const newStartDate = subDays(date, 7);
    
    const newDateRange = `${format(newStartDate, 'MM/dd/yyyy')} - ${format(newEndDate, 'MM/dd/yyyy')}`;
    
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
    
    setCalendarOpen(false);
  }, [onDateRangeChange]);

  const setPresetRange = useCallback((days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    
    const newDateRange = `${format(start, 'MM/dd/yyyy')} - ${format(end, 'MM/dd/yyyy')}`;
    
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
  }, [onDateRangeChange]);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      
      <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4 py-2 justify-start w-full md:w-auto"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              <span>{dateRange}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Select date range</h3>
              </div>
              <div className="flex mt-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPresetRange(7)}
                  className="text-xs"
                >
                  Last 7 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPresetRange(30)}
                  className="text-xs"
                >
                  Last 30 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPresetRange(90)}
                  className="text-xs"
                >
                  Last 90 days
                </Button>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleCalendarSelect}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Select
          value={groupBy}
          onValueChange={(value) => onGroupByChange && onGroupByChange(value)}
        >
          <SelectTrigger className="w-32 h-10">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={assistantFilter}
          onValueChange={(value) => onAssistantFilterChange && onAssistantFilterChange(value)}
        >
          <SelectTrigger className="w-48 h-10">
            <SelectValue placeholder="Filter by Assistant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assistants</SelectItem>
            <SelectItem value="new">New Assistant</SelectItem>
            <SelectItem value="unknown">Unknown Assistant</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}