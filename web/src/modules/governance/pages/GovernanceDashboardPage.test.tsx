import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovernanceDashboardPage } from './GovernanceDashboardPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as hooks from '../hooks';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../hooks');

const queryClient = new QueryClient();

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('GovernanceDashboardPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    vi.mocked(hooks.useGovDashboard).mockReturnValue({ data: undefined, isLoading: true } as any);
    renderWithProviders(<GovernanceDashboardPage />);
    expect(screen.getByText('Governance Dashboard')).toBeDefined();
  });

  it('renders statistics and top issues', () => {
    vi.mocked(hooks.useGovDashboard).mockReturnValue({
      data: {
        ackRate: 85.5,
        passRate: 90.0,
        openCount: 5,
        overdueCount: 2,
        severityBreakdown: { low: 1, medium: 2, high: 1, critical: 1 },
        topOverdueIssues: [
          { id: '1', description: 'Test Overdue Issue', severity: 'high', due_date: '2023-01-01' }
        ]
      },
      isLoading: false
    } as any);

    renderWithProviders(<GovernanceDashboardPage />);
    
    // Check main stats
    expect(screen.getByText('85.5%')).toBeDefined();
    expect(screen.getByText('90.0%')).toBeDefined();
    
    // Check specific issue
    expect(screen.getByText('Test Overdue Issue')).toBeDefined();
    expect(screen.getByText(/Due: /)).toBeDefined();
  });
});
