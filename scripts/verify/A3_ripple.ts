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
  console.log('[PHASE A3] Verifying ripple triggers...');
  
  // Create dummy departments
  const { data: dept1 } = await supabase.from('departments').insert({ name: 'Ripple Dept 1', code: 'RPL1', employee_count: 10 }).select('id').single();
  const { data: dept2 } = await supabase.from('departments').insert({ name: 'Ripple Dept 2', code: 'RPL2', employee_count: 30 }).select('id').single();
  
  // Create an employee in dept 1
  const { data: p1 } = await supabase.auth.admin.createUser({
    email: `ripple_1@ecosphere.test`,
    password: 'password123', email_confirm: true
  });
  await supabase.from('profiles').update({ department_id: dept1.id }).eq('id', p1.user.id);
  
  // Create an audit in dept 2
  const { data: audit2 } = await supabase.from('audits').insert({
    title: 'Audit 2 Ripple', department_id: dept2.id, status: 'completed', result: 'pass'
  }).select('id').single();
  
  // Force a baseline recompute so scores are populated
  await supabase.rpc('fn_recompute_department_score', { p_dept: dept1.id });
  await supabase.rpc('fn_recompute_department_score', { p_dept: dept2.id });
  await supabase.rpc('fn_recompute_org_score');
  
  try {
    const { data: snap1 } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', new Date().toISOString().split('T')[0]).single();
    const { data: ds1_before } = await supabase.from('department_scores').select('total_score, social_score').eq('department_id', dept1.id).single();
    
    // Add an approved CSR participation to dept 1's user
    // This should trigger trg_recompute_emp -> recompute dept 1 -> recompute org
    const { data: csr } = await supabase.from('csr_activities').insert({ title: 'Tree Planting' }).select('id').single();
    await supabase.from('employee_participations').insert({
      employee_id: p1.user.id, activity_id: csr.id, completion_date: new Date().toISOString().split('T')[0], approval_status: 'approved'
    });
    
    // Check if dept 1 social score changed
    const { data: ds1_after } = await supabase.from('department_scores').select('total_score, social_score').eq('department_id', dept1.id).single();
    console.log(`[PHASE A3] Dept 1 social before: ${ds1_before.social_score}, after: ${ds1_after.social_score}`);
    if (Number(ds1_after.social_score) <= Number(ds1_before.social_score)) throw new Error('Dept 1 social score did not increase after CSR participation');
    
    // Check if org score changed
    const { data: snap2 } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', new Date().toISOString().split('T')[0]).single();
    console.log(`[PHASE A3] Org overall before: ${snap1.overall_esg}, after: ${snap2.overall_esg}`);
    if (Number(snap2.overall_esg) <= Number(snap1.overall_esg)) throw new Error('Org score did not increase after CSR participation');
    
    // Add an overdue compliance issue to dept 2's audit
    // This should trigger trg_recompute_issue -> recompute dept 2 -> recompute org
    const { data: ds2_before } = await supabase.from('department_scores').select('total_score, governance_score').eq('department_id', dept2.id).single();
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    
    // Create an owner for the issue to avoid not-null constraint
    await supabase.from('compliance_issues').insert({
      audit_id: audit2.id, status: 'open', due_date: pastDate.toISOString(), is_overdue: true, severity: 'high', description: 'desc', owner_id: p1.user.id
    });
    
    const { data: ds2_after } = await supabase.from('department_scores').select('total_score, governance_score').eq('department_id', dept2.id).single();
    console.log(`[PHASE A3] Dept 2 gov before: ${ds2_before.governance_score}, after: ${ds2_after.governance_score}`);
    if (Number(ds2_after.governance_score) >= Number(ds2_before.governance_score)) throw new Error('Dept 2 governance score did not decrease after overdue issue');
    
    const { data: snap3 } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', new Date().toISOString().split('T')[0]).single();
    console.log(`[PHASE A3] Org overall before issue: ${snap2.overall_esg}, after issue: ${snap3.overall_esg}`);
    if (Number(snap3.overall_esg) >= Number(snap2.overall_esg)) throw new Error('Org score did not decrease after overdue issue');
    
    // Change weights to trigger all departments
    await supabase.from('esg_settings').upsert({ id: 1, env_weight: 0.8, social_weight: 0.1, gov_weight: 0.1 });
    const { data: snap4 } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', new Date().toISOString().split('T')[0]).single();
    console.log(`[PHASE A3] Org overall after weight change: ${snap4.overall_esg}`);
    
    console.log('RESULT: PASS');
  } finally {
    // Cleanup
    await supabase.from('esg_settings').upsert({ id: 1, env_weight: 0.4, social_weight: 0.3, gov_weight: 0.3 });
    await supabase.from('compliance_issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('employee_participations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('csr_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audits').delete().in('department_id', [dept1.id, dept2.id]);
    await supabase.from('org_score_snapshots').delete().neq('snapshot_date', '1900-01-01');
    await supabase.from('department_scores').delete().in('department_id', [dept1.id, dept2.id]);
    await supabase.auth.admin.deleteUser(p1.user.id);
    await supabase.from('departments').delete().in('id', [dept1.id, dept2.id]);
  }
}

run().catch(err => {
  console.error(err);
  console.log('RESULT: FAIL');
  process.exit(1);
});
