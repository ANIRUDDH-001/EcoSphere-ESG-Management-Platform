import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const notificationsRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Notifications" /> }
];
