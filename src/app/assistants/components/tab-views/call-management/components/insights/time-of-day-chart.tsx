// components/tab-views/call-management/components/insights/time-of-day-chart.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

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
    <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1.5"></span>
            <span className="text-xs font-medium text-gray-700">Success Rate</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1.5"></span>
            <span className="text-xs font-medium text-gray-700">Call Volume</span>
          </div>
        </div>
        <div className="flex items-center">
          <Info className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-xs text-gray-500">Hover for details</span>
        </div>
      </div>
      
      <div className="h-64 flex items-end space-x-1">
        {data.map((hourData, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            {/* Enhanced Tooltip */}
            <div className="relative group z-10">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-10 bg-gray-800 text-white text-xs px-3.5 py-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20">
                <div className="font-semibold text-center mb-1.5 text-sm">
                  {hourData.hour > 12 ? hourData.hour - 12 : hourData.hour === 0 ? 12 : hourData.hour}
                  {hourData.hour >= 12 ? 'PM' : 'AM'}
                </div>
                <div className="flex items-center mb-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></span>
                  <span>Success: <strong className="text-blue-300">{Math.round(hourData.rate * 100)}%</strong></span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span>
                  <span>Volume: <strong className="text-amber-300">{hourData.volume}</strong> calls</span>
                </div>
                <div className="absolute w-2.5 h-2.5 bg-gray-800 transform rotate-45 left-1/2 -ml-1.25 -bottom-1"></div>
              </div>
            </div>
            
            {/* Volume bar - Enhanced */}
            <motion.div 
              className="w-full group cursor-pointer"
              initial={{ height: 0 }}
              animate={{ height: `${(hourData.volume / maxVolume) * 160}px` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              <div 
                className="bg-amber-500/30 rounded-t-md w-full mx-auto relative group-hover:ring-2 group-hover:ring-amber-300 transition-all"
                style={{ height: `${(hourData.volume / maxVolume) * 160}px`, maxWidth: '80%' }}
              >
                <div 
                  className="bg-amber-500 h-full rounded-t-md"
                  style={{ opacity: hourData.rate }}
                ></div>
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
                  {hourData.volume}
                </div>
              </div>
            </motion.div>
            
            {/* Success rate - battery indicator - Enhanced */}
            <motion.div 
              className={`w-6 h-12 rounded-md border border-gray-300 mt-2 mb-1 relative group cursor-pointer ${
                hourData.rate > 0.7 ? 'bg-blue-500/20 border-blue-400' : 
                  hourData.rate > 0.4 ? 'bg-blue-400/20 border-blue-300' : 
                    'bg-blue-300/20 border-blue-200'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              whileHover={{ scale: 1.1 }}
            >
              {/* Battery level */}
              <div className="absolute inset-0.5 rounded-sm overflow-hidden">
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 rounded-sm ${
                    hourData.rate > 0.7 ? 'bg-blue-600' : 
                      hourData.rate > 0.4 ? 'bg-blue-500' : 
                        'bg-blue-400'
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: `${hourData.rate * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                ></motion.div>
              </div>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
                {Math.round(hourData.rate * 100)}%
              </div>
            </motion.div>
            
            {/* Hour label */}
            <div className="text-xs font-medium text-gray-700 mt-1">
              {formatHour(hourData.hour)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}