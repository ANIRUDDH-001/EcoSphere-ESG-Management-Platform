import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('[PHASE A2] Verifying policy acknowledgement reminders...');

  // 1. Create a policy
  const { data: policy, error: pErr } = await supabase
    .from('esg_policies')
    .insert({
      name: 'Test Reminder Policy',
      pillar: 'governance',
      version: '1.0',
      effective_date: new Date().toISOString(),
      requires_ack: true,
      status: 'active'
    })
    .select()
    .single();

  if (pErr) throw pErr;
  console.log('✓ Created policy:', policy.id);

  // 2. Get the auto-generated pending ack and backdate it by 4 days
  const { data: pendingAcks } = await supabase
    .from('policy_acknowledgements')
    .select('*')
    .eq('policy_id', policy.id)
    .limit(1);
    
  if (!pendingAcks || pendingAcks.length === 0) {
    console.log('[PHASE A2] ✗ Failed: No pending ack created');
    return;
  }
  const ack = pendingAcks[0];
  
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  
  await supabase
    .from('policy_acknowledgements')
    .update({ created_at: fourDaysAgo.toISOString() })
    .eq('id', ack.id);
    
  console.log('✓ Backdated pending ack to 4 days ago:', ack.id);

  // 3. Run the reminder job
  const { error: fnErr } = await supabase.rpc('fn_send_ack_reminders');
  if (fnErr) throw fnErr;
  console.log('✓ Ran fn_send_ack_reminders()');

  // 4. Verify notification created and reminder_count = 1
  const { data: updatedAck } = await supabase
    .from('policy_acknowledgements')
    .select('reminder_count')
    .eq('id', ack.id)
    .single();
    
  if (updatedAck?.reminder_count !== 1) {
    console.log('[PHASE A2] ✗ Failed: Expected reminder_count=1, got', updatedAck?.reminder_count);
    return;
  }
  
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', ack.employee_id)
    .eq('type', 'policy_reminder');
    
  const myNotifs = notifs?.filter((n: any) => n.payload?.policy_id === policy.id);
  if (!myNotifs || myNotifs.length !== 1) {
    console.log('[PHASE A2] ✗ Failed: Expected 1 notification, got', myNotifs?.length);
    return;
  }
  console.log('✓ Notification created and reminder_count is 1');

  // 5. Run the reminder job again (same day)
  await supabase.rpc('fn_send_ack_reminders');
  console.log('✓ Ran fn_send_ack_reminders() again');

  // 6. Verify idempotency
  const { data: updatedAck2 } = await supabase
    .from('policy_acknowledgements')
    .select('reminder_count')
    .eq('id', ack.id)
    .single();
    
  if (updatedAck2?.reminder_count !== 1) {
    console.log('[PHASE A2] ✗ Failed: Expected reminder_count still 1, got', updatedAck2?.reminder_count);
    return;
  }
  
  const { data: notifs2 } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', ack.employee_id)
    .eq('type', 'policy_reminder');
    
  const myNotifs2 = notifs2?.filter((n: any) => n.payload?.policy_id === policy.id);
  if (!myNotifs2 || myNotifs2.length !== 1) {
    console.log('[PHASE A2] ✗ Failed: Expected still 1 notification, got', myNotifs2?.length);
    return;
  }
  console.log('✓ Idempotency verified (no new notification, reminder_count is 1)');
  
  // 7. Check job_runs
  const { data: runs } = await supabase
    .from('job_runs')
    .select('*')
    .eq('job_name', 'policy_ack_reminders')
    .order('ran_at', { ascending: false })
    .limit(2);
    
  if (!runs || runs.length < 2) {
    console.log('[PHASE A2] ✗ Failed: Expected job_runs entries');
    return;
  }
  console.log('✓ job_runs updated successfully');

  // Cleanup
  await supabase.from('notifications').delete().eq('user_id', ack.employee_id).eq('type', 'policy_reminder');
  await supabase.from('esg_policies').delete().eq('id', policy.id);
  
  console.log('RESULT: PASS');
}

run().catch(e => {
  console.error(e);
  console.log('RESULT: FAIL');
});
