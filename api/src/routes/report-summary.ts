import { Hono } from 'hono';
import { authMiddleware, getUserSupabase } from '../middleware/auth';
import { checkUserLimit } from '../ai/usage';
import { generate } from '../ai/router';
import { checkGrounding, collectNumbers } from '../ai/guardrail';
import { UpstreamAiError } from '../errors';
import crypto from 'crypto';

const reportSummary = new Hono<{ Variables: any }>();

function buildFallbackTemplate(payload: any) {
  const metrics = payload.metrics || {};
  const keys = Object.keys(metrics);
  if (keys.length === 0) return 'Report summarized.';
  
  const m1 = keys[0] ?? '';
  const m2 = keys[1] ?? '';
  
  if (keys.length === 1) {
    return `${payload.title} shows ${m1} at ${metrics[m1]}.`;
  }
  return `${payload.title} shows ${m1} at ${metrics[m1]} and ${m2} at ${metrics[m2]}.`;
}

function checkGuardrail(text: string, payload: any, reqLogger: any) {
  const allowed = collectNumbers(payload);
  const grounding = checkGrounding(text, allowed);
  if (!grounding.grounded) {
    reqLogger.warn({ offending: grounding.offending }, 'Guardrail rejected output');
  }
  return grounding.grounded;
}

reportSummary.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const reqLogger = c.get('logger');
  
  const limitCheck = await checkUserLimit(userId);
  if (!limitCheck.allowed) {
    return c.json({ error: `Rate limit exceeded: ${limitCheck.reason}`, remaining: limitCheck }, 429);
  }

  const payload = await c.req.json();
  const db = getUserSupabase(c);

  const payloadStr = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update('report' + payloadStr).digest('hex');

  // Check cache
  const { data: cacheHit } = await db.from('ai_cache').select('payload').eq('cache_key', hash).single();
  if (cacheHit && cacheHit.payload) {
    reqLogger.info({ user_id: userId, cache_hit: true }, 'Report summary request completed (cached)');
    return c.json({ ...cacheHit.payload, cached: true, fallback: false });
  }

  let finalSummary = '';
  let modelUsed = '';
  let fallback = false;

  const systemPrompt = `You are an ESG Report Summarizer. Summarize for an executive; use only the provided metrics; no new numbers.\nPayload: ${payloadStr}\nReturn JSON with { "summary": "string" }`;

  try {
    const res = await generate({
      pool: 'single_shot',
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Provide a concise executive summary.' }],
      userId,
      kind: 'summary'
    });
    
    modelUsed = res.modelUsed;
    
    const resText = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(resText);
      finalSummary = parsed.summary || '';
    } catch {
      fallback = true;
    }
  } catch (error) {
    if (error instanceof UpstreamAiError) {
      reqLogger.warn({ err: error }, 'Upstream AI error, using fallback');
    } else {
      reqLogger.error({ err: error }, 'Report summary generation failed');
    }
    fallback = true;
  }

  if (!fallback) {
    const grounded = checkGuardrail(finalSummary, payload, reqLogger);
    if (!grounded) fallback = true;
  }

  if (fallback || !finalSummary) {
    finalSummary = buildFallbackTemplate(payload);
    fallback = true;
  }

  const cachePayload = { summary: finalSummary };

  if (!fallback) {
    await db.from('ai_cache').upsert({ cache_key: hash, kind: 'summary', payload: cachePayload });
  }

  reqLogger.info({ user_id: userId, modelUsed, cache_hit: false, fallback }, 'Report summary request completed');
  
  return c.json({
    summary: finalSummary,
    cached: false,
    fallback
  });
});

export default reportSummary;
