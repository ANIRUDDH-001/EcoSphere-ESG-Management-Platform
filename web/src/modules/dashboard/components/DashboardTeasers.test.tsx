import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParticipationTeaser } from './ParticipationTeaser';
import { LeaderboardTeaser } from './LeaderboardTeaser';
import { BrowserRouter } from 'react-router-dom';

// Track B is merged: the teasers dynamically import the social/gamification hooks.
// Mock those hook modules so the teasers render their real "data present" content
// without hitting Supabase.
vi.mock('../../social/hooks', () => ({
  useParticipationSummary: () => ({
    data: { participationRate: 62.5, approvedCount: 10, totalEmployees: 16, recentByDept: [] },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../../gamification/hooks', () => ({
  useLeaderboard: () => ({
    data: [
      { id: '1', full_name: 'Ada Lovelace', email: 'ada@x', xp: 320, points_balance: 40, department_id: null },
      { id: '2', full_name: 'Alan Turing', email: 'alan@x', xp: 210, points_balance: 20, department_id: null },
    ],
    isLoading: false,
    isError: false,
  }),
}));

const wrap = (el: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>{el}</BrowserRouter>
    </QueryClientProvider>
  );
};

afterEach(cleanup);

describe('Dashboard Teasers (Cross-module)', () => {
  it('ParticipationTeaser renders participation data from Track B', async () => {
    render(wrap(<ParticipationTeaser />));

    await waitFor(() => {
      expect(screen.getByText('62.5%')).toBeDefined();
    });

    expect(screen.getByText(/10 \/ 16 employees active/)).toBeDefined();
    const link = screen.getByRole('link', { name: /view social module/i });
    expect(link.getAttribute('href')).toBe('/social');
  });

  it('LeaderboardTeaser renders leaderboard data from Track B', async () => {
    render(wrap(<LeaderboardTeaser />));

    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeDefined();
    });

    expect(screen.getByText('Alan Turing')).toBeDefined();
    expect(screen.getByText('320 XP')).toBeDefined();
    const link = screen.getByRole('link', { name: /view leaderboard/i });
    expect(link.getAttribute('href')).toBe('/gamification/leaderboard');
  });
});
