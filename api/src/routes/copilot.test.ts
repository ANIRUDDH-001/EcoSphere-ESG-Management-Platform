import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import copilot from './copilot';
import * as usageModule from '../ai/usage';
import * as routerModule from '../ai/router';
import * as toolsModule from '../ai/tools';
import { UpstreamAiError } from '../errors';

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', 'user-1');
    c.set('logger', { info: vi.fn(), warn: vi.fn(), error: vi.fn() });
    await next();
  },
  getUserSupabase: vi.fn()
}));

vi.mock('../ai/usage', () => ({
  checkUserLimit: vi.fn()
}));

vi.mock('../ai/router', () => ({
  generate: vi.fn()
}));

vi.mock('../ai/tools', () => ({
  copilotTools: {
    get_org_score: vi.fn()
  },
  toolDeclarations: []
}));

const app = new Hono();
app.route('/copilot', copilot);

describe('POST /copilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects over-limit user with 429', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: false, reason: 'minute', minuteRemaining: 0, dayRemaining: 10
    });

    const res = await app.request('/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ message: 'hello' })
    });

    expect(res.status).toBe(429);
    expect(routerModule.generate).not.toHaveBeenCalled();
  });

  it('handles "What is our ESG score?" -> grounded answer with tools', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });

    vi.mocked(toolsModule.copilotTools.get_org_score as any).mockResolvedValue({ overall: 85 });

    vi.mocked(routerModule.generate)
      .mockResolvedValueOnce({
        text: '',
        toolCalls: [{ id: '1', name: 'get_org_score', args: {} }],
        modelUsed: 'test-model',
        attempts: 1,
        mock: false
      })
      .mockResolvedValueOnce({
        text: 'The score is 85.',
        modelUsed: 'test-model',
        attempts: 1,
        mock: false
      });

    const res = await app.request('/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ message: 'What is our ESG score?' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBe('The score is 85.');
    expect(data.grounded).toBe(true);
    expect(data.fallback).toBe(false);
    expect(data.usedTools).toContain('get_org_score');
  });

  it('Forced UpstreamAiError -> deterministic fallback', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });
    
    vi.mocked(toolsModule.copilotTools.get_org_score as any).mockResolvedValue({ overall: 42 });
    
    vi.mocked(routerModule.generate)
      .mockResolvedValueOnce({
        text: '',
        toolCalls: [{ id: '1', name: 'get_org_score', args: {} }],
        modelUsed: 'test-model',
        attempts: 1,
        mock: false
      })
      .mockRejectedValueOnce(new UpstreamAiError());

    const res = await app.request('/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ message: 'score?' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.grounded).toBe(false);
    expect(data.answer).toContain('42');
  });

  it('Loops never exceed 3 tool rounds', async () => {
    vi.mocked(usageModule.checkUserLimit).mockResolvedValue({
      allowed: true, minuteRemaining: 1, dayRemaining: 1
    });
    
    vi.mocked(routerModule.generate).mockResolvedValue({
      text: '',
      toolCalls: [{ id: '1', name: 'get_org_score', args: {} }],
      modelUsed: 'test-model',
      attempts: 1,
      mock: false
    });

    const res = await app.request('/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
      body: JSON.stringify({ message: 'score?' })
    });

    expect(routerModule.generate).toHaveBeenCalledTimes(3);
    const data = await res.json();
    expect(data.fallback).toBe(true);
  });
});
