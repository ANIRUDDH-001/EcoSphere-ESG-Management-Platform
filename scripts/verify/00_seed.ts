import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  let failed = false;
  console.log('--- Starting Seed Smoke Tests ---');

  try {
    // 1. Check settings singleton
    const { data: settings } = await supabase.from('esg_settings').select('*');
    if (!settings || settings.length !== 1) {
      console.error('FAIL: Expected exactly 1 esg_settings row');
      failed = true;
    } else {
      console.log('OK: esg_settings singleton exists');
    }

    // 2. Check accounts exist and have roles
    const emails = ['admin@ecosphere.test', 'manager@ecosphere.test', 'employee@ecosphere.test'];
    const { data: profiles } = await supabase.from('profiles').select('*').in('email', emails);
    if (!profiles || profiles.length !== 3) {
      console.error('FAIL: Role accounts missing in profiles');
      failed = true;
    } else {
      const admin = profiles.find(p => p.email === 'admin@ecosphere.test');
      const manager = profiles.find(p => p.email === 'manager@ecosphere.test');
      const employee = profiles.find(p => p.email === 'employee@ecosphere.test');
      
      if (admin?.role !== 'admin' || manager?.role !== 'manager' || employee?.role !== 'employee') {
        console.error('FAIL: Role accounts have incorrect roles assigned');
        failed = true;
      } else {
        console.log('OK: Role accounts seeded properly with roles');
      }
    }

    // 3. Check departments
    const { data: depts } = await supabase.from('departments').select('*');
    if (!depts || depts.length < 4) {
      console.error('FAIL: Not all 4 departments are seeded');
      failed = true;
    } else {
      console.log('OK: 4 departments seeded');
    }

  } catch (err: any) {
    console.error('FAIL: Unexpected error in tests:', err.message);
    failed = true;
  }

  if (failed) {
    console.error('--- Seed Smoke Tests FAILED ---');
    console.log('RESULT: FAIL');
    process.exit(1);
  } else {
    console.log('--- Seed Smoke Tests PASSED ---');
    console.log('RESULT: PASS');
    process.exit(0);
  }
}

run();
