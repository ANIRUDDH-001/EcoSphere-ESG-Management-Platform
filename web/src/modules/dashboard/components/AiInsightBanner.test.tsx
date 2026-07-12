import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { AiInsightBanner } from './AiInsightBanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '../api';

afterEach(cleanup);

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('AiInsightBanner', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders summary and top recommendation from the endpoint', async () => {
    vi.spyOn(api, 'postInsights').mockResolvedValueOnce({
      summary: 'Mocked summary from endpoint.',
      recommendations: ['Mocked recommendation 1.', 'Mocked recommendation 2.'],
      fallback: false,
      cached: false
    });

    renderWithProviders(<AiInsightBanner />);

    // Wait for the banner to render data
    await waitFor(() => {
      expect(screen.getByText('Mocked summary from endpoint.')).toBeDefined();
    });

    expect(screen.getByText(/Mocked recommendation 1./)).toBeDefined();
    expect(screen.getByText('AI-generated insight')).toBeDefined();
    expect(screen.queryByText('Mocked recommendation 2.')).toBeNull(); // It's hidden initially

    // Click "View all" to expand
    fireEvent.click(screen.getByRole('button', { name: /View all/i }));
    
    expect(screen.getByText('Mocked recommendation 2.')).toBeDefined();
  });

  it('renders fallback response as a normal banner', async () => {
    vi.spyOn(api, 'postInsights').mockResolvedValueOnce({
      summary: 'Fallback summary.',
      recommendations: ['Fallback rec.'],
      fallback: true,
      cached: false
    });

    renderWithProviders(<AiInsightBanner />);

    await waitFor(() => {
      expect(screen.getByText('Fallback summary.')).toBeDefined();
    });

    expect(screen.getByText(/Fallback rec./)).toBeDefined();
    expect(screen.getByText('Based on latest data')).toBeDefined();
    expect(screen.queryByText('AI-generated insight')).toBeNull();
  });

  it('refresh re-queries the endpoint', async () => {
    const postMock = vi.spyOn(api, 'postInsights');
    
    postMock.mockResolvedValueOnce({
      summary: 'Initial summary',
      recommendations: [],
      fallback: false,
      cached: true
    });

    renderWithProviders(<AiInsightBanner />);

    await waitFor(() => {
      expect(screen.getByText('Initial summary')).toBeDefined();
    });
    
    expect(postMock).toHaveBeenCalledTimes(1);

    postMock.mockResolvedValueOnce({
      summary: 'Refreshed summary',
      recommendations: [],
      fallback: false,
      cached: false
    });

    fireEvent.click(screen.getByTitle('Refresh Insights'));

    await waitFor(() => {
      expect(screen.getByText('Refreshed summary')).toBeDefined();
    });

    expect(postMock).toHaveBeenCalledTimes(2);
  });
});
