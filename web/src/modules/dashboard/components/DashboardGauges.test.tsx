import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OverallScoreCard } from './OverallScoreCard';
import { PillarGauges } from './PillarGauges';
import type { OrgScoreSnapshot } from '../../../lib/hooks/scores';

afterEach(cleanup);

// Mock recharts because it uses ResizeObserver and might fail in jsdom
vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual<any>('recharts');
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => {
      // Recharts needs explicit dimensions to render in JSDOM
      return (
        <div style={{ width: 400, height: 400 }}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { width: 400, height: 400 } as any);
            }
            return child;
          })}
        </div>
      );
    },
  };
});

describe('Dashboard Gauges', () => {
  describe('OverallScoreCard', () => {
    it('Gauge value equals score', () => {
      render(<OverallScoreCard score={75} trendData={[]} isLoading={false} />);
      expect(screen.getByText('75')).toBeDefined();
    });

    it('Absent prior snapshot -> no delta', () => {
      render(<OverallScoreCard score={75} trendData={[]} isLoading={false} />);
      expect(screen.getByText('No prior snapshot')).toBeDefined();
    });

    it('Delta sign/magnitude matches trend fixture', () => {
      const mockTrend: OrgScoreSnapshot[] = [
        { snapshot_date: '2023-01-01', overall_esg: 70 } as any,
        { snapshot_date: '2023-02-01', overall_esg: 75 } as any,
      ];
      render(<OverallScoreCard score={75} trendData={mockTrend} isLoading={false} />);
      expect(screen.getByText('5.0 pts')).toBeDefined();
    });
  });

  describe('PillarGauges', () => {
    it('Renders E/S/G mini-gauges with values', () => {
      const mockScore = {
        environmental: 80,
        social: 60,
        governance: 45
      };
      render(<PillarGauges orgScore={mockScore} isLoading={false} />);
      
      expect(screen.getByText('80')).toBeDefined();
      expect(screen.getByText('60')).toBeDefined();
      expect(screen.getByText('45')).toBeDefined();
      
      // band colors: 80=good, 60=warning, 45=warning
      expect(screen.getByText('good')).toBeDefined();
      expect(screen.getAllByText('warning')).toHaveLength(2);
    });
  });
});
