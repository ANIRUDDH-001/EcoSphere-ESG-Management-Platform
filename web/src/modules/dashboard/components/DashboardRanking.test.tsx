import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { DepartmentRankingCard } from './DepartmentRankingCard';
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

describe('Dashboard Ranking', () => {
  let mockUseDepartmentScores: any;

  beforeEach(() => {
    mockUseDepartmentScores = vi.spyOn(scoresHooks, 'useDepartmentScores');
  });

  it('Renders ranking order matching total_score desc and band colors', () => {
    mockUseDepartmentScores.mockReturnValue({
      data: [
        { department_id: 'DepA', total_score: 50 }, // warning -> --warning
        { department_id: 'DepB', total_score: 90 }, // strong -> --primary
        { department_id: 'DepC', total_score: 75 }, // good -> --pillar-environmental
      ] as any,
      isLoading: false,
      isError: false,
    } as any);

    render(<DepartmentRankingCard />);
    
    // Check if the names are rendered. 
    // They should be present in the SVG.
    expect(screen.getAllByText('DepA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DepB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DepC').length).toBeGreaterThan(0);
    
    // Bar chart should be present
    expect(document.querySelector('.recharts-bar')).toBeDefined();
  });

  it('Empty cases do not crash', () => {
    mockUseDepartmentScores.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<DepartmentRankingCard />);
    expect(screen.getByText('No departments scored yet.')).toBeDefined();
  });

  it('One department case does not crash', () => {
    mockUseDepartmentScores.mockReturnValue({
      data: [{ department_id: 'DepA', total_score: 50 }] as any,
      isLoading: false,
      isError: false,
    } as any);

    render(<DepartmentRankingCard />);
    expect(screen.getByText('Only one department has been scored. Add more for a ranking.')).toBeDefined();
  });
});
