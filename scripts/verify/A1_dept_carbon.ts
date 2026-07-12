/**
 * A1_dept_carbon.ts -- Integration test for vw_department_emissions + goal sync trigger.
 *
 * Cases:
 *   1. Insert 3 carbon rows across 2 departments; assert per-dept totals in the view.
 *   2. Cross-check intensity against emissionsIntensity(totalCo2e, employeeCount).
 *   3. A linked co2e-metric goal's current_value syncs after insert.
 *   4. Department with no carbon rows -> intensity = 0 (no divide-by-zero).
 *
 * All seeded data is cleaned up in `finally`.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mirrors lib/emissions.ts emissionsIntensity
function emissionsIntensity(totalCo2e: number, employeeCount: number): number {
  if (employeeCount <= 0) return 0;
  return totalCo2e / employeeCount;
}

function approxEq(a: number, b: number, eps = 0.0001): boolean {
  return Math.abs(a - b) < eps;
}

async function run() {
  let failed = false;
  const deptIds: string[] = [];
  const txnIds: string[] = [];
  const goalIds: string[] = [];

  console.log('--- A1 Department Carbon Tracking Tests ---');

  try {
    // -----------------------------------------------------------------------
    // Seed: two departments with known employee counts
    // -----------------------------------------------------------------------
    const ts = Date.now();
    const { data: deptA } = await supabase
      .from('departments')
      .insert({ name: `Dept Alpha ${ts}`, code: `ALPHA-${ts}`, employee_count: 10 })
      .select()
      .single();
    const { data: deptB } = await supabase
      .from('departments')
      .insert({ name: `Dept Beta ${ts}`, code: `BETA-${ts}`, employee_count: 5 })
      .select()
      .single();

    if (!deptA || !deptB) { console.error('FAIL: could not insert test departments'); failed = true; return; }
    deptIds.push(deptA.id, deptB.id);
    console.log(`Seeded: deptA(${deptA.id}, emp=10), deptB(${deptB.id}, emp=5)`);

    // -----------------------------------------------------------------------
    // Seed: 3 carbon rows (2 for deptA, 1 for deptB) within rolling window
    // -----------------------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    const { data: txn1 } = await supabase
      .from('carbon_transactions')
      .insert({ date: today, department_id: deptA.id, source_type: 'manual', quantity: 10, co2e: 30, is_auto: false })
      .select().single();
    const { data: txn2 } = await supabase
      .from('carbon_transactions')
      .insert({ date: today, department_id: deptA.id, source_type: 'manual', quantity: 5, co2e: 20, is_auto: false })
      .select().single();
    const { data: txn3 } = await supabase
      .from('carbon_transactions')
      .insert({ date: today, department_id: deptB.id, source_type: 'manual', quantity: 8, co2e: 40, is_auto: false })
      .select().single();

    if (!txn1 || !txn2 || !txn3) { console.error('FAIL: could not insert test transactions'); failed = true; return; }
    txnIds.push(txn1.id, txn2.id, txn3.id);

    // -----------------------------------------------------------------------
    // CASE 1 + 2: vw_department_emissions totals and intensity
    // -----------------------------------------------------------------------
    console.log('\nCase 1+2: View totals and intensity');
    const { data: viewRows } = await supabase
      .from('vw_department_emissions')
      .select('*')
      .in('department_id', [deptA.id, deptB.id]);

    const rowA = viewRows?.find(r => r.department_id === deptA.id);
    const rowB = viewRows?.find(r => r.department_id === deptB.id);

    if (!rowA) {
      console.error('FAIL: deptA missing from view');
      failed = true;
    } else {
      const expectedTotalA = 50; // 30 + 20
      const expectedIntensityA = emissionsIntensity(50, 10); // 5
      if (!approxEq(Number(rowA.total_co2e), expectedTotalA)) {
        console.error(`FAIL deptA: total_co2e=${rowA.total_co2e}, expected ${expectedTotalA}`);
        failed = true;
      } else if (!approxEq(Number(rowA.emissions_intensity), expectedIntensityA)) {
        console.error(`FAIL deptA: intensity=${rowA.emissions_intensity}, expected ${expectedIntensityA}`);
        failed = true;
      } else {
        console.log(`OK deptA: total_co2e=${rowA.total_co2e}, intensity=${rowA.emissions_intensity}`);
      }
    }

    if (!rowB) {
      console.error('FAIL: deptB missing from view');
      failed = true;
    } else {
      const expectedTotalB = 40;
      const expectedIntensityB = emissionsIntensity(40, 5); // 8
      if (!approxEq(Number(rowB.total_co2e), expectedTotalB)) {
        console.error(`FAIL deptB: total_co2e=${rowB.total_co2e}, expected ${expectedTotalB}`);
        failed = true;
      } else if (!approxEq(Number(rowB.emissions_intensity), expectedIntensityB)) {
        console.error(`FAIL deptB: intensity=${rowB.emissions_intensity}, expected ${expectedIntensityB}`);
        failed = true;
      } else {
        console.log(`OK deptB: total_co2e=${rowB.total_co2e}, intensity=${rowB.emissions_intensity}`);
      }
    }

    // -----------------------------------------------------------------------
    // CASE 3: Linked co2e goal's current_value syncs after carbon insert
    // -----------------------------------------------------------------------
    console.log('\nCase 3: Goal current_value sync');

    // Create a co2e-metric goal for deptA (baseline=100, target=0)
    const { data: goal } = await supabase
      .from('environmental_goals')
      .insert({
        name: `CO2e Goal Test ${ts}`,
        department_id: deptA.id,
        metric: 'co2e',
        baseline: 100,
        target: 0,
        target_date: '2099-12-31',
        current_value: 0
      })
      .select()
      .single();

    if (!goal) { console.error('FAIL: could not insert test goal'); failed = true; }
    else {
      goalIds.push(goal.id);

      // Insert a new carbon row - trigger should sync the goal
      const { data: txn4 } = await supabase
        .from('carbon_transactions')
        .insert({ date: today, department_id: deptA.id, source_type: 'manual', quantity: 1, co2e: 10, is_auto: false })
        .select().single();
      if (txn4) txnIds.push(txn4.id);

      // Total for deptA is now 30+20+10=60
      const { data: updatedGoal } = await supabase
        .from('environmental_goals')
        .select('current_value')
        .eq('id', goal.id)
        .single();

      const expectedCurrentValue = 60;
      if (!updatedGoal) {
        console.error('FAIL: could not read goal after sync');
        failed = true;
      } else if (!approxEq(Number(updatedGoal.current_value), expectedCurrentValue)) {
        console.error(`FAIL goal sync: current_value=${updatedGoal.current_value}, expected ${expectedCurrentValue}`);
        failed = true;
      } else {
        console.log(`OK goal sync: current_value=${updatedGoal.current_value} (expected ${expectedCurrentValue})`);
      }
    }

    // -----------------------------------------------------------------------
    // CASE 4: Department with zero employees -> intensity = 0 (no divide-by-zero)
    // -----------------------------------------------------------------------
    console.log('\nCase 4: Zero-employee department -> intensity = 0');
    const { data: deptEmpty } = await supabase
      .from('departments')
      .insert({ name: `Dept Empty ${ts}`, code: `EMPTY-${ts}`, employee_count: 0 })
      .select()
      .single();
    if (deptEmpty) {
      deptIds.push(deptEmpty.id);

      const { data: txnE } = await supabase
        .from('carbon_transactions')
        .insert({ date: today, department_id: deptEmpty.id, source_type: 'manual', quantity: 5, co2e: 10, is_auto: false })
        .select().single();
      if (txnE) txnIds.push(txnE.id);

      const { data: rowEmpty } = await supabase
        .from('vw_department_emissions')
        .select('emissions_intensity')
        .eq('department_id', deptEmpty.id)
        .single();

      if (!rowEmpty) {
        console.error('FAIL: zero-employee dept missing from view');
        failed = true;
      } else if (Number(rowEmpty.emissions_intensity) !== 0) {
        console.error(`FAIL: intensity should be 0 for zero-employee dept, got ${rowEmpty.emissions_intensity}`);
        failed = true;
      } else {
        console.log(`OK zero-employee dept: intensity=${rowEmpty.emissions_intensity}`);
      }
    }

  } catch (err: any) {
    console.error('FAIL: Unexpected error:', err.message);
    failed = true;
  } finally {
    // Clean up in dependency order
    if (goalIds.length) await supabase.from('environmental_goals').delete().in('id', goalIds);
    if (txnIds.length) await supabase.from('carbon_transactions').delete().in('id', txnIds);
    if (deptIds.length) await supabase.from('departments').delete().in('id', deptIds);
    console.log('\n(cleanup done)');
  }

  if (failed) {
    console.error('\n--- A1 Dept Carbon Tests FAILED ---');
    console.log('RESULT: FAIL');
    process.exit(1);
  } else {
    console.log('\n--- A1 Dept Carbon Tests PASSED ---');
    console.log('RESULT: PASS');
    process.exit(0);
  }
}

run();
