import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const settingsRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Settings" /> }
];
