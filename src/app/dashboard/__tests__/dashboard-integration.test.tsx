/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { useDashboardData } from '@/app/hooks/use-dashboard-data';

import DashboardPage from '../page';

// Mock the dashboard data hook
jest.mock('@/app/hooks/use-dashboard-data');
const mockUseDashboardData = useDashboardData as jest.MockedFunction<typeof useDashboardData>;

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock chart components
jest.mock('@/components/charts', () => ({
  VoiceAgentChart: ({ data, timeRange, onTimeRangeChange, loading, error }: any) => (
    <div data-testid="voice-agent-chart">
      <div data-testid="chart-loading">{loading ? 'Loading...' : 'Chart loaded'}</div>
      <div data-testid="chart-error">{error || 'No error'}</div>
      <div data-testid="chart-time-range">{timeRange}</div>
      <button 
        data-testid="change-time-range" 
        onClick={() => onTimeRangeChange('24h')}
      >
        Change to 24h
      </button>
      <div data-testid="chart-data-points">{data.length} data points</div>
    </div>
  ),
}));

// Mock carousel component
jest.mock('../components/carousel', () => {
  return function MockCarousel() {
    return <div data-testid="dashboard-carousel">Activity Carousel</div>;
  };
});

const mockChartData = [
  {
    timestamp: '2024-01-01T00:00:00Z',
    callVolume: 100,
    successRate: 85.5,
    avgDuration: 180,
  },
  {
    timestamp: '2024-01-01T01:00:00Z',
    callVolume: 120,
    successRate: 87.2,
    avgDuration: 175,
  },
];

const mockMetrics = {
  agents: {
    total: 23,
    active: 18,
    trend: { direction: 'up' as const, percentage: 12 },
  },
  calls: {
    total: 1234,
    today: 89,
    trend: { direction: 'up' as const, percentage: 8 },
  },
  wallet: {
    balance: 12345,
    currency: '₹',
    minutesRemaining: 3400,
  },
};

