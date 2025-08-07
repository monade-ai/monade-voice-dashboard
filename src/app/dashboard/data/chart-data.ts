import { ChartDataPoint } from '@/components/charts';

// Generate mock data for different time ranges
export const generateMockChartData = (timeRange: '24h' | '7d' | '30d'): ChartDataPoint[] => {
  const now = new Date();
  const data: ChartDataPoint[] = [];
  
  let intervals: number;
  let intervalMs: number;
  
  switch (timeRange) {
  case '24h':
    intervals = 24; // 24 hours
    intervalMs = 60 * 60 * 1000; // 1 hour
    break;
  case '7d':
    intervals = 7; // 7 days
    intervalMs = 24 * 60 * 60 * 1000; // 1 day
    break;
  case '30d':
    intervals = 30; // 30 days
    intervalMs = 24 * 60 * 60 * 1000; // 1 day
    break;
  }
  
  for (let i = intervals - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * intervalMs));
    
    // Generate realistic mock data with some variation
    const baseCallVolume = timeRange === '24h' ? 50 : timeRange === '7d' ? 300 : 1200;
    const callVolume = Math.floor(baseCallVolume + (Math.random() - 0.5) * baseCallVolume * 0.4);
    
    const baseSuccessRate = 85;
    const successRate = Math.min(100, Math.max(60, baseSuccessRate + (Math.random() - 0.5) * 20));
    
    const baseAvgDuration = 180; // 3 minutes in seconds
    const avgDuration = Math.floor(baseAvgDuration + (Math.random() - 0.5) * 60);
    
    data.push({
      timestamp: timestamp.toISOString(),
      callVolume: Math.max(0, callVolume),
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      avgDuration: Math.max(30, avgDuration), // Minimum 30 seconds
    });
  }
  
  return data;
};

// Simulate data loading with delay
export const fetchChartData = async (timeRange: '24h' | '7d' | '30d'): Promise<ChartDataPoint[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  // Simulate very rare errors (1% chance)
  if (Math.random() < 0.01) {
    throw new Error('Failed to fetch chart data');
  }
  
  return generateMockChartData(timeRange);
};

// Default data for immediate display
export const defaultChartData: ChartDataPoint[] = generateMockChartData('7d');