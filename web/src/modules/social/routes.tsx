import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const socialRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Social" /> },
  { path: 'csr', element: <StubPage title="CSR" /> },
  { path: 'participation', element: <StubPage title="Participation" /> },
  { path: 'diversity', element: <StubPage title="Diversity" /> }
];
