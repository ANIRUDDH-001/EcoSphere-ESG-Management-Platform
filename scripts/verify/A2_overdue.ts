import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('[PHASE A2] Verifying overdue compliance issues flagging...');

  // 1. Get an owner profile
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('id').limit(1);
  if (profErr || !profiles?.length) throw new Error('No profiles found to act as owner');
  const owner_id = profiles[0].id;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const pastDueDate = yesterday.toISOString().slice(0, 10);

  // 2. Create open issue, past due
  const { data: openIssue, error: oErr } = await supabase
    .from('compliance_issues')
    .insert({
      severity: 'medium',
      description: 'Open Past Due',
      owner_id,
      due_date: pastDueDate,
      status: 'open',
      is_overdue: false
    })
    .select()
    .single();
  if (oErr) throw oErr;

  // 3. Create resolved issue, past due
  const { data: resolvedIssue, error: rErr } = await supabase
    .from('compliance_issues')
    .insert({
      severity: 'low',
      description: 'Resolved Past Due',
      owner_id,
      due_date: pastDueDate,
      status: 'resolved',
      is_overdue: false
    })
    .select()
    .single();
  if (rErr) throw rErr;

  // 4. Run the function
  const { error: fnErr } = await supabase.rpc('fn_flag_overdue_issues');
  if (fnErr) throw fnErr;

  // 5. Check if open issue is flagged
  const { data: openCheck, error: ocErr } = await supabase
    .from('compliance_issues')
    .select('is_overdue')
    .eq('id', openIssue.id)
    .single();
  if (ocErr) throw ocErr;
  if (!openCheck.is_overdue) throw new Error('FAIL: Open issue past due was NOT flagged as overdue');
  console.log(' - correctly flagged open past-due issue');

  // 6. Check if resolved issue is NOT flagged
  const { data: resCheck, error: rcErr } = await supabase
    .from('compliance_issues')
    .select('is_overdue')
    .eq('id', resolvedIssue.id)
    .single();
  if (rcErr) throw rcErr;
  if (resCheck.is_overdue) throw new Error('FAIL: Resolved issue past due was INCORRECTLY flagged');
  console.log(' - correctly skipped resolved past-due issue');

  // 7. Verify notification
  const { data: notifs, error: nErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'issue_overdue')
    .order('created_at', { ascending: false });
  if (nErr) throw nErr;
  
  const issueNotifs = notifs.filter((n: any) => n.payload?.issue_id === openIssue.id);
  if (issueNotifs.length !== 1) {
    throw new Error(`FAIL: Expected 1 notification for overdue issue, got ${issueNotifs.length}`);
  }
  console.log(' - verified exactly 1 overdue notification sent');

  // 8. Re-run function and ensure no duplicate notifications
  const { error: fnErr2 } = await supabase.rpc('fn_flag_overdue_issues');
  if (fnErr2) throw fnErr2;

  const { data: notifs2 } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'issue_overdue')
    .order('created_at', { ascending: false });
  
  const issueNotifs2 = notifs2?.filter((n: any) => n.payload?.issue_id === openIssue.id) || [];
  if (issueNotifs2.length !== 1) {
    throw new Error(`FAIL: Expected still 1 notification after re-run, but got ${issueNotifs2.length}`);
  }
  console.log(' - verified idempotency (no duplicate notifications on re-run)');

  // 9. Verify job_runs logging
  const { data: jobs, error: jErr } = await supabase
    .from('job_runs')
    .select('*')
    .eq('job_name', 'flag_overdue_issues')
    .order('ran_at', { ascending: false })
    .limit(1);
  
  if (jErr) throw jErr;
  if (!jobs || jobs.length === 0) throw new Error('FAIL: No job_runs row found for flag_overdue_issues');
  console.log(' - verified job_runs logged successfully');

  console.log('RESULT: PASS');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
