// components/tab-views/call-management/components/month-calendar.tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * AirBnB-style date range calendar component
 */
export default function MonthCalendar({ month, schedules, selectedRange, onDateSelect }) {
  // Get calendar days for the current month view
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    let firstDayOfWeek = firstDay.getDay();
    // Adjust for week starting on Monday
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Add days from previous month to fill the first week
    const prevMonthLastDay = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(month.getFullYear(), month.getMonth() - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isSelected: isDateInRange(date, selectedRange),
        hasSchedule: hasScheduleOnDate(date, schedules)
      });
    }
    
    // Add days for current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(month.getFullYear(), month.getMonth(), i);
      days.push({
        date,
        isCurrentMonth: true,
        isSelected: isDateInRange(date, selectedRange),
        hasSchedule: hasScheduleOnDate(date, schedules)
      });
    }
    
    // Add days for next month to complete the grid (always show 6 weeks)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(month.getFullYear(), month.getMonth() + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isSelected: isDateInRange(date, selectedRange),
        hasSchedule: hasScheduleOnDate(date, schedules)
      });
    }
    
    return days;
  }, [month, schedules, selectedRange]);
  
  // Check if a date is in the selected range
  function isDateInRange(date, range) {
    if (!range || !range.start || !range.end) return false;
    
    const formattedDate = date.toDateString();
    const startDate = new Date(range.start).toDateString();
    const endDate = new Date(range.end).toDateString();
    
    return formattedDate >= startDate && formattedDate <= endDate;
  }
  
  // Check if a date has a schedule
  function hasScheduleOnDate(date, schedules) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const formattedDate = date.toDateString();
    
    return schedules.some(schedule => {
      // Check for recurring schedules on this day of week
      if (schedule.days.includes(dayOfWeek) && schedule.isActive) {
        return true;
      }
      
      // Check for specific date schedules
      if (schedule.dateRange && schedule.isActive) {
        const scheduleStart = new Date(schedule.dateRange.start).toDateString();
        const scheduleEnd = new Date(schedule.dateRange.end).toDateString();
        
        return formattedDate >= scheduleStart && formattedDate <= scheduleEnd;
      }
      
      return false;
    });
  }
  
  // Handle date selection (AirBnB style)
  const handleDateClick = (day) => {
    if (!selectedRange || !selectedRange.start || (selectedRange.start && selectedRange.end)) {
      // Start a new selection
      onDateSelect({
        start: day.date,
        end: null
      });
    } else {
      // Complete the selection
      // Ensure end date is after start date
      if (day.date < selectedRange.start) {
        onDateSelect({
          start: day.date,
          end: selectedRange.start
        });
      } else {
        onDateSelect({
          start: selectedRange.start,
          end: day.date
        });
      }
    }
  };
  
  // Group calendar days into weeks
  const calendarWeeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7));
  }
  
  // Get month name and year
  const monthName = month.toLocaleDateString('en-US', { month: 'long' });
  const year = month.getFullYear();
  
  return (
    <div className="bg-white rounded-lg mt-2">
      <div className="text-center mb-2 font-medium text-sm text-gray-700">
        {monthName} {year}
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day, i) => (
          <div key={i} className="text-xs text-gray-500 text-center py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="text-sm">
        {calendarWeeks.slice(0, 6).map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className={`relative h-9 flex items-center justify-center ${
                  !day.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <button
                  onClick={() => handleDateClick(day)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full relative ${
                    day.isSelected 
                      ? 'text-white' 
                      : day.isCurrentMonth 
                        ? 'hover:bg-gray-100' 
                        : 'hover:bg-gray-50'
                  }`}
                >
                  {day.isSelected && (
                    <motion.div 
                      className="absolute inset-0 bg-blue-600 rounded-full"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  
                  <span className={`z-10 ${day.isSelected ? 'text-white' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  
                  {/* Schedule indicator dot */}
                  {day.hasSchedule && !day.isSelected && (
                    <div className="absolute bottom-0 h-1 w-1 bg-green-500 rounded-full" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Selected date info */}
      {selectedRange && selectedRange.start && (
        <div className="mt-2 text-xs text-blue-600 font-medium">
          {selectedRange.start && selectedRange.end 
            ? `${selectedRange.start.toLocaleDateString()} - ${selectedRange.end.toLocaleDateString()}`
            : `${selectedRange.start.toLocaleDateString()} - Select end date`
          }
        </div>
      )}
    </div>
  );
}