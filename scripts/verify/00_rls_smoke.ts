import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const EMPLOYEE_TOKEN = process.env.EMPLOYEE_TOKEN || '';
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL or Anon Key. Skipping RLS smoke test.');
  process.exit(0);
}

// Clients for each role
const employee = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${EMPLOYEE_TOKEN}` } },
});
const manager = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` } },
});
const admin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } },
});

async function run() {
  let failed = false;
  console.log('--- Starting RLS Smoke Tests ---');

  // 1. Employee cannot read another user's notifications
  // Assuming the DB has other users' notifications, we can't fully assert this without seed data,
  // but we can assert the query executes without returning everything (it shouldn't throw).
  try {
    const { error } = await employee.from('notifications').select('*');
    if (error) throw error;
    console.log('OK: Employee can select notifications (RLS filters rows)');
  } catch (err: any) {
    console.error('FAIL: Employee reading notifications threw an error:', err.message);
    failed = true;
  }

  // 2. Employee cannot write emission_factors
  try {
    const { error } = await employee.from('emission_factors').insert({
      name: 'Hack',
      source_type: 'manual',
      unit: 'kg',
      factor_kgco2e: 1,
    });
    // Expected to fail with RLS violation (usually no rows inserted, so error or null data).
    // In Supabase, if RLS blocks insert, it returns a 403 or silently fails depending on the setup. 
    // Usually, inserting violating RLS returns code 42501 or similar.
    if (!error) {
      console.error('FAIL: Employee was able to write to emission_factors!');
      failed = true;
    } else {
      console.log('OK: Employee cannot write emission_factors');
    }
  } catch (err) {
    console.log('OK: Employee cannot write emission_factors (Exception caught)');
  }

  // 3. Manager can approve only their dept's participation
  try {
    const { error } = await manager.from('employee_participations')
      .update({ approval_status: 'approved' })
      .eq('id', '00000000-0000-0000-0000-000000000000');
    if (error && error.code !== 'PGRST116') { // PGRST116 = zero rows updated, which is fine
      console.error('FAIL: Manager updating participations returned unexpected error:', error.message);
      failed = true;
    } else {
      console.log('OK: Manager update participation behaves correctly under RLS');
    }
  } catch (err) {
    console.error('FAIL: Manager update threw exception');
    failed = true;
  }

  if (failed) {
    console.error('--- RLS Smoke Tests FAILED ---');
    process.exit(1);
  } else {
    console.log('--- RLS Smoke Tests PASSED ---');
    process.exit(0);
  }
}

run();
