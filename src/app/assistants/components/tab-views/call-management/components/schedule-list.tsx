import React from 'react';
import { Clock, Calendar, Zap, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Component to display the list of scheduled calls
 */
export default function ScheduleList({ 
  schedules, 
  formatTime, 
  getContactDisplay, 
  onToggleActive, 
  onDelete, 
}) {
  // Function to get day labels for display
  const getDayLabels = (days) => {
    if (days.length === 0) return 'One-time';
    if (days.length === 7) return 'Daily';
    if (days.length === 5 && 
        days.includes('mon') && 
        days.includes('tue') && 
        days.includes('wed') && 
        days.includes('thu') && 
        days.includes('fri')) return 'Weekdays';
    
    if (days.length <= 3) {
      return days.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
    }
    
    return `${days.length} days/week`;
  };
  
  // Function to format date range
  const formatDateRange = (dateRange) => {
    if (!dateRange) return '';
    
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    const formatOptions = { month: 'short', day: 'numeric' };
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { month: 'short' as const, day: 'numeric' as const });
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short' as const, day: 'numeric' as const })} - ${end.toLocaleDateString('en-US', { month: 'short' as const, day: 'numeric' as const })}`;
  };
  
  // Sort schedules: active first, then by time
  const sortedSchedules = [...schedules].sort((a, b) => {
    if (a.isActive !== b.isActive) return b.isActive ? 1 : -1;

    return a.time.localeCompare(b.time);
  });
  
  return (
    <div className="space-y-3">
      <AnimatedScheduleList schedules={sortedSchedules} />
    </div>
  );
  
  function AnimatedScheduleList({ schedules }) {
    return (
      <>
        {schedules.length === 0 ? (
          <div className="text-sm text-[#39594D] text-center py-8">
            No schedules created yet
          </div>
        ) : (
          schedules.map(schedule => (
            <motion.div
              key={schedule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              layout
              className={`bg-[#F5F6FA] border border-[#E5E5E0] rounded-lg p-3 flex items-center justify-between transition-opacity ${
                schedule.isActive ? '' : 'opacity-60'
              }`}
              style={{ borderColor: getContactDisplay(schedule).color + '60' }}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: getContactDisplay(schedule).color }}
                >
                  {schedule.contactList === 'individual' 
                    ? schedule.contactName?.charAt(0) 
                    : getContactDisplay(schedule).name.charAt(0)}
                </div>
                
                <div>
                  <div className="font-medium text-sm">
                    {schedule.contactList === 'individual' 
                      ? schedule.contactName 
                      : getContactDisplay(schedule).name}
                    {schedule.contactList === 'individual' && (
                      <span className="ml-2 text-xs font-normal text-[#39594D]">
                        {schedule.contactEmail}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-xs text-[#39594D] space-x-3 mt-1">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{formatTime(schedule.time)}</span>
                    </div>
                    
                    {schedule.days.length > 0 && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{getDayLabels(schedule.days)}</span>
                      </div>
                    )}
                    
                    {schedule.dateRange && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDateRange(schedule.dateRange)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  className={`rounded-full p-2 ${
                    schedule.isActive 
                      ? 'bg-[#39594D] text-white hover:bg-[#3A8DFF]' 
                      : 'bg-[#E5E5E0] text-[#39594D] hover:bg-[#3A8DFF]'
                  }`}
                  onClick={() => onToggleActive(schedule.id)}
                >
                  <Zap className="h-4 w-4" />
                </button>
                
                <button 
                  className="rounded-full p-2 bg-[#E25D41] text-white hover:bg-[#FF7759]"
                  onClick={() => onDelete(schedule.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </>
    );
  }
}
