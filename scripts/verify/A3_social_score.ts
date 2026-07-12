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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('[PHASE A3] Verifying fn_social_score...');
  
  // 1. Create a dummy department (employee_count will auto-increment to 4 via trigger)
  const { data: dept, error: deptErr } = await supabase
    .from('departments')
    .insert({ name: 'Test Social Dept', code: 'TEST-SOC', employee_count: 0 })
    .select('id').single();
  if (deptErr) throw deptErr;
  const deptId = dept.id;

  // empty dept
  const { data: dept2, error: dept2Err } = await supabase
    .from('departments')
    .insert({ name: 'Test Social Dept 2', code: 'TEST-SOC2', employee_count: 0 })
    .select('id').single();
  if (dept2Err) throw dept2Err;
  const deptId2 = dept2.id;
  
  // Create test profiles
  const profilesData = [];
  for(let i=0; i<4; i++) {
    const { data: p } = await supabase.auth.admin.createUser({
      email: `test_soc_${i}@ecosphere.test`,
      password: 'password123',
      email_confirm: true
    });
    if (!p.user) throw new Error('User creation failed');
    await supabase.from('profiles').update({ department_id: deptId }).eq('id', p.user.id);
    profilesData.push(p.user.id);
  }

  try {
    // 2. CSR participation for 2 employees (approved, within last 12 months)
    const { data: csr } = await supabase.from('csr_activities').insert({
      title: 'Test CSR', department_id: deptId, activity_date: '2026-07-01'
    }).select('id').single();
    
    const { error: epErr } = await supabase.from('employee_participations').insert([
      { employee_id: profilesData[0], activity_id: csr.id, approval_status: 'approved', completion_date: '2026-07-01' },
      { employee_id: profilesData[1], activity_id: csr.id, approval_status: 'approved', completion_date: '2026-07-01' },
      // one rejected, should not count
      { employee_id: profilesData[2], activity_id: csr.id, approval_status: 'rejected', completion_date: '2026-07-01' }
    ]);
    if (epErr) throw epErr;
    // Participation rate = 2 / 4 * 100 = 50.

    // 3. Training completions (avg 80)
    await supabase.from('training_completions').insert([
      { employee_id: profilesData[0], course_name: 'A', completion_pct: 100, completed_at: '2026-07-01' },
      { employee_id: profilesData[1], course_name: 'B', completion_pct: 60, completed_at: '2026-07-01' }
    ]);
    // Training avg = 80.

    // 4. Diversity metrics
    // gender_ratio: 0.4 -> score 80
    // avg_tenure: 4 -> score 80
    // training_hours: 20 -> score 50 (20 / 40 * 100)
    // diversity_index = (80 + 80 + 50) / 3 = 70.
    await supabase.from('diversity_metrics').insert({
      department_id: deptId,
      period: '2026-Q2',
      gender_ratio: 0.4,
      avg_tenure: 4,
      training_hours: 20,
      headcount: 4
    });

    // Dept 1 calculations:
    // social = 0.4 * 50 + 0.3 * 80 + 0.3 * 70 = 20 + 24 + 21 = 65
    
    const { data: score1, error: score1Err } = await supabase.rpc('fn_social_score', { p_dept: deptId });
    if (score1Err) throw score1Err;
    
    console.log(`[PHASE A3] dept1 computed: ${score1}, expected: 65`);
    if (Math.abs(Number(score1) - 65) > 0.01) {
      throw new Error(`Mismatch dept1: got ${score1}, expected 65`);
    } else {
      console.log(`[PHASE A3] step 1 ... OK`);
    }
    
    // Dept 2 calculations:
    // participation = 0
    // training = 0
    // diversity (missing row) = 70
    // social = 0.4 * 0 + 0.3 * 0 + 0.3 * 70 = 21
    const { data: score2, error: score2Err } = await supabase.rpc('fn_social_score', { p_dept: deptId2 });
    if (score2Err) throw score2Err;
    
    console.log(`[PHASE A3] dept2 computed: ${score2}, expected: 21`);
    if (Math.abs(Number(score2) - 21) > 0.01) {
      throw new Error(`Mismatch dept2: got ${score2}, expected 21`);
    } else {
      console.log(`[PHASE A3] step 2 ... OK`);
    }

    console.log('RESULT: PASS');
  } finally {
    // Cleanup
    await supabase.from('diversity_metrics').delete().eq('department_id', deptId);
    await supabase.from('training_completions').delete().in('employee_id', profilesData);
    await supabase.from('employee_participations').delete().in('employee_id', profilesData);
    await supabase.from('csr_activities').delete().eq('department_id', deptId);
    
    for (const pid of profilesData) {
      await supabase.auth.admin.deleteUser(pid);
    }
    
    await supabase.from('departments').delete().in('id', [deptId, deptId2]);
  }
}

run().catch(err => {
  console.error(err);
  console.log('RESULT: FAIL');
  process.exit(1);
});
