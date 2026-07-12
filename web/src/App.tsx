import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/hooks/useAuth';
import { queryClient } from './lib/queryClient';
import { LoginPage } from './modules/auth/LoginPage';
import './App.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
