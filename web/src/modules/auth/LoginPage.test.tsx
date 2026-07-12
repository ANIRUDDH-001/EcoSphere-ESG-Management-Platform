import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '../../lib/hooks/useAuth';

vi.mock('../../lib/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
  });
  it('shows error on invalid credentials', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    (useAuth as any).mockReturnValue({ signIn: mockSignIn });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeTruthy();
    });
  });

  it('redirects on success', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    (useAuth as any).mockReturnValue({ signIn: mockSignIn });

    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(window.location.href).toBe('/');
    });

    window.location = originalLocation as any;
  });
});
