import React from 'react';
import { PhoneOff, AlertTriangle, CheckCircle, FileText, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Component to display analysis of call disconnect reasons
 */
export default function DisconnectReasons({ data }) {
  // Render icon based on disconnect reason type
  const getReasonIcon = (reason) => {
    if (reason.includes('hung up')) return PhoneOff;
    if (reason.includes('transferred')) return Phone;
    if (reason.includes('resolved')) return CheckCircle;
    if (reason.includes('error')) return AlertTriangle;
    if (reason.includes('follow-up')) return FileText;
    return PhoneOff;
  };
  
  // Get color based on reason type
  const getReasonColor = (reason) => {
    if (reason.includes('hung up')) return 'red';
    if (reason.includes('transferred')) return 'blue';
    if (reason.includes('resolved')) return 'green';
    if (reason.includes('error')) return 'amber';
    if (reason.includes('follow-up')) return 'purple';
    return 'gray';
  };
  
  // Sample recommendations based on disconnect reasons
  const recommendations = [
    {
      id: 1,
      title: "Reduce hang-up rate",
      description: "Enhance initial call engagement to reduce customer hang-up rate by 10%",
      metric: "37.5% of calls",
      priority: "High"
    },
    {
      id: 2,
      title: "Improve technical reliability",
      description: "Address common technical issues causing call disconnections",
      metric: "9.4% of calls",
      priority: "Medium"
    },
    {
      id: 3,
      title: "Optimize call transfers",
      description: "Improve hand-off process for transferred calls",
      metric: "25% of calls",
      priority: "Medium"
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Main disconnect reasons chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700">Call Ending Analysis</h4>
          <div className="text-sm text-gray-500">Total: {data.total} calls</div>
        </div>
        
        {/* Disconnect reason bars */}
        <div className="space-y-4">
          {data.reasons.map((reason, index) => {
            const ReasonIcon = getReasonIcon(reason.reason);
            const color = getReasonColor(reason.reason);
            
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center text-sm">
                    <ReasonIcon className={`h-4 w-4 mr-2 text-${color}-500`} />
                    <span className="text-gray-800">{reason.reason}</span>
                  </div>
                  <div className="text-sm text-gray-600">{reason.count} calls</div>
                </div>
                
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full bg-${color}-500`}
                    style={{ width: `${reason.percentage}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${reason.percentage}%` }}
                    transition={{ duration: 0.7, delay: index * 0.1 }}
                  />
                </div>
                
                <div className="mt-1 text-xs text-right text-gray-500">{reason.percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Call flow sankey (simplified visualization) */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Call Flow Analysis</h4>
        
        <div className="h-48 relative">
          {/* Starting point */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-16 h-20 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
            <Phone className="h-5 w-5 text-gray-600 mb-1" />
            <div className="text-xs text-gray-700 font-medium">Call Start</div>
            <div className="text-xs text-gray-500">{data.total} calls</div>
          </div>
          
          {/* Flow lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            {/* Call transfer flow */}
            <motion.path 
              d="M16 48 C 100 48, 120 10, 160 10" 
              stroke="#3B82F6" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray="320"
              strokeDashoffset="320"
              initial={{ strokeDashoffset: 320 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, delay: 0.2 }}
            />
            
            {/* Issue resolved flow */}
            <motion.path 
              d="M16 48 C 100 48, 120 48, 160 48" 
              stroke="#10B981" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray="320"
              strokeDashoffset="320"
              initial={{ strokeDashoffset: 320 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, delay: 0.4 }}
            />
            
            {/* Technical error flow */}
            <motion.path 
              d="M16 48 C 100 48, 120 86, 160 86" 
              stroke="#F59E0B" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray="320"
              strokeDashoffset="320"
              initial={{ strokeDashoffset: 320 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, delay: 0.6 }}
            />
            
            {/* Hung up flow */}
            <motion.path 
              d="M16 48 C 100 48, 120 124, 160 124" 
              stroke="#EF4444" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray="320"
              strokeDashoffset="320"
              initial={{ strokeDashoffset: 320 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, delay: 0.8 }}
            />
          </svg>
          
          {/* End points */}
          <div className="absolute right-0 top-0 transform -translate-y-1/3 w-16 h-16 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
            <Phone className="h-4 w-4 text-blue-600 mb-1" />
            <div className="text-xs text-blue-700 font-medium">Transferred</div>
            <div className="text-xs text-blue-600">{Math.round(data.total * 0.25)} calls</div>
          </div>
          
          <div className="absolute right-0 top-1/3 w-16 h-16 bg-green-100 rounded-lg flex flex-col items-center justify-center">
            <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
            <div className="text-xs text-green-700 font-medium">Resolved</div>
            <div className="text-xs text-green-600">{Math.round(data.total * 0.2)} calls</div>
          </div>
          
          <div className="absolute right-0 top-2/3 w-16 h-16 bg-amber-100 rounded-lg flex flex-col items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-amber-600 mb-1" />
            <div className="text-xs text-amber-700 font-medium">Error</div>
            <div className="text-xs text-amber-600">{Math.round(data.total * 0.09)} calls</div>
          </div>
          
          <div className="absolute right-0 bottom-0 transform translate-y-1/3 w-16 h-16 bg-red-100 rounded-lg flex flex-col items-center justify-center">
            <PhoneOff className="h-4 w-4 text-red-600 mb-1" />
            <div className="text-xs text-red-700 font-medium">Hung Up</div>
            <div className="text-xs text-red-600">{Math.round(data.total * 0.38)} calls</div>
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Recommended Improvements</h4>
        
        {recommendations.map(recommendation => (
          <motion.div 
            key={recommendation.id}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: recommendation.id * 0.1 }}
          >
            <div className="flex items-start">
              <div className={`rounded-full p-2 ${
                recommendation.priority === 'High' ? 'bg-red-100 text-red-600' :
                recommendation.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              } mr-3`}>
                {recommendation.priority === 'High' ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-gray-800">{recommendation.title}</h5>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    recommendation.priority === 'High' ? 'bg-red-100 text-red-600' :
                    recommendation.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {recommendation.priority} Priority
                  </span>
                </div>
                
                <p className="text-xs text-gray-600 mt-1">{recommendation.description}</p>
                
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Impact: {recommendation.metric}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}