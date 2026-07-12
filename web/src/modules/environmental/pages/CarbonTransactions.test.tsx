import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CarbonTransactions } from './CarbonTransactions';
import { useAuth } from '../../../lib/hooks/useAuth';
import * as hooks from '../hooks';

vi.mock('../../../lib/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../hooks', () => ({
  useCarbon: vi.fn(),
  useCreateCarbon: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteCarbon: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useFactors: vi.fn(),
  useGoals: vi.fn(() => ({ data: [] })),
  useCreateGoal: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateGoal: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteGoal: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

describe('CarbonTransactions', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state for employee', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useCarbon).mockReturnValue({ data: [] } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [] } as any);

    render(<CarbonTransactions />);
    expect(screen.getByText('Carbon Transactions')).toBeTruthy();
    expect(screen.getByText('No results.')).toBeTruthy();
    // Employee cannot log transactions
    expect(screen.queryByText('Log Transaction')).toBeNull();
  });

  it('shows Log Transaction button for manager', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'manager' } as any);
    vi.mocked(hooks.useCarbon).mockReturnValue({ data: [] } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [] } as any);

    render(<CarbonTransactions />);
    expect(screen.getByText('Log Transaction')).toBeTruthy();
  });

  it('renders transaction rows with co2e and is_auto badge', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useCarbon).mockReturnValue({
      data: [
        {
          id: '1',
          date: '2025-01-15',
          departments: { name: 'Engineering' },
          source_type: 'energy',
          quantity: 10,
          emission_factors: { name: 'Grid', unit: 'kWh' },
          co2e: 25,
          is_auto: false,
          note: 'test note'
        }
      ]
    } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [] } as any);

    render(<CarbonTransactions />);
    expect(screen.getByText('Engineering')).toBeTruthy();
    expect(screen.getByText('25.00')).toBeTruthy();
    expect(screen.getByText('manual')).toBeTruthy();
  });
});