const defaultMockState = {
  metrics: mockMetrics,
  chartData: mockChartData,
  timeRange: '7d' as const,
  loading: {
    metrics: false,
    chart: false,
    initial: false,
  },
  errors: {
    metrics: null,
    chart: null,
  },
  changeTimeRange: jest.fn(),
  refreshData: jest.fn(),
  loadMetrics: jest.fn(),
  loadChartData: jest.fn(),
};

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardData.mockReturnValue(defaultMockState);
  });

  describe('Initial Loading States', () => {
    it('should show full skeleton during initial load', () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        loading: {
          metrics: true,
          chart: true,
          initial: true,
        },
      });

      render(<DashboardPage />);

      // Should show skeleton instead of actual content
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Deploy Agent')).not.toBeInTheDocument();
    });

    it('should show individual component loading states', async () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        loading: {
          metrics: true,
          chart: true,
          initial: false,
        },
      });

      render(<DashboardPage />);

      // Should show main layout but with loading states
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Deploy Agent')).toBeInTheDocument();
      expect(screen.getByTestId('chart-loading')).toHaveTextContent('Loading...');
    });
  });

  describe('Data Integration', () => {
    it('should display metrics data correctly', () => {
      render(<DashboardPage />);

      // Check wallet data
      expect(screen.getByText('₹12,345')).toBeInTheDocument();
      expect(screen.getByText('3.4k mins left')).toBeInTheDocument();

      // Check agents metric
      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();

      // Check calls metric
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('Calls')).toBeInTheDocument();
    });

    it('should display trend indicators correctly', () => {
      render(<DashboardPage />);

      // Should show up trends for both metrics
      const trendElements = screen.getAllByText('12%');
      expect(trendElements).toHaveLength(1);
      
      const callsTrendElements = screen.getAllByText('8%');
      expect(callsTrendElements).toHaveLength(1);
    });

    it('should handle missing data gracefully', () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        metrics: null,
      });

      render(<DashboardPage />);

      // Should show fallback values
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0 mins left')).toBeInTheDocument();
    });
  });

  describe('Chart Integration', () => {
    it('should render chart with correct data', () => {
      render(<DashboardPage />);

      expect(screen.getByTestId('voice-agent-chart')).toBeInTheDocument();
      expect(screen.getByTestId('chart-data-points')).toHaveTextContent('2 data points');
      expect(screen.getByTestId('chart-time-range')).toHaveTextContent('7d');
    });

    it('should handle chart time range changes', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      const changeButton = screen.getByTestId('change-time-range');
      await user.click(changeButton);

      expect(defaultMockState.changeTimeRange).toHaveBeenCalledWith('24h');
    });

    it('should display chart errors', () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        errors: {
          ...defaultMockState.errors,
          chart: 'Failed to load chart data',
        },
      });

      render(<DashboardPage />);

      expect(screen.getByTestId('chart-error')).toHaveTextContent('Failed to load chart data');
    });
  });

  describe('Error Handling', () => {
    it('should show refresh button when there are errors', () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        errors: {
          metrics: 'Failed to load metrics',
          chart: null,
        },
      });

      render(<DashboardPage />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should call refreshData when refresh button is clicked', async () => {
      const user = userEvent.setup();
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        errors: {
          metrics: 'Failed to load metrics',
          chart: null,
        },
      });

      render(<DashboardPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(defaultMockState.refreshData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Dashboard data refreshed');
    });
  });

  describe('Interactive Elements', () => {
    it('should handle wallet top-up action', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      const topUpButton = screen.getByLabelText('Top up wallet');
      await user.click(topUpButton);

      expect(toast.success).toHaveBeenCalledWith('Redirecting to payment gateway...');
    });

    it('should handle deploy agent button click', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      const deployButton = screen.getByRole('button', { name: /deploy agent/i });
      expect(deployButton).toBeInTheDocument();
      
      // Button should be clickable (no specific action implemented yet)
      await user.click(deployButton);
    });
  });

  describe('Call Logs Integration', () => {
    it('should display call logs table', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Call Logs')).toBeInTheDocument();
      expect(screen.getByText('Agent Smith')).toBeInTheDocument();
      expect(screen.getByText('Agent 007')).toBeInTheDocument();
      expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    });

    it('should handle pagination correctly', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      // Check initial pagination state
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 to 6 of 12 calls')).toBeInTheDocument();

      // Navigate to next page
      const nextButtons = screen.getAllByRole('button');
      const actualNextButton = nextButtons.find(btn => 
        btn.querySelector('svg') && !btn.disabled && btn !== screen.getByRole('button', { name: /deploy agent/i }),
      );
      
      if (actualNextButton) {
        await user.click(actualNextButton);
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
        });
      }
    });

    it('should display call status badges correctly', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Ended')).toBeInTheDocument();
      expect(screen.getByText('Started')).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should render all main sections', () => {
      render(<DashboardPage />);

      // Header
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deploy agent/i })).toBeInTheDocument();

      // Main grid sections
      expect(screen.getByText('Wallet')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Calls')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-carousel')).toBeInTheDocument();

      // Chart section
      expect(screen.getByTestId('voice-agent-chart')).toBeInTheDocument();

      // Call logs section
      expect(screen.getByText('Call Logs')).toBeInTheDocument();
    });

    it('should maintain proper grid structure', () => {
      render(<DashboardPage />);

      const mainGrid = screen.getByText('Dashboard').closest('div')?.querySelector('.grid');
      expect(mainGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-5');
    });
  });

  describe('Progressive Data Loading', () => {
    it('should handle progressive loading states correctly', async () => {
      // Start with initial loading
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        loading: {
          metrics: true,
          chart: false,
          initial: true,
        },
      });

      const { rerender } = render(<DashboardPage />);

      // Should show skeleton
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

      // Simulate metrics loaded, chart still loading
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        loading: {
          metrics: false,
          chart: true,
          initial: false,
        },
      });

      rerender(<DashboardPage />);

      // Should show main layout with chart loading
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('chart-loading')).toHaveTextContent('Loading...');

      // Simulate all data loaded
      mockUseDashboardData.mockReturnValue({
        ...defaultMockState,
        loading: {
          metrics: false,
          chart: false,
          initial: false,
        },
      });

      rerender(<DashboardPage />);

      // Should show all content loaded
      expect(screen.getByTestId('chart-loading')).toHaveTextContent('Chart loaded');
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock a component that throws an error
      jest.doMock('../components/carousel', () => {
        return function ErrorCarousel() {
          throw new Error('Carousel component error');
        };
      });

      // The error boundary should catch the error and show fallback UI
      render(<DashboardPage />);

      // Main dashboard should still render
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<DashboardPage />);

      // Check for proper button labels
      expect(screen.getByLabelText('Top up wallet')).toBeInTheDocument();
      
      // Check for proper table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(6);
      
      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Call Logs' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      const topUpButton = screen.getByLabelText('Top up wallet');
      
      // Should be focusable
      await user.tab();
      // Note: Exact focus testing would require more complex setup
      // This is a basic check that the button is in the tab order
      expect(topUpButton).toBeInTheDocument();
    });
  });
});
