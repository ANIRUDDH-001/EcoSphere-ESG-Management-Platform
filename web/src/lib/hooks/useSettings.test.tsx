import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettings } from './useSettings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../supabaseClient', () => ({
  supabaseClient: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 1,
          env_weight: 0.4,
          social_weight: 0.3,
          gov_weight: 0.3,
          auto_emission_enabled: true,
          evidence_required_enabled: false,
          badge_auto_award_enabled: true,
          notify_in_app: true,
          notify_email: false,
        },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('useSettings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches settings successfully', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(result.current.settings).toBeDefined());
    
    expect(result.current.settings?.env_weight).toBe(0.4);
    expect(result.current.settings?.auto_emission_enabled).toBe(true);
  });
});
