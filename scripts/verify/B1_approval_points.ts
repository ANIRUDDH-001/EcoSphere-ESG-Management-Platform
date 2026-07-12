/**
 * verify/B1_approval_points.ts
 * Verifies: approving a CSR participation awards points atomically and idempotently,
 * increments profiles.points_balance, and fires an approval_decision notification.
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
    // ── Setup: fetch or create test employee + department + category + activity ──

    // Get employee profile
    const { data: emp } = await sb.from('profiles')
      .select('id, points_balance, department_id')
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

    // Create a fresh activity
    const POINTS = 75;
    const { data: activity, error: actErr } = await sb.from('csr_activities')
      .insert({
        title: 'Verify Activity ' + Date.now(),
        category_id: cat!.id,
        department_id: deptId,
        activity_date: new Date().toISOString().split('T')[0],
        points: POINTS,
        capacity: 50,
        status: 'active',
      }).select('id').single();
    if (actErr || !activity) { fail('Could not create test activity: ' + actErr?.message); process.exit(1); }

    // Record starting points balance
    const startBalance = emp.points_balance ?? 0;

    // Create participation (pending)
    const { data: part, error: partErr } = await sb.from('employee_participations')
      .insert({
        employee_id: emp.id,
        activity_id: activity.id,
        approval_status: 'pending',
        points_earned: 0,
      }).select('id').single();
    if (partErr || !part) { fail('Could not create participation: ' + partErr?.message); process.exit(1); }

    // ── Test 1: Approve → points awarded ──
    const { error: approveErr } = await sb.from('employee_participations')
      .update({ approval_status: 'approved', reviewed_by: emp.id })
      .eq('id', part.id);
    if (approveErr) { fail('Approval update failed: ' + approveErr.message); }

    const { data: afterApprove } = await sb.from('employee_participations')
      .select('points_earned, approval_status, completion_date').eq('id', part.id).single();
    if (afterApprove?.points_earned !== POINTS) {
      fail(`points_earned should be ${POINTS}, got ${afterApprove?.points_earned}`);
    } else {
      ok(`points_earned = ${POINTS} after approval`);
    }
    if (!afterApprove?.completion_date) {
      fail('completion_date not set after approval');
    } else {
      ok('completion_date set');
    }

    // ── Test 2: points_balance incremented ──
    const { data: afterEmp } = await sb.from('profiles')
      .select('points_balance').eq('id', emp.id).single();
    const expected = startBalance + POINTS;
    if (afterEmp?.points_balance !== expected) {
      fail(`points_balance should be ${expected}, got ${afterEmp?.points_balance}`);
    } else {
      ok(`points_balance incremented to ${expected}`);
    }

    // ── Test 3: approval_decision notification created ──
    const { data: notif } = await sb.from('notifications')
      .select('id, type').eq('user_id', emp.id).eq('type', 'approval_decision')
      .order('created_at', { ascending: false }).limit(1).single();
    if (!notif) {
      fail('No approval_decision notification created');
    } else {
      ok('approval_decision notification created');
    }

    // ── Test 4: Idempotent — re-approving must not double-award ──
    await sb.from('employee_participations')
      .update({ approval_status: 'pending' }).eq('id', part.id);
    await sb.from('employee_participations')
      .update({ approval_status: 'approved' }).eq('id', part.id);

    const { data: after2 } = await sb.from('employee_participations')
      .select('points_earned').eq('id', part.id).single();
    const { data: empAfter2 } = await sb.from('profiles')
      .select('points_balance').eq('id', emp.id).single();

    if (after2?.points_earned !== POINTS) {
      fail(`After re-approve: points_earned should still be ${POINTS}, got ${after2?.points_earned}`);
    } else {
      ok('Idempotent: re-approve does not change points_earned');
    }
    // points_balance should NOT have increased again
    if (empAfter2?.points_balance !== expected) {
      fail(`After re-approve: points_balance should still be ${expected}, got ${empAfter2?.points_balance}`);
    } else {
      ok('Idempotent: points_balance not double-incremented');
    }

    // ── Cleanup ──
    await sb.from('employee_participations').delete().eq('id', part.id);
    await sb.from('csr_activities').delete().eq('id', activity.id);
    // Restore points balance
    await sb.from('profiles').update({ points_balance: startBalance }).eq('id', emp.id);

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
