import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const reportsRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Reports" /> }
];
