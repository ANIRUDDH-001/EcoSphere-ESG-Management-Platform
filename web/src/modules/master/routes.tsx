import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const masterRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Master Data" /> }
];
