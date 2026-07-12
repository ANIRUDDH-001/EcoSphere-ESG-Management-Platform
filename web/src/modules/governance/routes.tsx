import type { RouteObject } from 'react-router-dom';
import { GovernanceDashboardPage } from './pages/GovernanceDashboardPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { AuditsPage } from './pages/AuditsPage';
import { CompliancePage } from './pages/CompliancePage';
import { AcknowledgementsPage } from './pages/AcknowledgementsPage';

export const governanceRoutes: RouteObject[] = [
  { index: true, element: <GovernanceDashboardPage /> },
  { path: 'policies', element: <PoliciesPage /> },
  { path: 'acknowledgements', element: <AcknowledgementsPage /> },
  { path: 'audits', element: <AuditsPage /> },
  { path: 'compliance', element: <CompliancePage /> }
];
