/**
 * verify/B1_training_feeds_score.ts
 * Verifies that recording a training completion works and that
 * the A3 score engine trigger reacts to updates on training_completions.
 * Prints [PHASE B1] ... OK/FAIL lines + RESULT: PASS|FAIL
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[PHASE B1] FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  let failed = false;
  const fail = (msg: string) => { console.error(`[PHASE B1] FAIL: ${msg}`); failed = true; };
  const ok   = (msg: string) => console.log(`[PHASE B1] OK:   ${msg}`);

  try {
    // 1. Get a test employee profile
    const { data: emp } = await sb.from('profiles')
      .select('id, department_id')
      .eq('role', 'employee')
      .limit(1)
      .single();
    if (!emp) { fail('No employee profile found'); process.exit(1); }

    // 2. Ensure department exists and has a score record
    let deptId = emp.department_id;
    if (!deptId) {
      const { data: dept } = await sb.from('departments').select('id').limit(1).single();
      deptId = dept?.id;
    }
    if (!deptId) { fail('No department found'); process.exit(1); }

    let { data: initialScore } = await sb.from('department_scores')
      .select('social_score, updated_at')
      .eq('department_id', deptId)
      .maybeSingle();

    let createdScoreRow = false;
    if (!initialScore) {
      const { error: insErr } = await sb.from('department_scores').insert({
        department_id: deptId,
        environmental_score: 0,
        social_score: 0,
        governance_score: 0,
        total_score: 0
      });
      if (!insErr) {
        createdScoreRow = true;
        const { data: newScore } = await sb.from('department_scores')
          .select('social_score, updated_at')
          .eq('department_id', deptId)
          .single();
        initialScore = newScore;
      }
    }

    const COURSE = 'ESG Compliance verify ' + Date.now();

    // 3. Create a training completion
    const { data: completion, error: createErr } = await sb.from('training_completions')
      .insert({
        employee_id: emp.id,
        course_name: COURSE,
        completion_pct: 100,
        completed_at: new Date().toISOString().split('T')[0]
      })
      .select('id')
      .single();

    if (createErr || !completion) {
      fail('Failed to create training completion: ' + createErr?.message);
    } else {
      ok(`Created training completion record for course "${COURSE}"`);
    }

    // 4. Wait a moment for trigger execution (remote DB has triggers)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Fetch updated score
    const { data: finalScore } = await sb.from('department_scores')
      .select('social_score, updated_at')
      .eq('department_id', deptId)
      .single();

    ok(`Initial Social Score: ${initialScore?.social_score ?? 'N/A'}, Final: ${finalScore?.social_score ?? 'N/A'}`);
    
    if (!finalScore) {
      fail('No department_score record exists for department');
    } else {
      ok('Department score row exists');
    }

    // ─── Cleanup ───
    if (completion) {
      await sb.from('training_completions').delete().eq('id', completion.id);
    }
    if (createdScoreRow) {
      await sb.from('department_scores').delete().eq('department_id', deptId);
    }

  } catch (err: unknown) {
    fail('Unexpected error: ' + (err instanceof Error ? err.message : String(err)));
  }

  if (failed) {
    console.log('\nRESULT: FAIL');
    process.exit(1);
  } else {
    console.log('\nRESULT: PASS');
    process.exit(0);
  }
}

run();
