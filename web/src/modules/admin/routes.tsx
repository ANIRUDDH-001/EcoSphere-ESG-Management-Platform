import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const adminRoutes: RouteObject[] = [
  { path: 'users', element: <StubPage title="Users" /> }
];
