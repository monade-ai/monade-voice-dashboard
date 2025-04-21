// app/dashboard/components/date-range-picker.tsx

import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: string;
  onDateRangeChange: (dateRange: string) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  // Parse initial date range
  const getInitialDateRange = (): DateRange => {
    try {
      const [startStr, endStr] = dateRange.split(' - ');
      
      if (!startStr || !endStr) {
        const today = new Date();

        return {
          from: subDays(today, 30),
          to: today,
        };
      }
      
      const startParts = startStr.split('/');
      const endParts = endStr.split('/');
      
      if (startParts.length !== 3 || endParts.length !== 3) {
        const today = new Date();

        return {
          from: subDays(today, 30),
          to: today,
        };
      }
      
      return {
        from: new Date(
          parseInt(startParts[2]), 
          parseInt(startParts[0]) - 1, 
          parseInt(startParts[1]),
        ),
        to: new Date(
          parseInt(endParts[2]), 
          parseInt(endParts[0]) - 1, 
          parseInt(endParts[1]),
        ),
      };
    } catch (error) {
      console.error('Error parsing date range:', error);
      const today = new Date();

      return {
        from: subDays(today, 30),
        to: today,
      };
    }
  };

  const [date, setDate] = useState<DateRange | undefined>(getInitialDateRange());
  const [open, setOpen] = useState(false);

  // Handle date range selection
  const handleDateSelection = (range: DateRange | undefined) => {
    setDate(range);
    
    if (range?.from && range?.to) {
      const formattedRange = `${format(range.from, 'MM/dd/yyyy')} - ${format(range.to, 'MM/dd/yyyy')}`;
      onDateRangeChange(formattedRange);
    }
  };

  // Handle preset selections
  const selectPreset = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    
    setDate({ from, to });
    
    const formattedRange = `${format(from, 'MM/dd/yyyy')} - ${format(to, 'MM/dd/yyyy')}`;
    onDateRangeChange(formattedRange);
    
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-10 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
          <span>{dateRange}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white" align="start">
        <div className="p-3 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Select date range</h3>
          </div>
          <div className="flex mt-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectPreset(7)}
              className="text-xs bg-white"
            >
              Last 7 days
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectPreset(30)}
              className="text-xs bg-white"
            >
              Last 30 days
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectPreset(90)}
              className="text-xs bg-white"
            >
              Last 90 days
            </Button>
          </div>
        </div>
        <Calendar
          mode="range"
          selected={date}
          onSelect={handleDateSelection}
          disabled={(date) => date > new Date()}
          numberOfMonths={2}
          initialFocus
          className="p-3"
        />
        <div className="p-3 border-t border-gray-200 flex justify-end">
          <Button 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}