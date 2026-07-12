import type { RouteObject } from 'react-router-dom';
import { CopilotPage } from './pages/CopilotPage';

export const copilotRoutes: RouteObject[] = [
  { index: true, element: <CopilotPage /> }
];
