import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompliancePage } from './CompliancePage';
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

describe('CompliancePage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(hooks.useCreateIssue).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(hooks.useUpdateIssueStatus).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  it('renders loading state initially', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useIssues).mockReturnValue({ data: undefined, isLoading: true } as any);

    renderWithProviders(<CompliancePage />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders issues and new issue button for admin', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any);
    vi.mocked(hooks.useIssues).mockReturnValue({ 
      data: [{ id: '1', description: 'Test Issue', status: 'open', severity: 'high', due_date: '2023-01-01', profiles: { full_name: 'John' } }], 
      isLoading: false 
    } as any);
    
    renderWithProviders(<CompliancePage />);
    expect(screen.getByText('New Issue')).toBeDefined();
    expect(screen.getByText('Test Issue')).toBeDefined();
  });

  it('hides new issue button and actions for employee', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'employee' } as any);
    vi.mocked(hooks.useIssues).mockReturnValue({ 
      data: [{ id: '1', description: 'Test Issue', status: 'open', severity: 'high', due_date: '2023-01-01' }], 
      isLoading: false 
    } as any);

    renderWithProviders(<CompliancePage />);
    expect(screen.queryByText('New Issue')).toBeNull();
  });
});
