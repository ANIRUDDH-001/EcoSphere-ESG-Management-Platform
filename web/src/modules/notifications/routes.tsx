import type { RouteObject } from 'react-router-dom';
import { NotificationsPage } from './pages/NotificationsPage';

export const notificationsRoutes: RouteObject[] = [
  { index: true, element: <NotificationsPage /> }
];
