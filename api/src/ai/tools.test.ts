import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copilotTools } from './tools';

const mockDb = {
  from: vi.fn()
};

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() }
}));

describe('Copilot Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockQuery = (data: any) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error: null }),
      then: (cb: any) => Promise.resolve({ data, error: null }).then(cb)
    };
    mockDb.from.mockReturnValue(query);
    return query;
  };

  it('get_org_score returns structured data', async () => {
    setupMockQuery({ overall_esg: 80, environmental: 70, social: 85, governance: 90 });
    const res = await copilotTools.get_org_score(mockDb as any, {});
    expect(res).toEqual({ overall: 80, environmental: 70, social: 85, governance: 90 });
  });

  it('get_emissions_trend aggregates properly by monthly', async () => {
    setupMockQuery([
      { date: '2026-01-15T00:00:00.000Z', co2e: 100 },
      { date: '2026-01-20T00:00:00.000Z', co2e: 50 },
      { date: '2026-02-10T00:00:00.000Z', co2e: 200 }
    ]);
    const res = await copilotTools.get_emissions_trend(mockDb as any, { period: 'monthly' });
    expect(res).toEqual([
      { bucket: '2026-01', co2e: 150 },
      { bucket: '2026-02', co2e: 200 }
    ]);
  });
  
  it('get_emissions_trend aggregates properly by quarterly', async () => {
    setupMockQuery([
      { date: '2026-01-15T00:00:00.000Z', co2e: 100 },
      { date: '2026-04-20T00:00:00.000Z', co2e: 50 }
    ]);
    const res = await copilotTools.get_emissions_trend(mockDb as any, { period: 'quarterly' });
    expect(res).toEqual([
      { bucket: '2026-Q1', co2e: 100 },
      { bucket: '2026-Q2', co2e: 50 }
    ]);
  });

  it('get_participation_stats calculates rates', async () => {
    mockDb.from.mockImplementation((table: string) => {
      const q = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: (cb: any) => {
          if (table === 'employee_participations' || table === 'challenge_participations') {
             return Promise.resolve({ data: [
                { employee_id: 'e1', approval_status: 'approved' },
                { employee_id: 'e2', approval_status: 'pending' }
             ], error: null }).then(cb);
          }
          return Promise.resolve({ data: [], error: null }).then(cb);
        }
      };
      return q;
    });
    
    const res = await copilotTools.get_participation_stats(mockDb as any, {});
    // 4 participations total (2 csr, 2 chal)
    // 2 approved
    // employees: e1, e2 -> 2
    expect(res.rate).toBe((2 / 4) * 100);
    expect(res.approved).toBe(2);
    expect(res.employees).toBe(2);
  });
  
  it('get_leaderboard passes limit', async () => {
    const q = setupMockQuery([{ full_name: 'Alice', xp: 500 }]);
    await copilotTools.get_leaderboard(mockDb as any, { limit: 5 });
    expect(q.limit).toHaveBeenCalledWith(5);
  });
});
