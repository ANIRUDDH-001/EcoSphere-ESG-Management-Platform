import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ParticipationTeaser } from './ParticipationTeaser';
import { LeaderboardTeaser } from './LeaderboardTeaser';
import { BrowserRouter } from 'react-router-dom';



afterEach(cleanup);

describe('Dashboard Teasers (Cross-module)', () => {
  it('ParticipationTeaser gracefully degrades when Track B is missing', async () => {
    // Dynamic import will reject in this environment because the file doesn't exist yet
    render(
      <BrowserRouter>
        <ParticipationTeaser />
      </BrowserRouter>
    );

    // Should eventually show the empty state
    await waitFor(() => {
      expect(screen.getByText('Participation metrics unavailable.')).toBeDefined();
    });

    // Link should point to /social
    const link = screen.getByRole('link', { name: /explore social/i });
    expect(link.getAttribute('href')).toBe('/social');
  });

  it('LeaderboardTeaser gracefully degrades when Track B is missing', async () => {
    render(
      <BrowserRouter>
        <LeaderboardTeaser />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaderboard unavailable.')).toBeDefined();
    });

    // Link should point to /gamification/leaderboard
    const link = screen.getByRole('link', { name: /explore gamification/i });
    expect(link.getAttribute('href')).toBe('/gamification/leaderboard');
  });
});
