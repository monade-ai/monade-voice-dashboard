// components/tab-views/call-management/components/insights/sentiment-analysis.tsx
import React from 'react';
import { ThumbsUp, ThumbsDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Component to display sentiment analysis from call transcripts
 */
export default function SentimentAnalysis({ data }) {
  // Calculate total calls for percentages
  const totalCalls = data.positive + data.neutral + data.negative;
  
  // Check sentiment trend from the 7-day data
  const firstDay = data.trends[0];
  const lastDay = data.trends[data.trends.length - 1];
  
  const positiveTrend = lastDay.positive - firstDay.positive;
  const negativeTrend = lastDay.negative - firstDay.negative;
  
  // Sample positive topics from call transcripts
  const positiveTopics = [
    'Product quality',
    'Customer service',
    'Ease of use',
    'Value for money',
    'Quick resolution',
  ];
  
  // Sample negative topics from call transcripts
  const negativeTopics = [
    'Billing issues',
    'Long wait times',
    'Technical problems',
    'Confusing interface',
    'Missing features',
  ];
  
  return (
    <div className="space-y-6">
      {/* Main sentiment gauge */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Overall Call Sentiment</h4>
        
        {/* Sentiment gauge */}
        <div className="relative h-8 flex rounded-full overflow-hidden mb-4">
          <motion.div 
            className="bg-green-500 h-full flex items-center justify-center"
            style={{ width: `${(data.positive / totalCalls) * 100}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${(data.positive / totalCalls) * 100}%` }}
            transition={{ duration: 0.8 }}
          >
            {data.positive >= 15 && (
              <div className="flex items-center text-white text-xs font-medium">
                <ThumbsUp className="h-3 w-3 mr-1" /> {data.positive}%
              </div>
            )}
          </motion.div>
          
          <motion.div 
            className="bg-gray-300 h-full flex items-center justify-center"
            style={{ width: `${(data.neutral / totalCalls) * 100}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${(data.neutral / totalCalls) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {data.neutral >= 15 && (
              <div className="flex items-center text-gray-700 text-xs font-medium">
                <Minus className="h-3 w-3 mr-1" /> {data.neutral}%
              </div>
            )}
          </motion.div>
          
          <motion.div 
            className="bg-red-500 h-full flex items-center justify-center"
            style={{ width: `${(data.negative / totalCalls) * 100}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${(data.negative / totalCalls) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {data.negative >= 15 && (
              <div className="flex items-center text-white text-xs font-medium">
                <ThumbsDown className="h-3 w-3 mr-1" /> {data.negative}%
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Sentiment trend */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center">
            <div className={`rounded-full p-2 mr-3 ${positiveTrend >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {positiveTrend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {positiveTrend >= 0 ? '+' : ''}{positiveTrend}% Positive
              </div>
              <div className="text-xs text-gray-500">Last 7 days</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className={`rounded-full p-2 mr-3 ${negativeTrend <= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {negativeTrend <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {negativeTrend <= 0 ? '' : '+'}{negativeTrend}% Negative
              </div>
              <div className="text-xs text-gray-500">Last 7 days</div>
            </div>
          </div>
        </div>
        
        {/* 7-day sentiment chart */}
        <div className="h-32">
          <div className="flex h-full items-end">
            {data.trends.map((day, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end">
                <div className="flex flex-col h-full justify-end">
                  <motion.div 
                    className="w-full bg-red-400"
                    style={{ height: `${day.negative}%` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${day.negative}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                  <motion.div 
                    className="w-full bg-gray-300"
                    style={{ height: `${day.neutral}%` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${day.neutral}%` }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                  />
                  <motion.div 
                    className="w-full bg-green-400"
                    style={{ height: `${day.positive}%` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${day.positive}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  Day {i+1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Common topics mentioned in calls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <h4 className="text-sm font-medium text-green-700 flex items-center mb-3">
            <ThumbsUp className="h-4 w-4 mr-2" /> Positive Mentions
          </h4>
          
          <div className="space-y-2">
            {positiveTopics.map((topic, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">{topic}</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-xs font-medium">
                  {Math.round(30 - i * 5)}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <h4 className="text-sm font-medium text-red-700 flex items-center mb-3">
            <ThumbsDown className="h-4 w-4 mr-2" /> Negative Mentions
          </h4>
          
          <div className="space-y-2">
            {negativeTopics.map((topic, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">{topic}</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                  {Math.round(20 - i * 3)}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Actionable insights */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <h4 className="text-sm font-medium text-blue-700 mb-3">Recommended Actions</h4>
        
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="bg-blue-100 rounded-full p-1 text-blue-600 mr-2 mt-0.5">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-gray-700">Provide additional training on billing procedures to reduce confusion</div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-100 rounded-full p-1 text-blue-600 mr-2 mt-0.5">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-gray-700">Focus on reducing technical issues mentioned in 12% of negative calls</div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-100 rounded-full p-1 text-blue-600 mr-2 mt-0.5">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-gray-700">Capitalize on positive mentions of customer service in marketing materials</div>
          </div>
        </div>
      </div>
    </div>
  );
}