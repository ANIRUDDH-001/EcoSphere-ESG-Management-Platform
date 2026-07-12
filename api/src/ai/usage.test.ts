import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUserLimit, recordUsage, modelUsageToday } from './usage.js';

vi.mock('../config', () => ({
  getConfig: vi.fn(() => ({
    SUPABASE_URL: 'http://localhost',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    AI_MINUTE_LIMIT: 2,
    AI_DAILY_LIMIT: 5
  }))
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert
    }))
  }))
}));

describe('Usage Ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ gte: mockGte });
    mockGte.mockResolvedValue({ count: 0, error: null });
    
    mockInsert.mockResolvedValue({ error: null });
  });

  describe('checkUserLimit', () => {
    it('should allow user under limits', async () => {
      mockGte.mockResolvedValue({ count: 0, error: null });
      const res = await checkUserLimit('user-1');
      expect(res.allowed).toBe(true);
      expect(res.dayRemaining).toBe(5);
      expect(res.minuteRemaining).toBe(2);
    });

    it('should block user over daily limit', async () => {
      mockGte.mockResolvedValueOnce({ count: 5, error: null }); // day
      mockGte.mockResolvedValueOnce({ count: 0, error: null }); // minute
      
      const res = await checkUserLimit('user-1');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('day');
      expect(res.dayRemaining).toBe(0);
      expect(res.minuteRemaining).toBe(2);
    });

    it('should block user over minute limit', async () => {
      mockGte.mockResolvedValueOnce({ count: 2, error: null }); // day
      mockGte.mockResolvedValueOnce({ count: 2, error: null }); // minute
      
      const res = await checkUserLimit('user-1');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('minute');
      expect(res.dayRemaining).toBe(3);
      expect(res.minuteRemaining).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should insert exactly one row with right kind', async () => {
      await recordUsage('user-1', 'gemini-3.1-flash-lite', 'copilot');
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        model: 'gemini-3.1-flash-lite',
        kind: 'copilot'
      });
    });
  });

  describe('modelUsageToday', () => {
    it('should count only today / last 60s rows for given model', async () => {
      mockGte.mockResolvedValueOnce({ count: 100, error: null }); // rpd
      mockGte.mockResolvedValueOnce({ count: 5, error: null });   // rpm
      
      const res = await modelUsageToday('gemma-4-31b');
      expect(res.rpdUsed).toBe(100);
      expect(res.rpmUsed).toBe(5);
    });
  });
});
