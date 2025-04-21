// app/dashboard/data/mock-data.ts

import { addDays, format, subDays } from 'date-fns';

// Helper to generate date strings
const getDateRange = (days: number) => {
  const today = new Date();

  return Array.from({ length: days }).map((_, i) => {
    const date = subDays(today, days - i - 1);

    return format(date, 'yyyy-MM-dd');
  });
};

const dates = getDateRange(30);
const recentDates = getDateRange(10).slice(-7);

// Generate random data points
const generatePoints = (baseValue: number, variance: number, dates: string[]) => {
  return dates.map(date => ({
    date,
    value: Math.max(0, baseValue + Math.random() * variance - variance / 2),
  }));
};

// Generate labeled random data points
const generateLabeledPoints = (
  baseValue: number, 
  variance: number, 
  dates: string[], 
  labels: string[],
) => {
  return dates.map(date => {
    const dataPoints: Record<string, number> = { date: date as any };
    labels.forEach(label => {
      dataPoints[label] = Math.max(0, baseValue + Math.random() * variance - variance / 2);
    });

    return dataPoints;
  });
};

export const totalCallMinutesData = {
  total: 18.40,
  points: generatePoints(2, 4, dates).map(point => ({
    date: point.date,
    minutes: Number(point.value.toFixed(2)),
  })),
};

export const numberOfCallsData = {
  total: 16,
  points: generatePoints(3, 5, dates).map(point => ({
    date: point.date,
    calls: Math.round(point.value),
  })),
};

export const totalSpentData = {
  total: 3.90,
  points: generatePoints(0.5, 2, dates).map(point => ({
    date: point.date,
    amount: Number(point.value.toFixed(2)),
  })),
};

export const avgCostPerCallData = {
  total: 0.24,
  points: generatePoints(0.2, 0.4, dates).map(point => ({
    date: point.date,
    cost: Number(point.value.toFixed(2)),
  })),
};

export const callEndReasonData = recentDates.map(date => {
  const customerEnded = Math.round(Math.random() * 3);
  const assistantEnded = Math.round(Math.random() * 4);
  
  return {
    date: format(new Date(date), 'MMM dd'),
    'customer-ended-call': customerEnded,
    'assistant-ended-call': assistantEnded,
  };
});

export const callDurationByAssistantData = recentDates.map(date => {
  return {
    date: format(new Date(date), 'MMM dd'),
    'Unknown Assistant': Math.random() * 1.5,
    'New Assistant': Math.random() * 2.3,
  };
});

export const costBreakdownData = recentDates.map(date => {
  return {
    date: format(new Date(date), 'MMM dd'),
    'LLM': Math.random() * 0.5,
    'STT': Math.random() * 0.3,
    'TTS': Math.random() * 0.4,
    'callLive.ai': Math.random() * 0.8,
  };
});

export const successEvaluationData = recentDates.map(date => {
  const trueCount = Math.round(Math.random() * 3);
  const falseCount = Math.round(Math.random() * 2);
  const unknownCount = Math.round(Math.random() * 1);
  
  return {
    date: format(new Date(date), 'MMM dd'),
    'True': trueCount,
    'False': falseCount,
    'Unknown': unknownCount,
  };
});

export const unsuccessfulCallsData = [
  {
    assistant: 'New Assistant',
    timestamp: '24 Mar, 16:12',
    id: '+918887706225',
    status: 'Failed',
  },
  {
    assistant: 'New Assistant',
    timestamp: '17 Mar, 13:49',
    id: '+918887706225',
    status: 'Failed',
  },
  {
    assistant: 'New Assistant',
    timestamp: '17 Mar, 13:47',
    id: '+918887706225',
    status: 'Failed',
  },
  {
    assistant: 'New Assistant',
    timestamp: '17 Mar, 12:28',
    id: '+918887706225',
    status: 'Failed',
  },
  {
    assistant: 'New Assistant',
    timestamp: '8 Mar, 19:22',
    id: '+918887706225',
    status: 'Failed',
  },
];

export const concurrentCallsData = [
  { date: '2025-03-03 05:30', calls: 0 },
  { date: '2025-03-04 06:30', calls: 0 },
  { date: '2025-03-05 07:30', calls: 0 },
  { date: '2025-03-06 05:30', calls: 0.25 },
  { date: '2025-03-07 08:30', calls: 0.5 },
  { date: '2025-03-08 09:30', calls: 0.75 },
  { date: '2025-03-09 10:30', calls: 1 },
  { date: '2025-03-10 11:30', calls: 1 },
  { date: '2025-03-11 12:30', calls: 1 },
  { date: '2025-03-12 13:30', calls: 1 },
  { date: '2025-03-13 14:30', calls: 1 },
  { date: '2025-03-14 15:30', calls: 1 },
  { date: '2025-03-15 16:30', calls: 1 },
  { date: '2025-03-16 17:30', calls: 1 },
  { date: '2025-03-17 18:30', calls: 1 },
  { date: '2025-03-18 19:30', calls: 1 },
  { date: '2025-03-19 20:30', calls: 1 },
  { date: '2025-03-20 21:30', calls: 1 },
  { date: '2025-03-21 22:30', calls: 1 },
  { date: '2025-03-22 23:30', calls: 1 },
  { date: '2025-03-23 00:30', calls: 1 },
  { date: '2025-03-24 01:30', calls: 1 },
];