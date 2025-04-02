// app/dashboard/components/dashboard-header.tsx

import React, { useState } from 'react';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { format, subDays } from 'date-fns';

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

  // Parse the current date range
  const parseDateRange = () => {
    try {
      const [startStr, endStr] = dateRange.split(' - ');
      if (!startStr || !endStr) return [new Date(), new Date()];
      
      const startParts = startStr.split('/');
      const endParts = endStr.split('/');
      
      if (startParts.length !== 3 || endParts.length !== 3) return [new Date(), new Date()];
      
      const startDate = new Date(
        parseInt(startParts[2]), 
        parseInt(startParts[0]) - 1, 
        parseInt(startParts[1])
      );
      
      const endDate = new Date(
        parseInt(endParts[2]), 
        parseInt(endParts[0]) - 1, 
        parseInt(endParts[1])
      );
      
      return [startDate, endDate];
    } catch (error) {
      console.error("Error parsing date range:", error);
      return [new Date(), new Date()];
    }
  };

  const [startDate, endDate] = parseDateRange();

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    setDate(date);
    
    // Create a new date range (7 days)
    const newEndDate = date;
    const newStartDate = subDays(date, 7);
    
    const newDateRange = `${format(newStartDate, 'MM/dd/yyyy')} - ${format(newEndDate, 'MM/dd/yyyy')}`;
    
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
    
    setCalendarOpen(false);
  };

  // Set predefined date ranges
  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    
    const newDateRange = `${format(start, 'MM/dd/yyyy')} - ${format(end, 'MM/dd/yyyy')}`;
    
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-amber-700">{title}</h1>
      
      <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4 py-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 justify-start w-full md:w-auto"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
              <span>{dateRange}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="end">
            <div className="p-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-700">Select date range</h3>
              </div>
              <div className="flex mt-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPresetRange(7)}
                  className="text-xs bg-white"
                >
                  Last 7 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPresetRange(30)}
                  className="text-xs bg-white"
                >
                  Last 30 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPresetRange(90)}
                  className="text-xs bg-white"
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
          onValueChange={(value) => onAssistantFilterChange && onAssistantFilterChange(value)}
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