import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './useAuth';
import { supabaseClient } from '../supabaseClient';
import type { ReactNode } from 'react';

vi.mock('../supabaseClient', () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('initializes with session and fetches profile', async () => {
    const mockSession = { user: { id: 'user-1' } };
    const mockProfile = { id: 'user-1', role: 'admin' };

    (supabaseClient.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
    (supabaseClient.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });

    (supabaseClient.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.role).toBe('admin');
  });

  it('clears session on sign out', async () => {
    let changeCallback: any;
    
    (supabaseClient.auth.getSession as any).mockResolvedValue({ data: { session: { user: { id: '1' } } } });
    (supabaseClient.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      changeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', role: 'employee' }, error: null });

    (supabaseClient.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.role).toBe('employee');
    });

    // Simulate sign out via onAuthStateChange
    changeCallback('SIGNED_OUT', null);

    await waitFor(() => {
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.role).toBeNull();
    });
  });
});
