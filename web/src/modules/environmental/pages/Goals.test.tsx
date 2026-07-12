import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Goals } from './Goals';
import { useAuth } from '../../../lib/hooks/useAuth';
import * as hooks from '../hooks';

vi.mock('../../../lib/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../hooks', () => ({
  useGoals: vi.fn(),
  useCreateGoal: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateGoal: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteGoal: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

describe('Goals', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders rows and empty state', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useGoals).mockReturnValue({ data: [] } as any);
    
    render(<Goals />);
    expect(screen.getByText('Environmental Goals')).toBeTruthy();
    expect(screen.getByText('No results.')).toBeTruthy();
  });

  it('renders goals and computes status', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useGoals).mockReturnValue({ 
      data: [
        { 
          id: '1', 
          name: 'Reduce CO2', 
          metric: 'kg', 
          baseline: 100, 
          target: 60,
          current_value: 55,
          target_date: '2030-01-01',
          status: 'achieved'
        }
      ] 
    } as any);
    
    render(<Goals />);
    expect(screen.getByText('Reduce CO2')).toBeTruthy();
    expect(screen.getByText('achieved')).toBeTruthy();
    
    // New Goal button should be rendered for admin
    expect(screen.getByText('New Goal')).toBeTruthy();
  });

  it('an employee mutation attempt is not rendered', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useGoals).mockReturnValue({ 
      data: [
        { 
          id: '1', 
          name: 'Reduce CO2', 
          metric: 'kg', 
          baseline: 100, 
          target: 60,
          current_value: 55,
          target_date: '2030-01-01',
          status: 'achieved'
        }
      ] 
    } as any);
    
    render(<Goals />);
    
    const newGoalBtn = screen.queryByText('New Goal');
    expect(newGoalBtn).toBeNull();
  });
});
