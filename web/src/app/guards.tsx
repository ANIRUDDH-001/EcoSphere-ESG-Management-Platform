import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks/useAuth';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export const RequireRole = ({ roles, children }: { roles: string[], children: ReactNode }) => {
  const { role, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};
