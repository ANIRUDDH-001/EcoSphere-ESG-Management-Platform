import type { RouteObject } from 'react-router-dom';
import { ReportsPage } from './pages/ReportsPage';

export const reportsRoutes: RouteObject[] = [
  { index: true, element: <ReportsPage /> }
];
