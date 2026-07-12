import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Gauge } from './Gauge';

// Mock Recharts since we only want to verify the text rendering and clamping
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: ({ data }: any) => <div data-testid="pie">{JSON.stringify(data)}</div>,
  };
});

describe('Gauge', () => {
  it('renders value and clamps out-of-range values', () => {
    render(<Gauge value={120} />);
    // Clamped to 100
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('clamps negative values to 0', () => {
    render(<Gauge value={-50} />);
    expect(screen.getByText('0')).toBeTruthy();
  });
});
