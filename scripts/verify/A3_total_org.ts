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
  console.log('[PHASE A3] Verifying fn_department_total and fn_recompute_org_score...');
  
  // Clear any existing scores so the hardcoded assertions work
  await supabase.from('org_score_snapshots').delete().neq('snapshot_date', '1900-01-01');
  await supabase.from('department_scores').delete().neq('department_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('environmental_goals').delete().in('department_id', (await supabase.from('departments').select('id').in('code', ['TTD1', 'TTD2'])).data?.map(d => d.id) || []);
  await supabase.from('departments').delete().in('code', ['TTD1', 'TTD2']);
  
  // Create dummy departments
  const { data: dept1 } = await supabase.from('departments').insert({ name: 'Test Total Dept 1', code: 'TTD1', employee_count: 10 }).select('id').single();
  const { data: dept2 } = await supabase.from('departments').insert({ name: 'Test Total Dept 2', code: 'TTD2', employee_count: 30 }).select('id').single();
  
  try {
    // Modify Dept 2 Env score by adding an achieved goal (Progress = 100%)
    await supabase.from('environmental_goals').insert({
      department_id: dept2.id, metric: 'energy', target: 50, baseline: 100, current_value: 50, target_date: '2030-01-01', status: 'active'
    });
    
    // Ensure weights are .4, .3, .3
    await supabase.from('esg_settings').upsert({ id: 1, env_weight: 0.4, social_weight: 0.3, gov_weight: 0.3 });

    // Dept 1 scores (defaults): Env=70, Soc=21, Gov=100
    // Total = 0.4*70 + 0.3*21 + 0.3*100 = 28 + 6.3 + 30 = 64.3
    const { data: total1 } = await supabase.rpc('fn_department_total', { p_dept: dept1.id });
    console.log(`[PHASE A3] dept1 computed total: ${total1}, expected: 64.3`);
    if (Math.abs(Number(total1) - 64.3) > 0.01) throw new Error('Mismatch dept1');
    
    // Dept 2 scores: Env=88 (0.6*100 + 0.4*70), Soc=21, Gov=100
    // Total = 0.4*88 + 0.3*21 + 0.3*100 = 35.2 + 6.3 + 30 = 71.5
    const { data: total2 } = await supabase.rpc('fn_department_total', { p_dept: dept2.id });
    console.log(`[PHASE A3] dept2 computed total: ${total2}, expected: 71.5`);
    if (Math.abs(Number(total2) - 71.5) > 0.01) throw new Error('Mismatch dept2');
    
    // Upsert department_scores
    await supabase.rpc('fn_recompute_department_score', { p_dept: dept1.id });
    await supabase.rpc('fn_recompute_department_score', { p_dept: dept2.id });
    
    const { data: ds1 } = await supabase.from('department_scores').select('*').eq('department_id', dept1.id).single();
    if (Number(ds1.total_score) !== 64.3) throw new Error('ds1 total wrong');

    // Recompute Org Score
    await supabase.rpc('fn_recompute_org_score');
    
    // Check Snapshot
    const dStr = new Date().toISOString().split('T')[0]; // today
    const { data: snap } = await supabase.from('org_score_snapshots').select('*').eq('snapshot_date', dStr).single();
    
    const { data: allDepts } = await supabase.from('departments').select('id, name, employee_count');
    const { data: allScores } = await supabase.from('department_scores').select('department_id, total_score');
    
    let totalScorexEmp = 0;
    let totalEmp = 0;
    for (const d of allDepts) {
       const score = allScores.find(s => s.department_id === d.id);
       if (score) {
          totalScorexEmp += Number(score.total_score) * Number(d.employee_count);
          totalEmp += Number(d.employee_count);
       }
    }
    const expectedOrgOverall = totalEmp === 0 ? 0 : Number((totalScorexEmp / totalEmp).toFixed(2));
    
    console.log(`[PHASE A3] Org overall: ${snap.overall_esg}, expected: ${expectedOrgOverall}`);
    if (Math.abs(Number(snap.overall_esg) - expectedOrgOverall) > 0.01) throw new Error(`Org overall wrong: ${snap.overall_esg}`);
    
    // Change weights to .5/.25/.25
    await supabase.from('esg_settings').upsert({ id: 1, env_weight: 0.5, social_weight: 0.25, gov_weight: 0.25 });
    
    // Dept 1 Total = 0.5*70 + 0.25*21 + 0.25*100 = 35 + 5.25 + 25 = 65.25
    const { data: total1_new } = await supabase.rpc('fn_department_total', { p_dept: dept1.id });
    console.log(`[PHASE A3] dept1 new total: ${total1_new}, expected: 65.25`);
    if (Math.abs(Number(total1_new) - 65.25) > 0.01) throw new Error('Mismatch dept1 new');
    
    console.log('RESULT: PASS');
  } finally {
    // Cleanup
    await supabase.from('org_score_snapshots').delete().neq('snapshot_date', '1900-01-01');
    await supabase.from('department_scores').delete().in('department_id', [dept1.id, dept2.id]);
    await supabase.from('environmental_goals').delete().eq('department_id', dept2.id);
    await supabase.from('departments').delete().in('id', [dept1.id, dept2.id]);
    // reset weights
    await supabase.from('esg_settings').upsert({ id: 1, env_weight: 0.4, social_weight: 0.3, gov_weight: 0.3 });
  }
}

run().catch(err => {
  console.error(err);
  console.log('RESULT: FAIL');
  process.exit(1);
});
