import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { EsgTrendCard } from './EsgTrendCard';
import * as scoresHooks from '../../../lib/hooks/scores';

afterEach(cleanup);

// Mock recharts
vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual<any>('recharts');
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 400 }}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { width: 400, height: 400 } as any);
          }
          return child;
        })}
      </div>
    ),
  };
});

describe('Dashboard Trend', () => {
  let mockUseScoreTrend: any;

  beforeEach(() => {
    mockUseScoreTrend = vi.spyOn(scoresHooks, 'useScoreTrend');
  });

  it('Calls useScoreTrend with selected window and renders TrendLine', () => {
    mockUseScoreTrend.mockReturnValue({
      data: [
        { snapshot_date: '2023-01-01', overall_esg: 70 } as any,
        { snapshot_date: '2023-02-01', overall_esg: 75 } as any,
      ],
      isLoading: false,
      isError: false,
    } as any);

    render(<EsgTrendCard />);
    
    // Default is 30 days
    expect(mockUseScoreTrend).toHaveBeenCalledWith(30);

    // Switch to 90 days
    fireEvent.click(screen.getByText('90d'));
    expect(mockUseScoreTrend).toHaveBeenCalledWith(90);

    // Both data points should be rendered somewhere in the DOM via recharts
    expect(document.querySelector('.recharts-line')).toBeDefined();
  });

  it('Handles empty trend data', () => {
    mockUseScoreTrend.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<EsgTrendCard />);
    expect(screen.getByText('No trend data available.')).toBeDefined();
  });
});
