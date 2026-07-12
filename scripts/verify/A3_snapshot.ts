import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envContent = readFileSync(resolve(__dirname, '../../.env'), 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('[PHASE A3] Verifying fn_daily_score_job...');
  
  // Clean up any existing snapshots for today to test the insert/upsert cleanly
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('org_score_snapshots').delete().eq('snapshot_date', today);
  
  // Run the job once
  const { error: run1Err } = await supabase.rpc('fn_daily_score_job');
  if (run1Err) throw run1Err;
  
  // Verify snapshot was created
  const { data: snap1, error: snap1Err } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', today);
  if (snap1Err) throw snap1Err;
  
  if (snap1.length !== 1) {
    throw new Error(`Expected exactly 1 snapshot for today, found ${snap1.length}`);
  }
  
  console.log(`[PHASE A3] Snapshot 1 created for today. Overall ESG: ${snap1[0].overall_esg}`);
  
  // Run the job again to verify upsert logic (no duplicates)
  const { error: run2Err } = await supabase.rpc('fn_daily_score_job');
  if (run2Err) throw run2Err;
  
  // Verify snapshot row count is still 1
  const { data: snap2, error: snap2Err } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', today);
  if (snap2Err) throw snap2Err;
  
  if (snap2.length !== 1) {
    throw new Error(`Expected exactly 1 snapshot for today after second run, found ${snap2.length}`);
  }
  
  console.log(`[PHASE A3] Snapshot 2 upserted successfully. No duplicates.`);
  
  // Verify job_runs logging
  const { data: jobs, error: jobsErr } = await supabase.from('job_runs')
    .select('*')
    .eq('job_name', 'daily_score_snapshot')
    .order('ran_at', { ascending: false })
    .limit(2);
  if (jobsErr) throw jobsErr;
  
  if (jobs.length < 2) {
    throw new Error(`Expected at least 2 job_runs logs, found ${jobs.length}`);
  }
  console.log(`[PHASE A3] Found ${jobs.length} job_runs logs for 'daily_score_snapshot'.`);
  
  console.log('RESULT: PASS');
}

run().catch(err => {
  console.error(err);
  console.log('RESULT: FAIL');
  process.exit(1);
});
