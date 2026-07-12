import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const environmentalRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Environmental" /> },
  { path: 'carbon', element: <StubPage title="Carbon" /> },
  { path: 'goals', element: <StubPage title="Goals" /> }
];
