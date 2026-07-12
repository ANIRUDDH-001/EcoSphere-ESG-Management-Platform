import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as scoreHooks from '../../../lib/hooks/scores';
import { BrowserRouter } from 'react-router-dom';

// Mock the data hook so we don't need to mock all API calls
vi.mock('../hooks', () => ({
  useDashboardData: vi.fn().mockReturnValue({
    orgScore: { overall: 85, environmental: 80, social: 90, governance: 85 },
    trend: [],
    isLoading: false,
    isError: false,
  }),
  useInsights: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isFetching: false,
  })
}));

vi.mock('../../../lib/hooks/scores', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    subscribeScores: vi.fn(),
  };
});

describe('DashboardPage realtime', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('subscribes to realtime updates, invalidates queries on event, and unsubscribes on unmount', () => {
    let changeCallback: (() => void) | undefined;
    const unsubscribeMock = vi.fn();
    
    vi.mocked(scoreHooks.subscribeScores).mockImplementation((onChange: () => void) => {
      changeCallback = onChange;
      return unsubscribeMock;
    });

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(scoreHooks.subscribeScores).toHaveBeenCalled();
    expect(changeCallback).toBeDefined();

    // Trigger mocked realtime event
    changeCallback!();

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['org_score'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['department_scores'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['score_trend'] });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
