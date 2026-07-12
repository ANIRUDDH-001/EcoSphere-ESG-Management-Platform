import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';
import { EmissionFactors } from '../environmental/pages/EmissionFactors';

export const masterRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Master Data" /> },
  { path: 'emission-factors', element: <EmissionFactors /> }
];
