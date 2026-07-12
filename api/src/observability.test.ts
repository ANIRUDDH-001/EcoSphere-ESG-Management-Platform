import { expect, test, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { observabilityMiddleware } from './middleware/observability.js';
import { metrics } from './lib/metrics.js';
import { logger } from './lib/logger.js';
import pino from 'pino';

beforeEach(() => {
  metrics.reset();
});

test('middleware attaches request-id and logs latency', async () => {
  const app = new Hono();
  app.use('*', observabilityMiddleware);
  app.get('/test', (c) => c.text('ok'));

  const res = await app.request('/test');
  expect(res.status).toBe(200);
  expect(res.headers.get('x-request-id')).toBeTruthy();

  const snap = metrics.snapshot();
  expect(snap['http_requests_total']['route=/test,status=200']).toBe(1);
});

test('middleware uses existing x-request-id', async () => {
  const app = new Hono();
  app.use('*', observabilityMiddleware);
  app.get('/test', (c) => c.text('ok'));

  const req = new Request('http://localhost/test', {
    headers: { 'x-request-id': 'my-req-id' }
  });
  const res = await app.request(req);
  expect(res.headers.get('x-request-id')).toBe('my-req-id');
});

test('logger redacts authorization header', () => {
  let output = '';
  const stream = {
    write: (chunk: string) => {
      output += chunk;
      return true;
    }
  };
  const testLogger = pino({
    redact: ['authorization', '*.token', '*.key', 'email', '*.email'],
  }, stream);
  
  testLogger.info({ authorization: 'secret-token' }, 'auth test');
  
  expect(output).toContain('[Redacted]');
  expect(output).not.toContain('secret-token');
});
