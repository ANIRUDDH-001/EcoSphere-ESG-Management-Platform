import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const dashboardRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Dashboard" /> }
];
