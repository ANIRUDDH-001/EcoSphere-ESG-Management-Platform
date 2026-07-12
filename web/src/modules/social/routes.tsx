import type { RouteObject } from 'react-router-dom';
import { SocialDashboard } from './pages/SocialDashboard';
import { CsrActivitiesPage } from './pages/CsrActivitiesPage';
import { ParticipationPage } from './pages/ParticipationPage';
import { DiversityPage } from './pages/DiversityPage';
import { TrainingPage } from './pages/TrainingPage';

export const socialRoutes: RouteObject[] = [
  { index: true, element: <SocialDashboard /> },
  { path: 'csr', element: <CsrActivitiesPage /> },
  { path: 'participation', element: <ParticipationPage /> },
  { path: 'diversity', element: <DiversityPage /> },
  { path: 'training', element: <TrainingPage /> },
];
