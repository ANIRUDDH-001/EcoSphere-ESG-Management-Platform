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
  console.log('[PHASE A3] Verifying fn_environmental_score...');
  
  // 1. Create a dummy department
  const { data: dept, error: deptErr } = await supabase
    .from('departments')
    .insert({ name: 'Test Env Dept', code: 'TEST-ENV', employee_count: 10 })
    .select('id').single();
    
  if (deptErr) throw deptErr;
  const deptId = dept.id;

  // dept2 with no goals, no emissions
  const { data: dept2, error: dept2Err } = await supabase
    .from('departments')
    .insert({ name: 'Test Env Dept 2', code: 'TEST-ENV2', employee_count: 5 })
    .select('id').single();
    
  if (dept2Err) throw dept2Err;
  const deptId2 = dept2.id;
  
  try {
    // 2. Insert goal for dept1: baseline 100, target 60, current 80 (progress 50%)
    await supabase.from('environmental_goals').insert({
      department_id: deptId,
      name: 'Reduce CO2',
      metric: 'energy',
      baseline: 100,
      target: 60,
      current_value: 80,
      status: 'active',
      target_date: new Date().toISOString()
    });
    
    // Insert goal for dept1: baseline 100, target 50, current 40 (progress 100% since over target)
    await supabase.from('environmental_goals').insert({
      department_id: deptId,
      name: 'Reduce Water',
      metric: 'water',
      baseline: 100,
      target: 50,
      current_value: 40,
      status: 'active',
      target_date: new Date().toISOString()
    });
    
    // Goal 1 progress: clamp(100 * (100 - 80) / (100 - 60)) = clamp(100 * 20 / 40) = 50%
    // Goal 2 progress: clamp(100 * (100 - 40) / (100 - 50)) = clamp(100 * 60 / 50) = 120 -> clamp to 100%
    // Avg goal progress = (50 + 100) / 2 = 75%
    
    // 3. Insert some carbon transactions to set intensity
    // Dept 1: 10 employees. Let's give it 500 co2e -> intensity = 50
    // Dept 2: 5 employees, 0 co2e.
    // Org total co2e = 500, Org total employees = 15 -> baseline intensity = 500 / 15 = 33.333
    // Wait, org has other departments from seed! So baseline intensity will be different.
    // Let's compute org baseline dynamically by querying the view.
    
    await supabase.from('carbon_transactions').insert({
      department_id: deptId,
      source_type: 'manual',
      source_ref: 'test',
      quantity: 1,
      co2e: 500,
      date: new Date().toISOString()
    });
    
    // 4. Calculate expected score
    const { data: viewData, error: viewErr } = await supabase.from('vw_department_emissions').select('*');
    if (viewErr) throw viewErr;
    
    let totalOrgCo2e = 0;
    let totalOrgEmp = 0;
    for (const row of viewData) {
      totalOrgCo2e += Number(row.total_co2e);
      totalOrgEmp += Number(row.employee_count);
    }
    const baselineIntensity = totalOrgEmp > 0 ? totalOrgCo2e / totalOrgEmp : 0;
    
    // Dept 1 efficiency
    const dept1Intensity = 500 / 10; // 50
    let efficiency1 = 70;
    if (baselineIntensity > 0 && dept1Intensity > 0) {
      efficiency1 = Math.min(Math.max(100 * baselineIntensity / dept1Intensity, 0), 100);
    } else if (baselineIntensity > 0 && dept1Intensity === 0) {
      efficiency1 = 70; // per formula fallback
    }
    
    const expectedScore1 = Number((0.6 * 75 + 0.4 * efficiency1).toFixed(2));
    
    // 5. Call function for dept 1
    const { data: score1, error: score1Err } = await supabase.rpc('fn_environmental_score', { p_dept: deptId });
    if (score1Err) throw score1Err;
    
    console.log(`[PHASE A3] dept1 computed: ${score1}, expected: ${expectedScore1}`);
    if (Math.abs(Number(score1) - expectedScore1) > 0.01) {
      console.log(`[PHASE A3] mismatch for dept1!`);
      throw new Error(`Mismatch dept1: got ${score1}, expected ${expectedScore1}`);
    } else {
      console.log(`[PHASE A3] step 1 ... OK`);
    }
    
    // 6. Call function for dept 2 (no goals, no emissions)
    const { data: score2, error: score2Err } = await supabase.rpc('fn_environmental_score', { p_dept: deptId2 });
    if (score2Err) throw score2Err;
    
    const expectedScore2 = Number((0.6 * 70 + 0.4 * 70).toFixed(2)); // 70
    console.log(`[PHASE A3] dept2 computed: ${score2}, expected: ${expectedScore2}`);
    if (Math.abs(Number(score2) - expectedScore2) > 0.01) {
      console.log(`[PHASE A3] mismatch for dept2!`);
      throw new Error(`Mismatch dept2: got ${score2}, expected ${expectedScore2}`);
    } else {
      console.log(`[PHASE A3] step 2 ... OK`);
    }

    console.log('RESULT: PASS');
  } finally {
    // Cleanup
    await supabase.from('carbon_transactions').delete().eq('department_id', deptId);
    await supabase.from('environmental_goals').delete().in('department_id', [deptId, deptId2]);
    await supabase.from('departments').delete().in('id', [deptId, deptId2]);
  }
}

run().catch(err => {
  console.error(err);
  console.log('RESULT: FAIL');
  process.exit(1);
});
