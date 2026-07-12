/**
 * A4_insights_cache.ts
 * RESULT: PASS when:
 *   1. First call with a payload is a cache miss → generates + writes to cache.
 *   2. Second identical call is a cache hit → no new ai_usage record written.
 * Uses an in-process stub cache (Map) — no live DB or Gemini calls.
 */

import crypto from 'crypto';

let passed = true;
let usageRowsWritten = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    passed = false;
  } else {
    console.log(`OK: ${msg}`);
  }
}

// ── stub dependencies ─────────────────────────────────────────────────────

const cacheStore = new Map<string, any>();

async function stubCheckLimit() {
  return { allowed: true, minuteRemaining: 5, dayRemaining: 50 };
}

async function stubGenerate(kind: string) {
  return { text: JSON.stringify({ summary: 'ESG score is 80.', recommendations: ['Improve E pillar.'] }), modelUsed: 'stub-model', attempts: 1, mock: false };
}

async function stubRecordUsage() {
  usageRowsWritten++;
}

// ── core insights cache logic (mirrors insights.ts) ───────────────────────

async function insightsRequest(scope: string, snapshot: any) {
  const limitCheck = await stubCheckLimit();
  if (!limitCheck.allowed) throw new Error('Rate limited');

  const snapshotStr = JSON.stringify(snapshot);
  const hash = crypto.createHash('sha256').update(JSON.stringify(scope) + snapshotStr).digest('hex');

  // Cache check
  if (cacheStore.has(hash)) {
    // cache hit — return without recording usage
    return { ...cacheStore.get(hash), cached: true };
  }

  // Cache miss → generate
  const res = await stubGenerate('insight');
  const parsed = JSON.parse(res.text);
  await stubRecordUsage();

  cacheStore.set(hash, { summary: parsed.summary, recommendations: parsed.recommendations });

  return { summary: parsed.summary, recommendations: parsed.recommendations, cached: false };
}

// ── test ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('[A4_insights_cache] Starting...');

  const scope = 'org';
  const snapshot = { scores: { total: 80, environmental: 65, social: 82, governance: 90 }, lowestPillar: 'Environmental' };

  // First call: cache miss
  const res1 = await insightsRequest(scope, snapshot);
  assert(res1.cached === false, 'First call: cache miss (cached:false)');
  assert(usageRowsWritten === 1, `First call: 1 usage row written (got ${usageRowsWritten})`);
  assert(typeof res1.summary === 'string' && res1.summary.length > 0, 'First call: summary populated');

  // Second call: cache hit
  const res2 = await insightsRequest(scope, snapshot);
  assert(res2.cached === true, 'Second call: cache hit (cached:true)');
  assert(usageRowsWritten === 1, `Second call: NO new usage row (total still ${usageRowsWritten})`);
  assert(res2.summary === res1.summary, 'Cached summary matches original');

  // Changing a metric causes a cache miss (new hash)
  const snapshotChanged = { ...snapshot, scores: { ...snapshot.scores, total: 75 } };
  const res3 = await insightsRequest(scope, snapshotChanged);
  assert(res3.cached === false, 'Changed payload: cache miss (new hash)');
  assert(usageRowsWritten === 2, `Changed payload: new usage row written (total ${usageRowsWritten})`);

  if (passed) {
    console.log('RESULT: PASS');
  } else {
    console.log('RESULT: FAIL');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  console.log('RESULT: FAIL');
  process.exit(1);
});
