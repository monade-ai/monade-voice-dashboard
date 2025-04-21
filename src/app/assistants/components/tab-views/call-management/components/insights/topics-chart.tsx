// components/tab-views/call-management/components/insights/topics-chart.tsx
import React, { useMemo } from 'react';
import { MessageSquare, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Component to display common topics mentioned in calls
 */
export default function TopicsChart({ data }) {
  // Find the max count for scaling
  const maxCount = useMemo(() => {
    return Math.max(...data.topics.map(topic => topic.count));
  }, [data]);
  
  // Group topics by sentiment
  const groupedTopics = useMemo(() => {
    const grouped = {
      positive: data.topics.filter(t => t.sentiment === 'positive'),
      neutral: data.topics.filter(t => t.sentiment === 'neutral'),
      negative: data.topics.filter(t => t.sentiment === 'negative'),
    };
    
    // Sort each group by count in descending order
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => b.count - a.count);
    });
    
    return grouped;
  }, [data]);
  
  // Get icon for sentiment
  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
    case 'positive': return ThumbsUp;
    case 'negative': return ThumbsDown;
    default: return Minus;
    }
  };
  
  // Get color for sentiment
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
    case 'positive': return 'green';
    case 'negative': return 'red';
    default: return 'gray';
    }
  };
  
  // Sample topic keywords visualization
  const topicKeywords = {
    'Product features': ['interface', 'functionality', 'design', 'performance', 'speed'],
    'Pricing questions': ['cost', 'subscription', 'discount', 'value', 'plan'],
    'Technical support': ['error', 'bug', 'troubleshoot', 'connection', 'setup'],
    'Billing issues': ['charge', 'invoice', 'payment', 'refund', 'subscription'],
  };
  
  return (
    <div className="space-y-6">
      {/* Topic sentiment groups */}
      <div className="grid grid-cols-3 gap-4">
        {['positive', 'neutral', 'negative'].map(sentiment => {
          const Icon = getSentimentIcon(sentiment);
          const color = getSentimentColor(sentiment);
          const topics = groupedTopics[sentiment];
          
          return (
            <div 
              key={sentiment}
              className={`bg-${color}-50 rounded-lg p-4 border border-${color}-100`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-medium text-${color}-700 capitalize flex items-center`}>
                  <Icon className="h-4 w-4 mr-2" />
                  {sentiment} Topics
                </h4>
                <div className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700`}>
                  {topics.length}
                </div>
              </div>
              
              <div className="space-y-3">
                {topics.map((topic, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{topic.topic}</span>
                      <span className={`text-${color}-600 font-medium`}>{topic.count}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full bg-${color}-400`}
                        style={{ width: `${(topic.count / maxCount) * 100}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(topic.count / maxCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Topic cloud visualization */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Topic Word Cloud</h4>
        
        <div className="relative h-64 bg-gray-50 rounded-lg">
          {data.topics.slice(0, 8).map((topic, i) => {
            const fontSize = 12 + (topic.count / maxCount) * 20;
            const color = getSentimentColor(topic.sentiment);
            
            // Generate random position
            const top = 20 + Math.random() * 60;
            const left = 15 + Math.random() * 70;
            const rotation = -15 + Math.random() * 30;
            
            return (
              <motion.div
                key={i}
                className={`absolute text-${color}-600 font-medium`}
                style={{ 
                  top: `${top}%`, 
                  left: `${left}%`,
                  fontSize: `${fontSize}px`,
                  transform: `rotate(${rotation}deg)`,
                  zIndex: Math.floor(topic.count / 10),
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {topic.topic}
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Topic keywords analysis */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(topicKeywords).slice(0, 4).map(([topic, keywords], index) => {
          const sentiment = data.topics.find(t => t.topic === topic)?.sentiment || 'neutral';
          const color = getSentimentColor(sentiment);
          
          return (
            <motion.div
              key={topic}
              className={`bg-${color}-50 bg-opacity-50 rounded-lg p-4 border border-${color}-100`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <h5 className="text-sm font-medium text-gray-700 mb-2">{topic}</h5>
              
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, i) => {
                  const intensity = 100 - i * 15;
                  
                  return (
                    <motion.span
                      key={keyword}
                      className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-${intensity} text-${color}-700`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                    >
                      {keyword}
                    </motion.span>
                  );
                })}
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                {sentiment === 'positive' ? 'Positive customer sentiment' : 
                  sentiment === 'negative' ? 'Needs attention' : 'Neutral context'}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Topic correlation matrix */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Topic Correlations</h4>
        
        <div className="text-xs text-gray-600 mb-3">
          Topics that commonly appear together in the same conversation
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 border-b border-r border-gray-200"></th>
                {data.topics.slice(0, 5).map((topic, i) => (
                  <th 
                    key={i} 
                    className="p-2 border-b border-gray-200 text-left whitespace-nowrap"
                  >
                    {topic.topic.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topics.slice(0, 5).map((rowTopic, rowIndex) => (
                <tr key={rowIndex}>
                  <th className="p-2 border-r border-gray-200 text-left whitespace-nowrap">
                    {rowTopic.topic.split(' ')[0]}
                  </th>
                  {data.topics.slice(0, 5).map((colTopic, colIndex) => {
                    // Generate sample correlation data
                    const isSame = rowIndex === colIndex;
                    let correlation = isSame ? 1 : Math.random();
                    
                    // Make some logical correlations stronger
                    if (
                      (rowTopic.topic.includes('Pricing') && colTopic.topic.includes('Billing')) ||
                      (rowTopic.topic.includes('Billing') && colTopic.topic.includes('Pricing'))
                    ) {
                      correlation = 0.7 + Math.random() * 0.3;
                    }
                    
                    let bgColor = 'bg-white';
                    if (isSame) {
                      bgColor = 'bg-gray-100';
                    } else if (correlation > 0.7) {
                      bgColor = 'bg-blue-200';
                    } else if (correlation > 0.4) {
                      bgColor = 'bg-blue-100';
                    } else if (correlation > 0.2) {
                      bgColor = 'bg-blue-50';
                    }
                    
                    return (
                      <td 
                        key={colIndex} 
                        className={`p-2 text-center ${bgColor} border border-gray-50`}
                      >
                        {isSame ? '-' : correlation.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}