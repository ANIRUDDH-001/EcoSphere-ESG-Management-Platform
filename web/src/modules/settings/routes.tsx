import type { RouteObject } from 'react-router-dom';
import { SettingsPage } from './pages/Settings';

export const settingsRoutes: RouteObject[] = [
  { index: true, element: <SettingsPage /> }
];
