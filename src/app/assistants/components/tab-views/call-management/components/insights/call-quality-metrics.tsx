// components/tab-views/call-management/components/insights/call-quality-metrics.tsx
import React from 'react';
import { Volume2, Clock, Check, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Component to display call quality metrics
 */
export default function CallQualityMetrics({ data }: { data: any }) {
  // Quality metrics with icons and descriptions
  const metrics = [
    {
      id: 'audioClarity',
      name: 'Audio Clarity',
      value: data.audioClarity,
      icon: Volume2,
      color: 'blue',
      description: 'Voice clarity and absence of background noise',
    },
    {
      id: 'responseTime',
      name: 'Response Time',
      value: data.responseTime,
      icon: Clock,
      color: 'green',
      description: 'Time taken to respond to customer queries',
    },
    {
      id: 'accuracyRate',
      name: 'Accuracy Rate',
      value: data.accuracyRate,
      icon: Check,
      color: 'purple',
      description: 'Correctness of information provided',
    },
    {
      id: 'naturalConversation',
      name: 'Natural Conversation',
      value: data.naturalConversation,
      icon: MessageSquare,
      color: 'amber',
      description: 'How natural the conversation flow feels',
    },
  ];
  
  // Sample technical details
  const technicalMetrics = [
    { name: 'Network Latency', value: '42ms', trend: 'down', isGood: true },
    { name: 'Packet Loss', value: '0.3%', trend: 'down', isGood: true },
    { name: 'Bandwidth Usage', value: '86kb/s', trend: 'stable', isGood: true },
    { name: 'Background Noise', value: '-42dB', trend: 'down', isGood: true },
    { name: 'Voice Clarity', value: '96%', trend: 'up', isGood: true },
  ];
  
  return (
    <div className="space-y-6">
      {/* Main quality metrics */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            className="bg-white rounded-lg p-4 border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className={`p-2 rounded-full bg-${metric.color}-100 text-${metric.color}-600 mr-3`}>
                  <metric.icon className="h-4 w-4" />
                </div>
                <div className="text-sm font-medium text-gray-700">{metric.name}</div>
              </div>
              <div className={`text-lg font-bold text-${metric.color}-600`}>{metric.value}%</div>
            </div>
            
            <div className="text-xs text-gray-500 mb-2">{metric.description}</div>
            
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full bg-${metric.color}-500`}
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Trend chart */}
      <div className="bg-white rounded-lg p-5 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Quality Metrics Over Time</h4>
        
        <div className="h-64">
          <div className="flex h-56 border-b border-l border-gray-200 relative">
            {/* Y-axis labels */}
            <div className="absolute -left-7 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
              <div>100%</div>
              <div>75%</div>
              <div>50%</div>
              <div>25%</div>
              <div>0%</div>
            </div>
            
            {/* Horizontal grid lines */}
            <div className="absolute inset-0">
              <div className="h-1/4 border-t border-gray-100"></div>
              <div className="h-1/4 border-t border-gray-100"></div>
              <div className="h-1/4 border-t border-gray-100"></div>
              <div className="h-1/4 border-t border-gray-100"></div>
            </div>
            
            {/* Chart content */}
            <div className="flex-1 flex">
              {data.trends.map((day, dayIndex) => (
                <div key={dayIndex} className="flex-1 relative">
                  {metrics.map((metric, metricIndex) => {
                    const nextDay = data.trends[dayIndex + 1];
                    if (!nextDay) return null;
                    
                    const currentValue = day[metric.id];
                    const nextValue = nextDay[metric.id];
                    
                    return (
                      <React.Fragment key={metric.id}>
                        {/* Current day point */}
                        <motion.div 
                          className={`absolute w-3 h-3 rounded-full border-2 border-white bg-${metric.color}-500 shadow-sm`}
                          style={{ 
                            bottom: `${currentValue}%`, 
                            left: '50%',
                            marginLeft: -6,
                            zIndex: 10,
                          }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.5 + metricIndex * 0.1 + dayIndex * 0.05 }}
                        />
                        
                        {/* Line to next day */}
                        <svg className="absolute bottom-0 left-1/2 w-full h-full" style={{ zIndex: 5 }}>
                          <motion.line
                            x1="0"
                            y1={`${56 - (currentValue * 56 / 100)}%`}
                            x2="100%"
                            y2={`${56 - (nextValue * 56 / 100)}%`}
                            stroke={`var(--tw-colors-${metric.color}-500)`}
                            strokeWidth="2"
                            strokeDasharray="100"
                            strokeDashoffset="100"
                            initial={{ strokeDashoffset: 100 }}
                            animate={{ strokeDashoffset: 0 }}
                            transition={{ duration: 1, delay: 0.8 + metricIndex * 0.1 + dayIndex * 0.05 }}
                          />
                        </svg>
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
            {data.trends.map((_, i) => (
              <div key={i}>Day {i + 1}</div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-2">
          {metrics.map((metric) => (
            <div key={metric.id} className="flex items-center">
              <div className={`w-3 h-3 rounded-full bg-${metric.color}-500 mr-1`}></div>
              <span className="text-xs text-gray-600">{metric.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Technical metrics */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Technical Quality Metrics</h4>
        
        <div className="grid grid-cols-3 gap-3">
          {technicalMetrics.map((metric, index) => (
            <motion.div 
              key={index}
              className="bg-white rounded-lg p-3 shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="text-xs text-gray-500">{metric.name}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-sm font-medium text-gray-800">{metric.value}</div>
                <div className={`flex items-center text-xs ${
                  metric.isGood ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend === 'up' && (
                    <svg className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                  {metric.trend === 'down' && (
                    <svg className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {metric.trend === 'stable' && (
                    <svg className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                    </svg>
                  )}
                  <span>{metric.trend}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}