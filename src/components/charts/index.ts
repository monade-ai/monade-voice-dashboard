// Chart components
export { BaseChart } from '@/components/ui/base-chart';
export type { BaseChartProps } from '@/components/ui/base-chart';

export { VoiceAgentChart } from './voice-agent-chart';
export type { VoiceAgentChartProps, ChartDataPoint } from './voice-agent-chart';

// Shadcn chart components
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from '@/components/ui/chart';

export type { ChartConfig } from '@/components/ui/chart';

// Chart utilities
export {
  defaultChartConfig,
  voiceAgentChartConfig,
  dashboardMetricsConfig,
  generateChartColors,
  formatChartValue,
  chartBreakpoints,
  getResponsiveChartHeight,
  chartAnimationConfig,
  chartMargins,
  chartPadding,
} from '@/lib/chart-utils';