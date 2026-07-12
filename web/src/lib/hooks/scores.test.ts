import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrgScore, useDepartmentScores, useScoreTrend, subscribeScores } from './scores';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabaseClient } from '../supabaseClient';

vi.mock('../supabaseClient', () => {
  const mSupabase = {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  };
  return { supabaseClient: mSupabase };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(QueryClientProvider, { client: queryClient }, children)
);

describe('Score Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('useOrgScore returns the latest snapshot', async () => {
    const mockData = {
      overall_esg: '75',
      environmental: '80',
      social: '70',
      governance: '75',
    };
    const mSelect = vi.fn().mockReturnThis();
    const mOrder = vi.fn().mockReturnThis();
    const mLimit = vi.fn().mockReturnThis();
    const mSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

    (supabaseClient.from as any).mockReturnValue({
      select: mSelect,
      order: mOrder,
      limit: mLimit,
      single: mSingle,
    });

    const { result } = renderHook(() => useOrgScore(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual({
      overall: 75,
      environmental: 80,
      social: 70,
      governance: 75,
    });
    expect(supabaseClient.from).toHaveBeenCalledWith('org_score_snapshots');
  });

  it('useDepartmentScores returns rows', async () => {
    const mockData = [{ department_id: '123', total_score: 80 }];
    const mSelect = vi.fn().mockResolvedValue({ data: mockData, error: null });

    (supabaseClient.from as any).mockReturnValue({
      select: mSelect,
    });

    const { result } = renderHook(() => useDepartmentScores(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('useScoreTrend returns rows', async () => {
    const mockData = [{ snapshot_date: '2026-07-01', overall_esg: 80 }];
    const mSelect = vi.fn().mockReturnThis();
    const mGte = vi.fn().mockReturnThis();
    const mOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

    (supabaseClient.from as any).mockReturnValue({
      select: mSelect,
      gte: mGte,
      order: mOrder,
    });

    const { result } = renderHook(() => useScoreTrend(30), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('subscribeScores invokes onChange when a score updates', () => {
    const mOn1 = vi.fn().mockReturnThis();
    const mOn2 = vi.fn().mockReturnThis();
    const mSubscribe = vi.fn().mockReturnThis();

    (supabaseClient.channel as any).mockReturnValue({
      on: vi.fn((event, config, cb) => {
        if (config.table === 'department_scores') {
          mOn1(event, config, cb);
          // Simulate an event
          cb();
        } else {
          mOn2(event, config, cb);
        }
        return {
          on: mOn2,
          subscribe: mSubscribe,
        };
      }),
    });

    const onChange = vi.fn();
    const unsubscribe = subscribeScores(onChange);

    expect(supabaseClient.channel).toHaveBeenCalledWith('scores_realtime');
    expect(onChange).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    expect(supabaseClient.removeChannel).toHaveBeenCalled();
  });
});
