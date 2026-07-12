import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsPage } from './Settings';
import { useSettings } from '@/lib/hooks/useSettings';
import { useAuth } from '@/lib/hooks/useAuth';

vi.mock('@/lib/hooks/useSettings', () => ({
  useSettings: vi.fn(),
}));
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('SettingsPage', () => {
  it('renders settings and handles weight validation', async () => {
    (useAuth as any).mockReturnValue({ role: 'admin' });
    const mockUpdateSettings = vi.fn().mockResolvedValue({});
    (useSettings as any).mockReturnValue({
      settings: {
        env_weight: 0.4,
        social_weight: 0.3,
        gov_weight: 0.3,
        auto_emission_enabled: true,
      },
      isLoading: false,
      updateSettings: mockUpdateSettings,
    });

    render(<SettingsPage />);

    expect(screen.getByText(/Platform Settings/i)).toBeTruthy();
    expect(screen.getByText('Environmental Weight (40%)')).toBeTruthy();

    const saveBtn = screen.getByRole('button', { name: /Save Weights/i });
    
    // Valid weights initially
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        env_weight: 0.4,
        social_weight: 0.3,
        gov_weight: 0.3,
      });
    });
  });
});
