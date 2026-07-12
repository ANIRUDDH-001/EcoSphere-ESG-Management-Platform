/**
 * verify/B1_evidence_rule.ts
 * Verifies that when evidence_required_enabled is on, approving a CSR participation
 * without a proof_url fails (raises an exception). When off, it succeeds.
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
    // Get employee profile
    const { data: emp } = await sb.from('profiles')
      .select('id, department_id')
      .eq('role', 'employee')
      .limit(1)
      .single();
    if (!emp) { fail('No employee profile found in seed data'); process.exit(1); }

    // Get or create a CSR category
    let { data: cat } = await sb.from('categories')
      .select('id').eq('type', 'csr_activity').limit(1).single();
    if (!cat) {
      const { data: newCat } = await sb.from('categories')
        .insert({ name: 'Verify Category', type: 'csr_activity' }).select('id').single();
      cat = newCat;
    }

    // Get or create department
    let deptId = emp.department_id;
    if (!deptId) {
      const { data: dept } = await sb.from('departments').select('id').limit(1).single();
      deptId = dept?.id;
    }
    if (!deptId) { fail('No department found'); process.exit(1); }

    // Create a test activity
    const { data: activity } = await sb.from('csr_activities')
      .insert({
        title: 'Verify Evidence Activity ' + Date.now(),
        category_id: cat!.id,
        department_id: deptId,
        activity_date: new Date().toISOString().split('T')[0],
        points: 50,
        capacity: 10,
        status: 'active',
      }).select('id').single();
    if (!activity) { fail('Could not create test activity'); process.exit(1); }

    // Get current setting to restore later
    const { data: originalSettings } = await sb.from('esg_settings')
      .select('evidence_required_enabled').eq('id', 1).single();

    // ─── Test Case 1: Toggle ON + No Proof ───
    // Enable evidence required
    await sb.from('esg_settings').update({ evidence_required_enabled: true }).eq('id', 1);

    // Create participation with no proof
    const { data: part1 } = await sb.from('employee_participations')
      .insert({
        employee_id: emp.id,
        activity_id: activity.id,
        approval_status: 'pending',
        proof_url: null,
      }).select('id').single();
    if (!part1) { fail('Could not create participation 1'); process.exit(1); }

    // Attempt to approve — should fail
    const { error: approve1Err } = await sb.from('employee_participations')
      .update({ approval_status: 'approved', reviewed_by: emp.id })
      .eq('id', part1.id);

    if (!approve1Err) {
      fail('Expected approval to fail without proof when evidence_required_enabled is true');
    } else {
      ok('Blocked approval without proof when evidence_required_enabled is true');
    }

    // ─── Test Case 2: Toggle ON + Proof Present ───
    // Update participation with proof
    await sb.from('employee_participations')
      .update({ proof_url: 'https://example.com/proof.png' })
      .eq('id', part1.id);

    // Attempt to approve — should succeed
    const { error: approve2Err } = await sb.from('employee_participations')
      .update({ approval_status: 'approved', reviewed_by: emp.id })
      .eq('id', part1.id);

    if (approve2Err) {
      fail('Expected approval to succeed with proof when evidence_required_enabled is true: ' + approve2Err.message);
    } else {
      ok('Allowed approval with proof when evidence_required_enabled is true');
    }

    // ─── Test Case 3: Toggle OFF + No Proof ───
    // Disable evidence required
    await sb.from('esg_settings').update({ evidence_required_enabled: false }).eq('id', 1);

    // Create another participation with no proof
    const { data: part2 } = await sb.from('employee_participations')
      .insert({
        employee_id: emp.id,
        activity_id: activity.id,
        approval_status: 'pending',
        proof_url: null,
      }).select('id').single();
    if (!part2) { fail('Could not create participation 2'); process.exit(1); }

    // Attempt to approve — should succeed
    const { error: approve3Err } = await sb.from('employee_participations')
      .update({ approval_status: 'approved', reviewed_by: emp.id })
      .eq('id', part2.id);

    if (approve3Err) {
      fail('Expected approval to succeed without proof when evidence_required_enabled is false: ' + approve3Err.message);
    } else {
      ok('Allowed approval without proof when evidence_required_enabled is false');
    }

    // ─── Cleanup ───
    await sb.from('employee_participations').delete().in('id', [part1.id, part2.id]);
    await sb.from('csr_activities').delete().eq('id', activity.id);
    if (originalSettings) {
      await sb.from('esg_settings')
        .update({ evidence_required_enabled: originalSettings.evidence_required_enabled })
        .eq('id', 1);
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
