import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EmissionFactors } from './EmissionFactors';
import { useAuth } from '../../../lib/hooks/useAuth';
import * as hooks from '../hooks';

// Mock dependencies
vi.mock('../../../lib/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../hooks', () => ({
  useFactors: vi.fn(),
  useCreateFactor: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateFactor: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useArchiveFactor: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

describe('EmissionFactors', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders rows; empty state', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [], isLoading: false } as any);
    
    render(<EmissionFactors />);
    expect(screen.getByText('Emission Factors')).toBeTruthy();
    expect(screen.getByText('No results.')).toBeTruthy();
  });

  it('renders rows correctly for admin', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ 
      data: [
        { id: '1', name: 'Grid Electricity', source_type: 'energy', unit: 'kWh', factor_kgco2e: 0.5, status: 'active' }
      ], 
      isLoading: false 
    } as any);
    
    render(<EmissionFactors />);
    expect(screen.getByText('Grid Electricity')).toBeTruthy();
    // New Factor button should be rendered for admin
    expect(screen.getByText('New Factor')).toBeTruthy();
  });

  it('an employee mutation attempt is not rendered', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ 
      data: [
        { id: '1', name: 'Grid Electricity', source_type: 'energy', unit: 'kWh', factor_kgco2e: 0.5, status: 'active' }
      ], 
      isLoading: false 
    } as any);
    
    render(<EmissionFactors />);
    expect(screen.getByText('Grid Electricity')).toBeTruthy();
    
    // New Factor button should NOT be rendered for employee
    const newFactorBtn = screen.queryByText('New Factor');
    expect(newFactorBtn).toBeNull();
  });
});
