// components/tab-views/call-management/call-insights.tsx
import React, { useState, useEffect, FC } from 'react';
import { BarChart3, Zap, Calendar, Users, Clock, ThumbsUp, ThumbsDown, Volume2, MessageSquare, Mic, Headphones, Phone, PhoneOff, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SentimentAnalysis from './components/insights/sentiment-analysis';
import DisconnectReasons from './components/insights/disconnect-reasons';
import CallQualityMetrics from './components/insights/call-quality-metrics';
import TimeOfDayChart from './components/insights/time-of-day-chart';
import TopicsChart from './components/insights/topics-chart';

interface InsightCard {
  id: string;
  label: string;
  icon: React.ComponentType;
  color: string;
}

interface TimeFilterOption {
  id: string;
  label: string;
}

interface TimeOfDayData {
  hour: number;
  rate: number;
  volume: number;
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  trends: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

interface DisconnectData {
  total: number;
  reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

interface QualityData {
  audioClarity: number;
  responseTime: number;
  accuracyRate: number;
  naturalConversation: number;
  trends: Array<{
    date: string;
    audioClarity: number;
    responseTime: number;
    accuracyRate: number;
    naturalConversation: number;
  }>;
}

interface TopicsData {
  topics: Array<{
    topic: string;
    count: number;
    sentiment: string;
  }>;
}

interface SentimentAnalysisProps {
  data: {
    positive: number;
    neutral: number;
    negative: number;
    trends: Array<{
      date: string;
      positive: number;
      neutral: number;
      negative: number;
    }>;
  };
}

interface DisconnectReasonsProps {
  data: {
    total: number;
    reasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
}

interface CallQualityMetricsProps {
  data: {
    audioClarity: number;
    responseTime: number;
    accuracyRate: number;
    naturalConversation: number;
    trends: Array<{
      date: string;
      audioClarity: number;
      responseTime: number;
      accuracyRate: number;
      naturalConversation: number;
    }>;
  };
}

interface TimeOfDayChartProps {
  data: Array<{
    hour: number;
    rate: number;
    volume: number;
  }>;
}

interface TopicsChartProps {
  data: {
    topics: Array<{
      topic: string;
      count: number;
      sentiment: string;
    }>;
  };
}

/**
 * Enhanced call insights component with sentiment analysis and call metrics
 */
const CallInsights: FC = () => {
  // State for time filter
  const [timeFilter, setTimeFilter] = useState('7days');
  
  // State for insight cards
  const [insightCards, setInsightCards] = useState([
    { id: 'sentiment', label: 'Call Sentiment', icon: ThumbsUp, color: 'amber' },
    { id: 'disconnect', label: 'Disconnect Reasons', icon: PhoneOff, color: 'red' },
    { id: 'quality', label: 'Call Quality', icon: Volume2, color: 'blue' },
    { id: 'topics', label: 'Common Topics', icon: MessageSquare, color: 'amber' }
  ]);
  
  // State for selected insight (expanded view)
  const [selectedInsight, setSelectedInsight] = useState(null);
  
  // Sample insights data - call success rates by hour
  const timeOfDayData = [
    { hour: 6, rate: 0.2, volume: 5 },
    { hour: 7, rate: 0.3, volume: 10 },
    { hour: 8, rate: 0.5, volume: 25 },
    { hour: 9, rate: 0.7, volume: 42 },
    { hour: 10, rate: 0.8, volume: 56 },
    { hour: 11, rate: 0.75, volume: 48 },
    { hour: 12, rate: 0.6, volume: 30 },
    { hour: 13, rate: 0.65, volume: 35 },
    { hour: 14, rate: 0.7, volume: 38 },
    { hour: 15, rate: 0.85, volume: 52 },
    { hour: 16, rate: 0.9, volume: 60 },
    { hour: 17, rate: 0.8, volume: 45 },
    { hour: 18, rate: 0.7, volume: 30 },
    { hour: 19, rate: 0.5, volume: 20 },
    { hour: 20, rate: 0.4, volume: 15 },
    { hour: 21, rate: 0.3, volume: 8 }
  ];
  
  // Sample sentiment data
  const sentimentData = {
    positive: 68,
    neutral: 22,
    negative: 10,
    trends: [
      { date: '2023-04-01', positive: 65, neutral: 25, negative: 10 },
      { date: '2023-04-02', positive: 62, neutral: 28, negative: 10 },
      { date: '2023-04-03', positive: 60, neutral: 28, negative: 12 },
      { date: '2023-04-04', positive: 58, neutral: 30, negative: 12 },
      { date: '2023-04-05', positive: 63, neutral: 27, negative: 10 },
      { date: '2023-04-06', positive: 66, neutral: 24, negative: 10 },
      { date: '2023-04-07', positive: 68, neutral: 22, negative: 10 }
    ]
  };
  
  // Sample disconnect reasons data
  const disconnectData = {
    total: 128,
    reasons: [
      { reason: 'Customer hung up', count: 48, percentage: 37.5 },
      { reason: 'Call transferred', count: 32, percentage: 25 },
      { reason: 'Issue resolved', count: 26, percentage: 20.3 },
      { reason: 'Technical error', count: 12, percentage: 9.4 },
      { reason: 'Schedule follow-up', count: 10, percentage: 7.8 }
    ]
  };
  
  // Sample call quality metrics
  const qualityData = {
    audioClarity: 87,
    responseTime: 92,
    accuracyRate: 94,
    naturalConversation: 85,
    trends: [
      { date: '2023-04-01', audioClarity: 84, responseTime: 90, accuracyRate: 91, naturalConversation: 82 },
      { date: '2023-04-02', audioClarity: 85, responseTime: 89, accuracyRate: 92, naturalConversation: 83 },
      { date: '2023-04-03', audioClarity: 85, responseTime: 90, accuracyRate: 93, naturalConversation: 84 },
      { date: '2023-04-04', audioClarity: 86, responseTime: 91, accuracyRate: 93, naturalConversation: 84 },
      { date: '2023-04-05', audioClarity: 86, responseTime: 91, accuracyRate: 94, naturalConversation: 85 },
      { date: '2023-04-06', audioClarity: 87, responseTime: 92, accuracyRate: 94, naturalConversation: 85 },
      { date: '2023-04-07', audioClarity: 87, responseTime: 92, accuracyRate: 94, naturalConversation: 85 }
    ]
  };
  
  // Sample topics data
  const topicsData = {
    topics: [
      { topic: 'Pricing questions', count: 98, sentiment: 'neutral' },
      { topic: 'Product features', count: 76, sentiment: 'positive' },
      { topic: 'Technical support', count: 64, sentiment: 'neutral' },
      { topic: 'Billing issues', count: 42, sentiment: 'negative' },
      { topic: 'Upgrade options', count: 38, sentiment: 'positive' },
      { topic: 'Account setup', count: 32, sentiment: 'neutral' },
      { topic: 'Cancellation', count: 28, sentiment: 'negative' },
      { topic: 'Positive feedback', count: 24, sentiment: 'positive' }
    ]
  };
  
  // Time filter options
  const timeFilterOptions = [
    { id: '7days', label: 'Last 7 days' },
    { id: '30days', label: 'Last 30 days' },
    { id: '90days', label: 'Last 90 days' }
  ];
  
  // Toggle insight selection
  const toggleInsight = (insightId:any) => {
    if (selectedInsight === insightId) {
      setSelectedInsight(null);
    } else {
      setSelectedInsight(insightId);
    }
  };
  
  // Get best time to call
  const getBestTimeToCall = () => {
    const bestHourData = [...timeOfDayData].sort((a, b) => b.rate - a.rate)[0];
    let hour = bestHourData.hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    
    return {
      time: `${hour}:00 ${period}`,
      rate: Math.round(bestHourData.rate * 100)
    };
  };
  
  // Get recommended days based on mock data
  const getRecommendedDays = () => {
    return {
      days: 'Tue - Thu',
      improvement: '15%'
    };
  };
  
  // Get insights by contact list
  const getContactListInsights = () => {
    return [
      { list: 'Leads', bestTime: 'mornings' },
      { list: 'Customers', bestTime: 'afternoons' }
    ];
  };
  
  // Best time info
  const bestTimeInfo = getBestTimeToCall();
  const recommendedDaysInfo = getRecommendedDays();
  const contactListInsights = getContactListInsights();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border h-full overflow-hidden flex flex-col">
      <div className="p-4 bg-gradient-to-b from-indigo-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Call Analytics & Insights</h3>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                className="appearance-none pl-8 pr-8 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                {timeFilterOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Best time insights cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-amber-700">Best Time to Call</h4>
              <Zap className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-lg font-bold text-amber-800">{bestTimeInfo.time}</div>
            <div className="text-xs text-amber-600 mt-0.5">{bestTimeInfo.rate}% success rate</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-blue-700">Recommended Days</h4>
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-blue-800">{recommendedDaysInfo.days}</div>
            <div className="text-xs text-blue-600 mt-0.5">{recommendedDaysInfo.improvement} higher engagement</div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-amber-700">Contact List Insights</h4>
              <Users className="h-3.5 w-3.5 text-amber-600" />
            </div>
            {contactListInsights.map((insight, index) => (
              <div key={index} className="text-sm font-medium text-amber-800">
                {insight.list}: {insight.bestTime}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main insights content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Selected insight view or insight cards */}
        <AnimatePresence mode="wait">
          {selectedInsight ? (
            <motion.div
              key={`full-${selectedInsight}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              <div className="mb-3 flex items-center">
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="mr-2 p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h3 className="text-sm font-medium text-gray-700">
                  {insightCards.find(card => card.id === selectedInsight)?.label}
                </h3>
              </div>
              
              {/* Insight detail content */}
              {selectedInsight === 'sentiment' && (
                <SentimentAnalysis data={sentimentData} />
              )}
              
              {selectedInsight === 'disconnect' && (
                <DisconnectReasons data={disconnectData} />
              )}
              
              {selectedInsight === 'quality' && (
                <CallQualityMetrics data={qualityData} />
              )}
              
              {selectedInsight === 'topics' && (
                <TopicsChart data={topicsData} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="insight-cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Insight cards grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {insightCards.map(card => (
                  <motion.button
                    key={card.id}
                    className={`bg-${card.color}-50 rounded-lg p-4 border border-${card.color}-100 text-left hover:shadow-md transition-shadow`}
                    onClick={() => toggleInsight(card.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">{card.label}</h4>
                      <card.icon className={`h-4 w-4 text-${card.color}-600`} />
                    </div>
                    
                    {/* Mini preview based on card type */}
                    {card.id === 'sentiment' && (
                      <div className="flex items-center space-x-1">
                        <div className="bg-amber-200 h-6 rounded-l-md" style={{ width: `${sentimentData.positive}%` }}></div>
                        <div className="bg-gray-200 h-6" style={{ width: `${sentimentData.neutral}%` }}></div>
                        <div className="bg-red-200 h-6 rounded-r-md" style={{ width: `${sentimentData.negative}%` }}></div>
                      </div>
                    )}
                    
                    {card.id === 'disconnect' && (
                      <div className="space-y-1">
                        {disconnectData.reasons.slice(0, 3).map((reason, i) => (
                          <div key={i} className="flex items-center text-xs">
                            <div 
                              className="h-1.5 rounded-full bg-red-400 mr-2" 
                              style={{ width: `${reason.percentage}%`, maxWidth: '120px' }}
                            ></div>
                            <span className="text-gray-600 truncate">{reason.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {card.id === 'quality' && (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-24 mr-2">
                            <div className="text-xs text-gray-600">Audio Clarity</div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full mt-1">
                              <div 
                                className="h-1.5 bg-blue-500 rounded-full" 
                                style={{ width: `${qualityData.audioClarity}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-blue-600 font-medium">{qualityData.audioClarity}%</div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-24 mr-2">
                            <div className="text-xs text-gray-600">Response Time</div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full mt-1">
                              <div 
                                className="h-1.5 bg-blue-500 rounded-full" 
                                style={{ width: `${qualityData.responseTime}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-blue-600 font-medium">{qualityData.responseTime}%</div>
                        </div>
                      </div>
                    )}
                    
                    {card.id === 'topics' && (
                      <div className="space-y-1">
                        {topicsData.topics.slice(0, 4).map((topic, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 truncate">{topic.topic}</span>
                            <span 
                              className={`px-1.5 py-0.5 rounded-full text-xs ${
                                topic.sentiment === 'positive' ? 'bg-green-100 text-green-600' :
                                topic.sentiment === 'neutral' ? 'bg-gray-100 text-gray-600' :
                                'bg-red-100 text-red-600'
                              }`}
                            >
                              {topic.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Call success by time of day chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Call Success by Time of Day</h3>
                <TimeOfDayChart data={timeOfDayData} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CallInsights