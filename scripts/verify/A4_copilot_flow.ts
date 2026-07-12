/**
 * A4_copilot_flow.ts
 * RESULT: PASS when a "score" question produces a grounded tool answer in mock mode.
 * Uses the same generate() logic (MOCK_AI=true path) directly — no live API calls.
 */

process.env.MOCK_AI = 'true';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
process.env.SUPABASE_JWT_SECRET = 'mock-secret-for-test-only-do-not-use';

import { generate } from '../../api/src/ai/router.js';
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

async function main() {
  console.log('[A4_copilot_flow] Starting...');

  // Step 1: user asks score question → mock returns tool call
  const step1 = await generate({
    pool: 'copilot',
    system: 'You are the ESG Copilot.',
    messages: [{ role: 'user', content: 'What is our ESG score?' }],
    tools: [{ name: 'get_org_score', description: 'Returns org score' }],
    userId: 'verify-user',
    kind: 'copilot'
  });

  assert(step1.mock === true, 'MOCK_AI path was taken (mock:true)');
  assert(Array.isArray(step1.toolCalls) && step1.toolCalls!.length > 0, 'Step 1: tool call returned');
  const tc = (step1.toolCalls as any[])[0];
  assert(tc.name === 'get_org_score', `Tool name correct: ${tc.name}`);

  // Step 2: simulate tool execution returning score 80
  const toolResult = { overall: 80, environmental: 65, social: 82, governance: 90 };
  const updatedMessages = [
    { role: 'user', content: 'What is our ESG score?' },
    { role: 'assistant', toolCalls: step1.toolCalls },
    { role: 'tool', content: [{ callId: tc.id, result: toolResult }] }
  ];

  // Step 3: send tool result back → mock returns text answer
  const step2 = await generate({
    pool: 'copilot',
    system: 'You are the ESG Copilot.',
    messages: updatedMessages,
    userId: 'verify-user',
    kind: 'copilot'
  });

  assert(typeof step2.text === 'string' && step2.text.length > 0, 'Step 2: text answer returned');
  assert(step2.text.includes('80'), `Answer references tool result (80): "${step2.text}"`);

  // Step 4: run guardrail against answer + context
  const allowedNums = collectNumbers(updatedMessages);
  const groundResult = checkGrounding(step2.text, allowedNums);
  assert(groundResult.grounded === true, `Answer is grounded (no invented numbers). Offending: ${JSON.stringify(groundResult.offending)}`);

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
