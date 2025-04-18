// components/tab-views/call-management/components/day-selector.tsx
import React from 'react';
import { motion } from 'framer-motion';

type DayId = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

interface DaySelectorProps {
  selectedDays: any;
  onDayToggle: (day: any) => void;
}

/**
 * Android-style day selector component with circular toggles
 */
export default function DaySelector({ selectedDays, onDayToggle }: DaySelectorProps) {
  const weekDays = [
    { id: 'sun', label: 'S', fullName: 'Sunday' },
    { id: 'mon', label: 'M', fullName: 'Monday' },
    { id: 'tue', label: 'T', fullName: 'Tuesday' },
    { id: 'wed', label: 'W', fullName: 'Wednesday' },
    { id: 'thu', label: 'T', fullName: 'Thursday' },
    { id: 'fri', label: 'F', fullName: 'Friday' },
    { id: 'sat', label: 'S', fullName: 'Saturday' },
  ];
  
  return (
    <div className="flex flex-wrap space-x-2">
      {weekDays.map(day => {
        const isSelected = selectedDays.includes(day.id);
        
        return (
          <motion.button
            key={day.id}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors relative ${
              isSelected 
                ? 'text-white' 
                : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => onDayToggle(day.id)}
            whileTap={{ scale: 0.95 }}
            title={day.fullName}
          >
            {isSelected && (
              <motion.div 
                className="absolute inset-0 bg-amber-600 rounded-full"
                layoutId={`selected-day-${day.id}`}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className={`z-10 ${isSelected ? 'text-white' : ''}`}>{day.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}