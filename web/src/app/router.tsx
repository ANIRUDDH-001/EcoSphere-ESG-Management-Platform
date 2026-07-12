import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from './layout';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '../modules/auth/LoginPage';
import { Gallery } from '../components/_gallery';

// Module Route Registries
import { dashboardRoutes } from '../modules/dashboard/routes';
import { environmentalRoutes } from '../modules/environmental/routes';
import { socialRoutes } from '../modules/social/routes';
import { governanceRoutes } from '../modules/governance/routes';
import { gamificationRoutes } from '../modules/gamification/routes';
import { reportsRoutes } from '../modules/reports/routes';
import { copilotRoutes } from '../modules/copilot/routes';
import { notificationsRoutes } from '../modules/notifications/routes';
import { settingsRoutes } from '../modules/settings/routes';
import { masterRoutes } from '../modules/master/routes';
import { adminRoutes } from '../modules/admin/routes';

export const routes = [
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/_gallery',
    element: <Gallery />
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      ...dashboardRoutes,
      {
        path: 'environmental',
        children: environmentalRoutes
      },
      {
        path: 'social',
        children: socialRoutes
      },
      {
        path: 'governance',
        children: governanceRoutes
      },
      {
        path: 'gamification',
        children: gamificationRoutes
      },
      {
        path: 'reports',
        children: reportsRoutes
      },
      {
        path: 'copilot',
        children: copilotRoutes
      },
      {
        path: 'notifications',
        children: notificationsRoutes
      },
      {
        path: 'settings',
        element: <RequireRole roles={['admin', 'manager']}><Outlet /></RequireRole>,
        children: settingsRoutes
      },
      {
        path: 'master',
        element: <RequireRole roles={['admin', 'manager']}><Outlet /></RequireRole>,
        children: masterRoutes
      },
      {
        path: 'admin',
        element: <RequireRole roles={['admin']}><Outlet /></RequireRole>,
        children: adminRoutes
      }
    ]
  }
];

export const router = createBrowserRouter(routes);
