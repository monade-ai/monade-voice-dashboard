// Chart components
export { BaseChart } from '@/components/ui/base-chart';
export type { BaseChartProps } from '@/components/ui/base-chart';

// Chart data types (re-exported for convenience)
export type { ChartDataPoint } from '@/app/(app)/dashboard/data/chart-data';

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
