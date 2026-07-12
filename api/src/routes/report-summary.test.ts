import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import reportSummary from './report-summary.js';
import * as usageModule from '../ai/usage.js';
import * as routerModule from '../ai/router.js';
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

const app = new Hono();
app.route('/report-summary', reportSummary);

describe('POST /report-summary', () => {
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

    const res = await app.request('/report-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ title: 'Q3', period: 'Q3', metrics: {} })
    });

    expect(res.status).toBe(429);
    expect(routerModule.generate).not.toHaveBeenCalled();
  });

  it('Summary references only metrics present in the payload (grounding), miss -> cache', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    const { upsert } = setupCacheHit(null); // cache miss

    vi.mocked(routerModule.generate).mockResolvedValue({
      text: JSON.stringify({ summary: 'Hello from model' }),
      modelUsed: 'test-model',
      attempts: 1,
      mock: false
    });

    const payload = { title: 'Q3', period: 'Q3', metrics: { e: 80 } };
    const res = await app.request('/report-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(false);
    expect(data.fallback).toBe(false);
    expect(data.summary).toBe('Hello from model');
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('Cache hit on identical payload; miss when a metric changes', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    setupCacheHit({ summary: 'Cached sum' });

    const payload = { title: 'Q3', period: 'Q3', metrics: { e: 80 } };
    const res = await app.request('/report-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(data.summary).toBe('Cached sum');
    expect(routerModule.generate).not.toHaveBeenCalled();
  });

  it('Forced failure -> deterministic templated summary, fallback:true', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    setupCacheHit(null);

    vi.mocked(routerModule.generate).mockRejectedValue(new UpstreamAiError('Fail'));

    const payload = { title: 'Q3 Report', period: 'Q3', metrics: { Emissions: 42, Social: 50 } };
    const res = await app.request('/report-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.summary).toBe('Q3 Report shows Emissions at 42 and Social at 50.');
  });
});
