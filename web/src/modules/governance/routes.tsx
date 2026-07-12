import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const governanceRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Governance" /> },
  { path: 'policies', element: <StubPage title="Policies" /> },
  { path: 'audits', element: <StubPage title="Audits" /> },
  { path: 'compliance', element: <StubPage title="Compliance" /> }
];
