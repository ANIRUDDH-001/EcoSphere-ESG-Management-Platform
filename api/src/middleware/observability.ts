import { Context, Next } from 'hono';
import { logger } from '../lib/logger.js';
import { metrics } from '../lib/metrics.js';
import { randomUUID } from 'node:crypto';

export async function observabilityMiddleware(c: Context, next: Next) {
  const start = performance.now();
  let requestId = c.req.header('x-request-id');
  if (!requestId) {
    requestId = randomUUID();
  }
  
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);

  const reqLogger = logger.child({ request_id: requestId });
  c.set('logger', reqLogger);

  try {
    await next();
  } finally {
    const latency_ms = Math.round(performance.now() - start);
    const status = c.res.status;
    const route = c.req.path;
    const method = c.req.method;
    const userId = c.get('userId');

    reqLogger.info({
      route,
      method,
      status,
      latency_ms,
      user_id: userId,
    }, 'request_finished');

    metrics.inc('http_requests_total', { route, status });
  }
}
