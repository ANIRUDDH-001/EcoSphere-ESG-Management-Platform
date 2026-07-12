import { Hono } from 'hono';
import { authMiddleware, getUserSupabase } from '../middleware/auth.js';
import { checkUserLimit } from '../ai/usage.js';
import { generate } from '../ai/router.js';
import { checkGrounding, collectNumbers } from '../ai/guardrail.js';
import { buildScoreSnapshot } from '../ai/snapshot.js';
import { UpstreamAiError } from '../errors.js';
import crypto from 'crypto';

const insights = new Hono<{ Variables: any }>();

function buildFallbackTemplate(snapshot: any) {
  const s = snapshot.scores;
  const p = snapshot.lowestPillar;
  const issues = snapshot.drivers.overdueIssues;
  const scoreVal = p === 'Environmental' ? s.environmental : p === 'Social' ? s.social : s.governance;
  
  return {
    summary: `Your overall ESG score is ${s.total}. ${p} is your lowest pillar at ${scoreVal}.`,
    recommendations: [
      `You have ${issues} overdue compliance issues to resolve.`,
      `Focus on improving your ${p} score by launching targeted initiatives.`
    ]
  };
}

function checkGuardrail(text: string, snapshot: any, reqLogger: any) {
  const allowed = collectNumbers(snapshot);
  const grounding = checkGrounding(text, allowed);
  if (!grounding.grounded) {
    reqLogger.warn({ offending: grounding.offending }, 'Guardrail rejected output');
  }
  return grounding.grounded;
}

insights.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const reqLogger = c.get('logger');
  
  const limitCheck = await checkUserLimit(userId);
  if (!limitCheck.allowed) {
    return c.json({ error: `Rate limit exceeded: ${limitCheck.reason}`, remaining: limitCheck }, 429);
  }

  const body = await c.req.json();
  const scope = body.scope || 'org';
  
  const db = getUserSupabase(c);

  const snapshot = await buildScoreSnapshot(db, scope);
  const snapshotStr = JSON.stringify(snapshot);
  const hash = crypto.createHash('sha256').update(JSON.stringify(scope) + snapshotStr).digest('hex');

  // Check cache
  const { data: cacheHit } = await db.from('ai_cache').select('payload').eq('cache_key', hash).single();
  if (cacheHit && cacheHit.payload) {
    reqLogger.info({ user_id: userId, cache_hit: true, scope }, 'Insights request completed (cached)');
    return c.json({ ...cacheHit.payload, scoreSnapshot: snapshot, cached: true, fallback: false });
  }

  let finalSummary = '';
  let finalRecommendations: string[] = [];
  let modelUsed = '';
  let fallback = false;

  const systemPrompt = `You are an ESG Insights AI. Explain and prioritize based on the data. Every number must appear in the provided snapshot; do not invent figures.\nSnapshot: ${snapshotStr}\nReturn JSON with { "summary": "string", "recommendations": ["string"] }`;

  try {
    const res = await generate({
      pool: 'single_shot',
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Provide a short explanation and 2-3 recommendations.' }],
      userId,
      kind: 'insight'
    });
    
    modelUsed = res.modelUsed;
    
    const resText = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(resText);
      finalSummary = parsed.summary || '';
      finalRecommendations = parsed.recommendations || [];
    } catch {
      fallback = true;
    }
  } catch (error) {
    if (error instanceof UpstreamAiError) {
      reqLogger.warn({ err: error }, 'Upstream AI error, using fallback');
    } else {
      reqLogger.error({ err: error }, 'Insights generation failed');
    }
    fallback = true;
  }

  if (!fallback) {
    const grounded = checkGuardrail(finalSummary + ' ' + finalRecommendations.join(' '), snapshot, reqLogger);
    if (!grounded) fallback = true;
  }

  if (fallback || !finalSummary) {
    const tmpl = buildFallbackTemplate(snapshot);
    finalSummary = tmpl.summary;
    finalRecommendations = tmpl.recommendations;
    fallback = true;
  }

  const payload = { summary: finalSummary, recommendations: finalRecommendations };

  if (!fallback) {
    await db.from('ai_cache').upsert({ cache_key: hash, kind: 'insight', payload });
  }

  reqLogger.info({ user_id: userId, modelUsed, cache_hit: false, fallback, scope }, 'Insights request completed');
  
  return c.json({
    summary: finalSummary,
    recommendations: finalRecommendations,
    scoreSnapshot: snapshot,
    cached: false,
    fallback
  });
});

export default insights;
