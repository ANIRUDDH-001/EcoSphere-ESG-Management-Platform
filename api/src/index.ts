import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, getUserSupabase } from './middleware/auth.js';
import { observabilityMiddleware } from './middleware/observability.js';
import { AuthError, RateLimitError, ValidationError, UpstreamAiError } from './errors.js';
import { logger } from './lib/logger.js';

const app = new Hono<{
  Variables: {
    userId: string;
    role: string;
    token: string;
    requestId: string;
    logger: typeof logger;
  }
}>();

// Observability
app.use('*', observabilityMiddleware);

// CORS
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
app.use('*', cors({
  origin: webOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Error Handler
export const errorHandler = (err: Error, c: any) => {
  const reqLogger = c.get('logger') || logger;
  reqLogger.error({ err }, err.message);

  if (err instanceof AuthError) {
    return c.json({ error: err.message }, 401);
  }
  if (err instanceof RateLimitError) {
    return c.json({ error: err.message }, 429);
  }
  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }
  if (err instanceof UpstreamAiError) {
    return c.json({ error: err.message }, 502);
  }
  
  return c.json({ error: 'Internal Server Error' }, 500);
};

app.onError(errorHandler);

// Public Health
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Guarded Metrics (Internal token or admin)
app.get('/metrics', async (c) => {
  const authHeader = c.req.header('Authorization');
  const internalToken = process.env.INTERNAL_METRICS_TOKEN || 'dev-metrics-token';
  
  if (authHeader === `Bearer ${internalToken}`) {
    return c.json({ metrics: 'placeholder' });
  }
  
  let role = null;
  try {
    await authMiddleware(c, async () => {
      role = c.get('role');
    });
  } catch (err) {
    throw new AuthError('Metrics requires internal token or admin role');
  }

  if (role !== 'admin') {
    throw new AuthError('Metrics requires admin role');
  }

  return c.json({ metrics: 'placeholder' });
});

// Protected /me route
app.get('/me', authMiddleware, (c) => {
  const userId = c.get('userId');
  const role = c.get('role');
  return c.json({ userId, role });
});

const port = parseInt(process.env.PORT || '8080', 10);

if (process.env.NODE_ENV !== 'test') {
  serve({
    fetch: app.fetch,
    port
  }, (info) => {
    logger.info(`API running on http://localhost:${info.port}`);
  });
}

export default app;
