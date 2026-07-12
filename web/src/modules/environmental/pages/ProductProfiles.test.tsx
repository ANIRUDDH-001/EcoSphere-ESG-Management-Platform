import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProductProfiles } from './ProductProfiles';
import { useAuth } from '../../../lib/hooks/useAuth';
import * as hooks from '../hooks';

vi.mock('../../../lib/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../hooks', () => ({
  useProducts: vi.fn(),
  useFactors: vi.fn(),
  useCreateProduct: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateProduct: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteProduct: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

describe('ProductProfiles', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders rows and empty state', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useProducts).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [] } as any);
    
    render(<ProductProfiles />);
    expect(screen.getByText('Product ESG Profiles')).toBeTruthy();
    expect(screen.getByText('No results.')).toBeTruthy();
  });

  it('renders rows correctly for admin', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useProducts).mockReturnValue({ 
      data: [
        { 
          id: '1', 
          product_name: 'Eco Widget', 
          sku: 'EW-01', 
          carbon_per_unit: 10, 
          recyclable_pct: 100,
          emission_factors: { name: 'Plastic Factor' }
        }
      ], 
      isLoading: false 
    } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [] } as any);
    
    render(<ProductProfiles />);
    expect(screen.getByText('Eco Widget')).toBeTruthy();
    expect(screen.getByText('Plastic Factor')).toBeTruthy();
    
    // New Profile button should be rendered for admin
    expect(screen.getByText('New Profile')).toBeTruthy();
  });

  it('an employee mutation attempt is not rendered', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useProducts).mockReturnValue({ 
      data: [
        { 
          id: '1', 
          product_name: 'Eco Widget', 
          sku: 'EW-01', 
          carbon_per_unit: 10, 
          recyclable_pct: 100,
          emission_factors: null
        }
      ], 
      isLoading: false 
    } as any);
    vi.mocked(hooks.useFactors).mockReturnValue({ data: [] } as any);
    
    render(<ProductProfiles />);
    expect(screen.getByText('Eco Widget')).toBeTruthy();
    
    // New Profile button should NOT be rendered for employee
    const newProfileBtn = screen.queryByText('New Profile');
    expect(newProfileBtn).toBeNull();
  });
});
