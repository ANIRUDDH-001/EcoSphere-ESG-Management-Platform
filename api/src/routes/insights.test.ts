import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import insights from './insights.js';
import * as usageModule from '../ai/usage.js';
import * as routerModule from '../ai/router.js';
import * as snapshotModule from '../ai/snapshot.js';
import { UpstreamAiError } from '../errors.js';

const mockDb = {
  from: vi.fn()
};

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', 'user-1');
    c.set('logger', { info: vi.fn(), warn: vi.fn(), error: vi.fn() });
    await next();
  },
  getUserSupabase: () => mockDb
}));

vi.mock('../ai/usage', () => ({
  checkUserLimit: vi.fn()
}));

vi.mock('../ai/router', () => ({
  generate: vi.fn()
}));

vi.mock('../ai/snapshot', () => ({
  buildScoreSnapshot: vi.fn()
}));

const app = new Hono();
app.route('/insights', insights);

describe('POST /insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupCacheHit = (payload: any) => {
    const q = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: payload ? { payload } : null })
    };
    const upsert = vi.fn();
    mockDb.from = vi.fn().mockReturnValue({ ...q, upsert });
    return { q, upsert };
  };

  it('rejects over-limit user with 429', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: false, reason: 'minute', minuteRemaining: 0, dayRemaining: 10
    });

    const res = await app.request('/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ scope: 'org' })
    });

    expect(res.status).toBe(429);
    expect(snapshotModule.buildScoreSnapshot).not.toHaveBeenCalled();
  });

  it('first call cached:false, saves to cache', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    const mockSnapshot = {
      scope: 'Organization',
      scores: { total: 80, environmental: 70, social: 80, governance: 90 },
      lowestPillar: 'Environmental',
      drivers: { overdueIssues: 5, participationRate: 50, goalsCompleted: 1 }
    };
    vi.mocked(snapshotModule.buildScoreSnapshot).mockResolvedValue(mockSnapshot);

    const { upsert } = setupCacheHit(null); // cache miss

    vi.mocked(routerModule.generate).mockResolvedValue({
      text: JSON.stringify({ summary: 'Hello', recommendations: ['World'] }),
      modelUsed: 'test-model',
      attempts: 1,
      mock: false
    });

    const res = await app.request('/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ scope: 'org' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(false);
    expect(data.fallback).toBe(false);
    expect(data.summary).toBe('Hello');
    expect(upsert).toHaveBeenCalledTimes(1); // saved to cache
  });

  it('identical second call cached:true (no new usage row / no model call)', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    vi.mocked(snapshotModule.buildScoreSnapshot).mockResolvedValue({
      scope: 'Organization'
    } as any);

    setupCacheHit({ summary: 'Cached sum', recommendations: ['Cached rec'] }); // cache hit

    const res = await app.request('/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ scope: 'org' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(data.summary).toBe('Cached sum');
    expect(routerModule.generate).not.toHaveBeenCalled();
  });

  it('Forced failure -> deterministic template, fallback:true', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    const mockSnapshot = {
      scope: 'Organization',
      scores: { total: 42, environmental: 20, social: 50, governance: 60 },
      lowestPillar: 'Environmental',
      drivers: { overdueIssues: 10, participationRate: 0, goalsCompleted: 0 }
    };
    vi.mocked(snapshotModule.buildScoreSnapshot).mockResolvedValue(mockSnapshot);

    setupCacheHit(null);

    vi.mocked(routerModule.generate).mockRejectedValue(new UpstreamAiError('Fail'));

    const res = await app.request('/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ scope: 'org' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.summary).toContain('42');
    expect(data.summary).toContain('Environmental');
    expect(data.recommendations[0]).toContain('10');
  });
});
