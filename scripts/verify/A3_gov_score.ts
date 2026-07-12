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
  console.log('[PHASE A3] Verifying fn_governance_score...');
  
  // 1. Create a dummy department
  const { data: dept, error: deptErr } = await supabase
    .from('departments')
    .insert({ name: 'Test Gov Dept Y', code: 'TEST-GOVY', employee_count: 0 })
    .select('id').single();
  if (deptErr) throw deptErr;
  const deptId = dept.id;

  // empty dept
  const { data: dept2, error: dept2Err } = await supabase
    .from('departments')
    .insert({ name: 'Test Gov Dept Y2', code: 'TEST-GOVY2', employee_count: 0 })
    .select('id').single();
  if (dept2Err) throw dept2Err;
  const deptId2 = dept2.id;
  
  // Create 5 test profiles for dept 1
  const profilesData = [];
  for(let i=0; i<5; i++) {
    const { data: p, error: pErr } = await supabase.auth.admin.createUser({
      email: `test_gov_y_${i}@ecosphere.test`,
      password: 'password123',
      email_confirm: true
    });
    if (pErr) throw pErr;
    await supabase.from('profiles').update({ department_id: deptId }).eq('id', p.user.id);
    profilesData.push(p.user.id);
  }

  // Insert a policy
  const { data: pol, error: polErr } = await supabase.from('esg_policies').insert({
    name: 'Test Policy', pillar: 'governance', status: 'draft', requires_ack: false
  }).select('id').single();
  if (polErr) throw polErr;

  try {
    // 2. Policy acks: 4 out of 5 acknowledged => 80%
    await supabase.from('policy_acknowledgements').insert([
      { policy_id: pol.id, employee_id: profilesData[0], status: 'acknowledged', acknowledged_at: new Date().toISOString() },
      { policy_id: pol.id, employee_id: profilesData[1], status: 'acknowledged', acknowledged_at: new Date().toISOString() },
      { policy_id: pol.id, employee_id: profilesData[2], status: 'acknowledged', acknowledged_at: new Date().toISOString() },
      { policy_id: pol.id, employee_id: profilesData[3], status: 'acknowledged', acknowledged_at: new Date().toISOString() },
      { policy_id: pol.id, employee_id: profilesData[4], status: 'pending' }
    ]);
    
    // 3. Audits: 1 completed and passed => 100%
    const { data: audit1 } = await supabase.from('audits').insert({
      title: 'Audit 1', department_id: deptId, status: 'completed', result: 'pass'
    }).select('id').single();
    
    // 4. Compliance issues: 1 open, 1 overdue
    // Open (due in future)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    // Overdue (due in past)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    
    const { error: ciErr } = await supabase.from('compliance_issues').insert([
      { audit_id: audit1.id, status: 'open', due_date: futureDate.toISOString(), is_overdue: false, severity: 'medium', description: 'desc1', owner_id: profilesData[0] },
      { audit_id: audit1.id, status: 'open', due_date: pastDate.toISOString(), is_overdue: true, severity: 'high', description: 'desc2', owner_id: profilesData[0] }
    ]);
    if (ciErr) throw ciErr;

    // Dept 1 calculations:
    // ack_rate = 80
    // pass_rate = 100
    // gov = 0.5*80 + 0.5*100 - 5(1) - 10(1) = 40 + 50 - 15 = 75
    const { data: score1, error: score1Err } = await supabase.rpc('fn_governance_score', { p_dept: deptId });
    if (score1Err) throw score1Err;
    
    console.log(`[PHASE A3] dept1 computed: ${score1}, expected: 75`);
    if (Math.abs(Number(score1) - 75) > 0.01) {
      throw new Error(`Mismatch dept1: got ${score1}, expected 75`);
    } else {
      console.log(`[PHASE A3] step 1 ... OK`);
    }
    
    // Test clamping logic with Dept 2
    // No audits -> 100 pass rate
    // No expected acks -> 100 ack rate
    // Create an audit just to link issues
    const { data: audit2 } = await supabase.from('audits').insert({
      title: 'Audit 2', department_id: deptId2, status: 'open' // not completed! pass rate still 100%
    }).select('id').single();
    
    // Create a user for Dept 2
    const { data: p2 } = await supabase.auth.admin.createUser({
      email: `test_gov_y_dept2@ecosphere.test`,
      password: 'password123', email_confirm: true
    });
    await supabase.from('profiles').update({ department_id: deptId2 }).eq('id', p2.user.id);
    profilesData.push(p2.user.id);

    // Add 12 overdue issues -> penalty 120 -> gov score should clamp to 0
    const issues = [];
    for(let i=0; i<12; i++) {
      issues.push({ audit_id: audit2.id, status: 'open', is_overdue: true, due_date: pastDate.toISOString(), severity: 'medium', description: 'desc', owner_id: p2.user.id });
    }
    const { error: ciErr2 } = await supabase.from('compliance_issues').insert(issues);
    if (ciErr2) throw ciErr2;
    
    // Dept 2 expected: 100 - 120 = 0
    const { data: score2, error: score2Err } = await supabase.rpc('fn_governance_score', { p_dept: deptId2 });
    if (score2Err) throw score2Err;
    
    console.log(`[PHASE A3] dept2 computed: ${score2}, expected: 0`);
    if (Math.abs(Number(score2) - 0) > 0.01) {
      throw new Error(`Mismatch dept2: got ${score2}, expected 0`);
    } else {
      console.log(`[PHASE A3] step 2 ... OK`);
    }

    console.log('RESULT: PASS');
  } finally {
    // Cleanup
    await supabase.from('compliance_issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audits').delete().in('department_id', [deptId, deptId2]);
    await supabase.from('policy_acknowledgements').delete().eq('policy_id', pol.id);
    await supabase.from('esg_policies').delete().eq('id', pol.id);
    
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
