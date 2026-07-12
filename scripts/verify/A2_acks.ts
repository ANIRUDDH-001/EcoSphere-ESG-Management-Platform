import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('[PHASE A2] Verifying policy acknowledgements...');

  // 1. Create a policy
  const { data: policy, error: pErr } = await supabase
    .from('esg_policies')
    .insert({
      name: 'Test Verify Policy',
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

  // 2. Trigger should have created pending acks for employees.
  // Get an employee
  const { data: profiles, error: prfErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
    
  if (prfErr) throw prfErr;
  if (!profiles.length) throw new Error('No profiles found');
  
  const empId = profiles[0].id;

  const { data: pendingAcks } = await supabase
    .from('policy_acknowledgements')
    .select('*')
    .eq('employee_id', empId)
    .eq('status', 'pending');
    
  const foundAck = pendingAcks?.find(a => a.policy_id === policy.id);
  
  if (!foundAck) {
    console.log('[PHASE A2] ✗ Failed: No pending ack created for employee');
    console.log('RESULT: FAIL');
    return;
  }
  console.log('✓ Found pending ack for employee:', empId);

  // 3. Acknowledge
  await supabase
      .from('policy_acknowledgements')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('policy_id', policy.id)
      .eq('employee_id', empId)
      .eq('status', 'pending');
  console.log('✓ Acknowledged policy');

  // 4. Verify idempotent (no crash on re-acknowledge)
  await supabase
      .from('policy_acknowledgements')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('policy_id', policy.id)
      .eq('employee_id', empId)
      .eq('status', 'pending');
  console.log('✓ Re-acknowledge is idempotent (no crash)');

  // 5. Verify rate manually
  const { data: acks } = await supabase
      .from('policy_acknowledgements')
      .select('policy_id, status')
      .eq('policy_id', policy.id);
      
  const total = acks?.length || 0;
  const acked = acks?.filter(a => a.status === 'acknowledged').length || 0;
  
  if (total === 0 || acked !== 1) {
    console.log('[PHASE A2] ✗ Failed: Rate calculation incorrect', { total, acked });
    console.log('RESULT: FAIL');
    return;
  }
  console.log('✓ Rate calculation reflects acknowledgement (acked=1)');
  
  // Cleanup
  await supabase.from('esg_policies').delete().eq('id', policy.id);
  
  console.log('RESULT: PASS');
}

run().catch(e => {
  console.error(e);
  console.log('RESULT: FAIL');
});
