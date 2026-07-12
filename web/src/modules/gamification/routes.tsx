import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const gamificationRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Gamification" /> },
  { path: 'challenges', element: <StubPage title="Challenges" /> },
  { path: 'leaderboard', element: <StubPage title="Leaderboard" /> },
  { path: 'rewards', element: <StubPage title="Rewards" /> },
  { path: 'badges', element: <StubPage title="Badges" /> }
];
