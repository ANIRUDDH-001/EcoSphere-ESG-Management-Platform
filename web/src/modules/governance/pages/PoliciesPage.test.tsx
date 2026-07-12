import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PoliciesPage } from './PoliciesPage';
import { useAuth } from '../../../lib/hooks/useAuth';
import { usePolicies } from '../hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../lib/hooks/useAuth');
vi.mock('../hooks', () => ({
  usePolicies: vi.fn(),
  useCreatePolicy: () => ({ mutate: vi.fn() }),
  useUpdatePolicy: () => ({ mutate: vi.fn() }),
  useArchivePolicy: () => ({ mutate: vi.fn() }),
}));

const queryClient = new QueryClient();

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('PoliciesPage', () => {
  it('employee sees no write controls', () => {
    (useAuth as any).mockReturnValue({ role: 'employee' });
    (usePolicies as any).mockReturnValue({ data: [], isLoading: false });

    renderWithClient(<PoliciesPage />);

    expect(screen.queryByText('Create Policy')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Archive')).toBeNull();
  });

  it('admin sees write controls', () => {
    (useAuth as any).mockReturnValue({ role: 'admin' });
    (usePolicies as any).mockReturnValue({
      data: [{ id: '1', name: 'Test Policy', pillar: 'governance', version: '1.0', effective_date: '2023-01-01', requires_ack: true }],
      isLoading: false
    });

    renderWithClient(<PoliciesPage />);

    expect(screen.getByText('Create Policy')).toBeDefined();
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Archive')).toBeDefined();
  });
});
