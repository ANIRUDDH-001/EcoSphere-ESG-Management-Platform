import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvironmentalDashboardPage } from './EnvironmentalDashboardPage';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEnvDashboard } from '../hooks';

// Mock hooks
vi.mock('@/lib/hooks/useAuth');
vi.mock('../hooks');

// Mock recharts (as done in other tests) to prevent DOM errors in jsdom
vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual<any>('recharts');
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: ({ children }: any) => <div>{children}</div>,
    Line: () => <div data-testid="recharts-line" />,
    BarChart: ({ children }: any) => <div>{children}</div>,
    Bar: ({ children }: any) => <div>{children}</div>,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: ({ children }: any) => <div>{children}</div>,
    Cell: () => <div data-testid="recharts-cell" />
  };
});

describe('EnvironmentalDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      profile: { id: 'user-1', role: 'manager', department_id: 'dept-1' }
    });
  });

  it('renders loading skeleton', () => {
    (useEnvDashboard as any).mockReturnValue({
      isLoading: true,
      deptEms: [],
      carbonTxns: [],
      goals: []
    });

    render(<EnvironmentalDashboardPage />);
    expect(screen.getByText('Loading metrics...')).toBeTruthy();
  });

  it('renders total emissions, trend, and rank data correctly', () => {
    (useEnvDashboard as any).mockReturnValue({
      isLoading: false,
      deptEms: [
        { department_id: 'dept-1', department_name: 'Engineering', total_co2e: 100 },
        { department_id: 'dept-2', department_name: 'Sales', total_co2e: 50 }
      ],
      carbonTxns: [
        { id: 't1', date: '2026-06-15', co2e: 100 },
        { id: 't2', date: '2026-07-01', co2e: 50 }
      ],
      goals: [
        { id: 'g1', name: 'Cut CO2', metric: 'co2e', status: 'active', baseline: 200, target: 100, current_value: 150 }
      ]
    });

    render(<EnvironmentalDashboardPage />);

    // Total = 100 + 50 = 150
    expect(screen.getByText('150.0 kg')).toBeTruthy();

    // Chart titles should be present
    expect(screen.getByText('Emissions Trend')).toBeTruthy();
    expect(screen.getByText('Department Breakdown')).toBeTruthy();
    
    // Goals
    expect(screen.getByText('Cut CO2')).toBeTruthy();
    // 50% achieved (progress = (200 - 150) / (200 - 100) * 100 = 50)
    expect(screen.getByText('50% achieved')).toBeTruthy();
  });

  it('renders empty states when no data', () => {
    (useEnvDashboard as any).mockReturnValue({
      isLoading: false,
      deptEms: [],
      carbonTxns: [],
      goals: []
    });

    render(<EnvironmentalDashboardPage />);

    expect(screen.getByText('0.0 kg')).toBeTruthy();
    expect(screen.getByText('No carbon data available')).toBeTruthy();
    expect(screen.getByText('No department data available')).toBeTruthy();
  });
});
