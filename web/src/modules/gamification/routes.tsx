import type { RouteObject } from 'react-router-dom';
import { GamificationDashboard } from './pages/GamificationDashboard';
import { ChallengesPage } from './pages/ChallengesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { RewardsPage } from './pages/RewardsPage';
import { BadgesPage } from './pages/BadgesPage';
import { CategoriesPage } from './pages/CategoriesPage';

export const gamificationRoutes: RouteObject[] = [
  { index: true, element: <GamificationDashboard /> },
  { path: 'challenges', element: <ChallengesPage /> },
  { path: 'leaderboard', element: <LeaderboardPage /> },
  { path: 'rewards', element: <RewardsPage /> },
  { path: 'badges', element: <BadgesPage /> },
  { path: 'categories', element: <CategoriesPage /> }
];
