import type { RouteObject } from 'react-router-dom';
import { EnvironmentalDashboardPage } from './pages/EnvironmentalDashboardPage';
import { CarbonPage } from './pages/CarbonPage';
import { Goals } from './pages/Goals';

export const environmentalRoutes: RouteObject[] = [
  { index: true, element: <EnvironmentalDashboardPage /> },
  { path: 'carbon', element: <CarbonPage /> },
  { path: 'goals', element: <Goals /> }
];
