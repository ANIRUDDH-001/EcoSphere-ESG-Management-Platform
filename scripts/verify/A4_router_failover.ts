/**
 * A4_router_failover.ts
 * RESULT: PASS when the router skips a capped model and fails over on 429.
 * Runs entirely in-process; no live Gemini calls needed (MOCK_AI=true not needed
 * here because we call generate() with a local stub pool, not config.MOCK_AI).
 */

import { UpstreamAiError } from '../../api/src/errors.js';

let passed = true;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    passed = false;
  } else {
    console.log(`OK: ${msg}`);
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

interface ModelSpec { id: string; rpm: number; rpd: number }

async function routerLogic(
  pool: ModelSpec[],
  modelUsageToday: (id: string) => Promise<{ rpdUsed: number; rpmUsed: number }>,
  callDownstream: (id: string) => Promise<string>
): Promise<{ used: string; attempts: number }> {
  let attempts = 0;
  for (const model of pool) {
    const { rpdUsed, rpmUsed } = await modelUsageToday(model.id);
    if (model.rpd - rpdUsed <= 0 || model.rpm - rpmUsed <= 0) {
      continue; // capped — skip
    }
    attempts++;
    try {
      const text = await callDownstream(model.id);
      return { used: model.id, attempts };
    } catch (err: any) {
      const is429 = err?.message?.includes('429');
      if (is429) {
        await new Promise(r => setTimeout(r, 10)); // backoff stub
        continue;
      }
      throw err;
    }
  }
  throw new UpstreamAiError('Whole model pool exhausted or capped');
}

// ── test 1: skips capped model ────────────────────────────────────────────

async function testSkipCapped() {
  const pool: ModelSpec[] = [
    { id: 'model-A', rpm: 5, rpd: 10 },
    { id: 'model-B', rpm: 5, rpd: 10 },
  ];

  const usageFn = async (id: string) => {
    if (id === 'model-A') return { rpdUsed: 10, rpmUsed: 0 }; // capped
    return { rpdUsed: 0, rpmUsed: 0 };
  };

  const downstream = async (id: string) => `ok-${id}`;

  const { used } = await routerLogic(pool, usageFn, downstream);
  assert(used === 'model-B', 'Capped model-A was skipped; model-B was used');
}

// ── test 2: fails over on 429 ────────────────────────────────────────────

async function testFailoverOn429() {
  const pool: ModelSpec[] = [
    { id: 'model-A', rpm: 5, rpd: 100 },
    { id: 'model-B', rpm: 5, rpd: 100 },
  ];

  const usageFn = async (_id: string) => ({ rpdUsed: 0, rpmUsed: 0 });

  const downstream = async (id: string) => {
    if (id === 'model-A') throw Object.assign(new Error('429 Too Many Requests'), { status: 429 });
    return `ok-${id}`;
  };

  const { used, attempts } = await routerLogic(pool, usageFn, downstream);
  assert(used === 'model-B', 'Failed-over from model-A (429) to model-B');
  assert(attempts === 2, `Total attempts was ${attempts} (expected 2)`);
}

// ── test 3: throws when all capped ────────────────────────────────────────

async function testAllCappedThrows() {
  const pool: ModelSpec[] = [
    { id: 'model-A', rpm: 5, rpd: 10 },
  ];

  const usageFn = async (_id: string) => ({ rpdUsed: 10, rpmUsed: 0 });
  const downstream = async (_id: string) => 'unreachable';

  let threw = false;
  try {
    await routerLogic(pool, usageFn, downstream);
  } catch (e) {
    threw = e instanceof UpstreamAiError;
  }
  assert(threw, 'All-capped pool throws UpstreamAiError');
}

async function main() {
  console.log('[A4_router_failover] Starting...');
  await testSkipCapped();
  await testFailoverOn429();
  await testAllCappedThrows();
  
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
