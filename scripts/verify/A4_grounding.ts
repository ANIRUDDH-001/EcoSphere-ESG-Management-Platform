/**
 * A4_grounding.ts
 * RESULT: PASS when:
 *   - a number from context passes the guardrail
 *   - an invented number causes fallback (grounded:false)
 *   - formatting equivalence (1,234 / 82%) is handled
 */

import { checkGrounding, collectNumbers } from '../../api/src/ai/guardrail.js';

let passed = true;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    passed = false;
  } else {
    console.log(`OK: ${msg}`);
  }
}

console.log('[A4_grounding] Starting...');

// Test 1: grounded output passes
{
  const snapshot = { scores: { total: 80, environmental: 65, social: 82, governance: 90 } };
  const allowed = collectNumbers(snapshot);
  const result = checkGrounding('The ESG score is 80 and environmental is 65.', allowed);
  assert(result.grounded === true, 'Grounded output with context numbers passes');
  assert(result.offending.length === 0, 'No offending tokens when grounded');
}

// Test 2: invented number → grounded:false
{
  const snapshot = { scores: { total: 80 } };
  const allowed = collectNumbers(snapshot);
  const result = checkGrounding('We cut emissions by 37%', allowed);
  assert(result.grounded === false, 'Invented 37% → grounded:false');
  assert(result.offending.includes('37%'), `Offending includes 37%, got: ${JSON.stringify(result.offending)}`);
}

// Test 3: formatting equivalence — 1,234 treated as 1234
{
  const allowed = [1234, 82];
  const result = checkGrounding('It costs 1,234 dollars and is rated 82%.', allowed);
  assert(result.grounded === true, '1,234 and 82% treated as grounded via formatting normalisation');
}

// Test 4: year in prose (2024) does not trigger false reject
{
  const allowed: number[] = [];
  const result = checkGrounding('In 2024 the company set targets.', allowed);
  assert(result.grounded === true, 'Year 2024 in prose does not trigger false reject');
}

// Test 5: collectNumbers flattens nested JSON correctly
{
  const obj = { a: { b: 50, c: [1, 2, 3] }, d: '100' };
  const nums = collectNumbers(obj);
  const sorted = [...nums].sort((a, b) => a - b);
  assert(JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 50, 100]), 
    `collectNumbers flattens correctly: ${JSON.stringify(sorted)}`);
}

// Test 6: deterministic fallback simulation
// When grounded:false, the caller (route) substitutes a deterministic template string
{
  const snapshot = { scores: { total: 42, environmental: 20 }, lowestPillar: 'Environmental', drivers: { overdueIssues: 10, participationRate: 40, goalsCompleted: 0 } };
  const allowed = collectNumbers(snapshot);
  const inventedText = 'ESG score improved by 99.9%'; // 99.9 not in context
  const result = checkGrounding(inventedText, allowed);
  assert(result.grounded === false, 'Invented 99.9% caught by guardrail → would trigger fallback');
  // Simulate fallback template
  const fallback = `Your overall ESG score is ${snapshot.scores.total}. Environmental is your lowest pillar at ${snapshot.scores.environmental}.`;
  assert(fallback.includes('42'), 'Fallback template references snapshot number 42');
  assert(fallback.includes('20'), 'Fallback template references snapshot number 20');
}

if (passed) {
  console.log('RESULT: PASS');
} else {
  console.log('RESULT: FAIL');
  process.exit(1);
}
