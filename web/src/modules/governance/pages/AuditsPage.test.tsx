import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditsPage } from './AuditsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../../lib/hooks/useAuth';
import * as hooks from '../hooks';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../../lib/hooks/useAuth');
vi.mock('../hooks');

const queryClient = new QueryClient();

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AuditsPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(hooks.useCreateAudit).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(hooks.useCompleteAudit).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  it('renders loading state initially', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useAudits).mockReturnValue({ data: undefined, isLoading: true } as any);

    renderWithProviders(<AuditsPage />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders audits and schedule button for admin', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useAudits).mockReturnValue({ 
      data: [{ id: '1', title: 'Test Audit', status: 'open', result: null, scheduled_date: '2023-01-01', departments: { name: 'IT' }, profiles: { full_name: 'John' } }], 
      isLoading: false 
    } as any);
    
    renderWithProviders(<AuditsPage />);
    expect(screen.getByText('Schedule Audit')).toBeDefined();
    expect(screen.getByText('Test Audit')).toBeDefined();
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('hides schedule button and actions for employee', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useAudits).mockReturnValue({ 
      data: [{ id: '1', title: 'Test Audit', status: 'open', result: null, scheduled_date: '2023-01-01' }], 
      isLoading: false 
    } as any);

    renderWithProviders(<AuditsPage />);
    expect(screen.queryByText('Schedule Audit')).toBeNull();
    expect(screen.queryByText('Complete')).toBeNull();
  });
});
