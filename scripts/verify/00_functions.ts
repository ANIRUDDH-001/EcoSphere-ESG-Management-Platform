import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  let failed = false;
  console.log('--- Starting Functions & Triggers Smoke Tests ---');

  try {
    console.log('Testing handle_new_user trigger...');
    const { data: user1, error: uErr1 } = await supabase.auth.admin.createUser({
      email: `test_${Date.now()}@test.com`,
      password: 'password',
      email_confirm: true
    });
    if (uErr1) throw uErr1;

    const { data: prof, error: pErr } = await supabase.from('profiles').select('*').eq('id', user1.user.id).single();
    if (pErr || !prof || prof.role !== 'employee') {
      console.error('FAIL: Profile not created correctly by trigger');
      failed = true;
    } else {
      console.log('OK: handle_new_user trigger worked');
    }

    console.log('Testing create_notification...');
    const { data: notifId, error: nErr } = await supabase.rpc('create_notification', {
      p_user: user1.user.id,
      p_type: 'badge_unlock',
      p_title: 'Test Notif',
      p_body: 'Body',
      p_payload: { test: 1 }
    });
    
    if (nErr || !notifId) {
      console.error('FAIL: create_notification failed', nErr);
      failed = true;
    } else {
      const { data: notifRow } = await supabase.from('notifications').select('*').eq('id', notifId).single();
      if (!notifRow || notifRow.title !== 'Test Notif') {
         console.error('FAIL: Notification row invalid');
         failed = true;
      } else {
         console.log('OK: create_notification works');
      }
    }

    console.log('Testing sync_department_employee_count...');
    const { data: d1 } = await supabase.from('departments').insert({ name: 'D1', code: `D1-${Date.now()}` }).select().single();
    const { data: d2 } = await supabase.from('departments').insert({ name: 'D2', code: `D2-${Date.now()}` }).select().single();
    
    await supabase.from('profiles').update({ department_id: d1.id }).eq('id', user1.user.id);
    const { data: c1 } = await supabase.from('departments').select('employee_count').eq('id', d1.id).single();
    if (c1.employee_count !== 1) {
      console.error('FAIL: count not 1 after assignment');
      failed = true;
    }

    await supabase.from('profiles').update({ department_id: d2.id }).eq('id', user1.user.id);
    const { data: c1_after } = await supabase.from('departments').select('employee_count').eq('id', d1.id).single();
    const { data: c2_after } = await supabase.from('departments').select('employee_count').eq('id', d2.id).single();
    
    if (c1_after.employee_count !== 0 || c2_after.employee_count !== 1) {
      console.error('FAIL: counts not updated correctly after move');
      failed = true;
    } else {
      console.log('OK: sync_department_employee_count works');
    }

    console.log('Testing set_updated_at...');
    await supabase.from('esg_settings').upsert({ id: 1, env_weight: 0.5 });
    const { data: s1 } = await supabase.from('esg_settings').select('updated_at').eq('id', 1).single();
    
    await new Promise(r => setTimeout(r, 100));
    await supabase.from('esg_settings').update({ env_weight: 0.6 }).eq('id', 1);
    const { data: s2 } = await supabase.from('esg_settings').select('updated_at').eq('id', 1).single();
    
    if (s1 && s2 && s1.updated_at === s2.updated_at) {
      console.error('FAIL: updated_at did not change');
      failed = true;
    } else {
      console.log('OK: set_updated_at works');
    }

    // Cleanup
    await supabase.auth.admin.deleteUser(user1.user.id);
    await supabase.from('departments').delete().in('id', [d1.id, d2.id]);

  } catch (err: any) {
    console.error('FAIL: Unexpected error in tests:', err.message);
    failed = true;
  }

  if (failed) {
    console.error('--- Functions Smoke Tests FAILED ---');
    process.exit(1);
  } else {
    console.log('--- Functions Smoke Tests PASSED ---');
    process.exit(0);
  }
}

run();
