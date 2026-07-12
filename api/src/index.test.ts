import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index.js';
import * as jose from 'jose';
import { RateLimitError } from './errors.js';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

describe('API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /health returns 200', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ status: 'ok' });
  });

  it('GET /me without token returns 401', async () => {
    const res = await app.request('/me');
    expect(res.status).toBe(401);
  });

  it('GET /me with valid token returns user info', async () => {
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { sub: 'test-user-id', role: 'admin' },
    });

    const res = await app.request('/me', {
      headers: { Authorization: 'Bearer valid.token.here' },
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ userId: 'test-user-id', role: 'admin' });
  });

  it('Error handler maps RateLimitError to 429', async () => {
    const { errorHandler } = await import('./index.js');
    const { RateLimitError } = await import('./errors.js');
    const mockContext = {
      get: vi.fn(),
      json: vi.fn((data, status) => ({ data, status }))
    };
    const result = errorHandler(new RateLimitError('Wait a bit'), mockContext) as any;
    expect(result.status).toBe(429);
    expect(result.data).toEqual({ error: 'Wait a bit' });
  });

  it('CORS allows WEB_ORIGIN and sets header', async () => {
    const origin = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: { Origin: origin },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });

  it('CORS rejects disallowed origin (no header returned)', async () => {
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: { Origin: 'http://evil.com' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
