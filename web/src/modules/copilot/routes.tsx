import type { RouteObject } from 'react-router-dom';
import { StubPage } from '../../components/StubPage';

export const copilotRoutes: RouteObject[] = [
  { index: true, element: <StubPage title="Copilot" /> }
];
