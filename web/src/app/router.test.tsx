import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useAuth } from '../lib/hooks/useAuth';

vi.mock('../lib/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../modules/environmental/hooks', () => ({
  useEnvDashboard: () => ({
    deptEms: [],
    carbonTxns: [],
    goals: [],
    isLoading: false
  })
}));

describe('App Router', () => {
  afterEach(() => {
    cleanup();
  });

  it('redirects unauthenticated user to /login', async () => {
    (useAuth as any).mockReturnValue({
      session: null,
      loading: false,
      role: null
    });
    
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    
    await waitFor(() => {
      // should render login page
      expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
    });
  });

  it('renders known route stub when authenticated', async () => {
    (useAuth as any).mockReturnValue({
      session: { user: { id: '1' } },
      loading: false,
      role: 'employee',
      profile: { email: 'emp@test' }
    });
    
    const router = createMemoryRouter(routes, { initialEntries: ['/environmental'] });
    render(<RouterProvider router={router} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Environmental Dashboard').length).toBeGreaterThan(0);
    });
  });

  it('blocks employee from admin route', async () => {
    (useAuth as any).mockReturnValue({
      session: { user: { id: '1' } },
      loading: false,
      role: 'employee',
      profile: { email: 'emp@test' }
    });
    
    const router = createMemoryRouter(routes, { initialEntries: ['/admin/users'] });
    render(<RouterProvider router={router} />);
    
    await waitFor(() => {
      // Expect not to see 'Users', but instead 'Dashboard' (since it redirected to root)
      expect(screen.queryByText('Users')).toBeNull();
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });
  });
});
