import { ChartConfig } from '@/components/ui/chart';

// Common chart configurations
export const defaultChartConfig: ChartConfig = {
  primary: {
    label: 'Primary',
    color: 'hsl(var(--chart-1))',
  },
  secondary: {
    label: 'Secondary', 
    color: 'hsl(var(--chart-2))',
  },
  success: {
    label: 'Success',
    color: 'hsl(var(--chart-success))',
  },
  warning: {
    label: 'Warning',
    color: 'hsl(var(--chart-warning))',
  },
  error: {
    label: 'Error',
    color: 'hsl(var(--chart-error))',
  },
  info: {
    label: 'Info',
    color: 'hsl(var(--chart-info))',
  },
  neutral: {
    label: 'Neutral',
    color: 'hsl(var(--chart-neutral))',
  },
};

// Voice agent specific chart configuration with yellow-based colors
export const voiceAgentChartConfig: ChartConfig = {
  callVolume: {
    label: 'Call Volume',
    color: '#eab308', // Yellow-500
  },
  successRate: {
    label: 'Success Rate',
    color: '#16a34a', // Green-600 for success
  },
  avgDuration: {
    label: 'Avg Duration',
    color: '#f59e0b', // Amber-500
  },
  failedCalls: {
    label: 'Failed Calls',
    color: '#dc2626', // Red-600 for errors
  },
};

// Dashboard metrics chart configuration
export const dashboardMetricsConfig: ChartConfig = {
  agents: {
    label: 'Active Agents',
    color: 'hsl(var(--chart-1))',
  },
  calls: {
    label: 'Total Calls',
    color: 'hsl(var(--chart-2))',
  },
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-success))',
  },
  costs: {
    label: 'Costs',
    color: 'hsl(var(--chart-warning))',
  },
};

// Chart color palette generator
export const generateChartColors = (count: number): string[] => {
  const baseColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-success))',
    'hsl(var(--chart-info))',
    'hsl(var(--chart-warning))',
    'hsl(var(--chart-error))',
    'hsl(var(--chart-neutral))',
  ];
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Generate additional colors if needed
  const additionalColors = [];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360; // Golden angle approximation
    additionalColors.push(`hsl(${hue}, 70%, 50%)`);
  }
  
  return [...baseColors, ...additionalColors];
};

// Format chart data helpers
export const formatChartValue = (value: number, type: 'number' | 'currency' | 'percentage' | 'duration' = 'number'): string => {
  switch (type) {
  case 'currency':
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  case 'percentage':
    return `${value.toFixed(1)}%`;
  case 'duration':
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  default:
    return value.toLocaleString();
  }
};

// Chart responsive breakpoints
export const chartBreakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
};

// Get responsive chart height
export const getResponsiveChartHeight = (screenWidth: number): number => {
  if (screenWidth < chartBreakpoints.mobile) {
    return 200;
  } else if (screenWidth < chartBreakpoints.tablet) {
    return 250;
  } else if (screenWidth < chartBreakpoints.desktop) {
    return 300;
  }

  return 350;
};

// Chart animation configurations
export const chartAnimationConfig = {
  duration: 750,
  easing: 'ease-in-out',
};

// Common chart margins and padding
export const chartMargins = {
  top: 20,
  right: 30,
  bottom: 20,
  left: 20,
};

export const chartPadding = {
  small: 16,
  medium: 24,
  large: 32,
};