// components/tab-views/call-management/components/insights/time-of-day-chart.tsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * Enhanced time of day chart showing call success rate and volume
 */
export default function TimeOfDayChart({ data }) {
  // Find the max volume for scaling
  const maxVolume = Math.max(...data.map(item => item.volume));
  
  // Format hour to AM/PM
  const formatHour = (hour) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${h}${period}`;
  };
  
  return (
    <div className="bg-gray-50 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
            <span className="text-xs text-gray-500">Success Rate</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>
            <span className="text-xs text-gray-500">Call Volume</span>
          </div>
        </div>
      </div>
      
      <div className="h-64 flex items-end space-x-1">
        {data.map((hourData, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            {/* Tooltip */}
            <div className="relative group">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-10 bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                {hourData.hour > 12 ? hourData.hour - 12 : hourData.hour === 0 ? 12 : hourData.hour}
                {hourData.hour >= 12 ? 'PM' : 'AM'}: {Math.round(hourData.rate * 100)}% success, {hourData.volume} calls
              </div>
            </div>
            
            {/* Volume bar */}
            <motion.div 
              className="w-full"
              initial={{ height: 0 }}
              animate={{ height: `${(hourData.volume / maxVolume) * 160}px` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <div 
                className="bg-amber-500/30 rounded-t-sm w-full mx-auto"
                style={{ height: `${(hourData.volume / maxVolume) * 160}px`, maxWidth: '80%' }}
              >
                <div 
                  className="bg-amber-500 h-full rounded-t-sm"
                  style={{ opacity: hourData.rate }}
                ></div>
              </div>
            </motion.div>
            
            {/* Success rate - battery indicator */}
            <motion.div 
              className={`w-5 h-10 rounded-md border border-gray-300 mt-2 mb-1 relative ${
                hourData.rate > 0.7 ? 'bg-blue-500/20' : 
                hourData.rate > 0.4 ? 'bg-blue-400/20' : 
                'bg-blue-300/20'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
            >
              {/* Battery level */}
              <div className="absolute inset-0.5 rounded-sm overflow-hidden">
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-sm"
                  initial={{ height: 0 }}
                  animate={{ height: `${hourData.rate * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                ></motion.div>
              </div>
            </motion.div>
            
            {/* Hour label */}
            <div className="text-xs text-gray-500 mt-1">
              {formatHour(hourData.hour)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}