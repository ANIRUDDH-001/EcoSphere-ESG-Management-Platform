import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth';
import { queryClient } from './lib/queryClient';
import { router } from './app/router';
import { NotificationBell } from './modules/notifications/components/NotificationBell';
import { NotificationSettings } from './modules/notifications/components/NotificationSettings';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <NotificationBell />
        <NotificationSettings />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
