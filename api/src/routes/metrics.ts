import { Hono } from 'hono';
import { metrics } from '../lib/metrics.js';

export const metricsRouter = new Hono();
metricsRouter.get('/', (c) => {
  return c.json(metrics.snapshot());
});
