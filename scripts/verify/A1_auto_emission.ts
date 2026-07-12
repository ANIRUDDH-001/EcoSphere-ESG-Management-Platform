/**
 * A1_auto_emission.ts -- Integration test for the auto emission trigger.
 *
 * Cases:
 *   1. Toggle ON + exactly one active fleet factor (seeded) -> co2e computed, is_auto=true.
 *   2. Toggle OFF -> co2e stays null, trigger is no-op.
 *   3. Two overlapping active fleet factors -> ambiguous, co2e left null.
 *
 * Cross-checks computed values against the same formula: quantity * factor_kgco2e.
 * Uses the seeded fleet factor (Company Vehicle, 0.25 kg CO2e/km) for Case 1 & 2;
 * temporarily adds a second to test ambiguity in Case 3.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing URL or Service Role Key. Skipping test.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mirrors lib/emissions.ts computeCo2e — cross-check without ESM import complexity
function computeCo2e(quantity: number, factorKgCo2e: number): number {
  if (factorKgCo2e < 0) return 0;
  return Math.max(0, quantity * factorKgCo2e);
}

async function run() {
  let failed = false;
  const extraFactorIds: string[] = [];
  const txnIds: string[] = [];

  console.log('--- A1 Auto Emission Trigger Tests ---');

  try {
    // Ensure esg_settings row exists
    await supabase.from('esg_settings').upsert({ id: 1 }, { onConflict: 'id' });

    // Look up seeded fleet factor
    const { data: seededFactor } = await supabase
      .from('emission_factors')
      .select('id, factor_kgco2e')
      .eq('source_type', 'fleet')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!seededFactor) {
      console.error('FAIL: No seeded fleet factor found in emission_factors');
      process.exit(1);
    }
    console.log(`Seeded fleet factor: id=${seededFactor.id}, kgco2e=${seededFactor.factor_kgco2e}`);

    // -------------------------------------------------------------------------
    // CASE 1: Toggle ON, one active fleet factor -> co2e resolved
    // -------------------------------------------------------------------------
    console.log('\nCase 1: Toggle ON, exactly one fleet factor');
    await supabase.from('esg_settings').update({ auto_emission_enabled: true }).eq('id', 1);

    const qty1 = 10;
    const { data: t1, error: tErr1 } = await supabase
      .from('carbon_transactions')
      .insert({ date: new Date().toISOString().slice(0, 10), source_type: 'fleet', quantity: qty1 })
      .select()
      .single();

    if (tErr1 || !t1) {
      console.error('FAIL: insert failed', tErr1);
      failed = true;
    } else {
      txnIds.push(t1.id);
      const expected = computeCo2e(qty1, Number(seededFactor.factor_kgco2e));
      if (Number(t1.co2e) !== expected) {
        console.error(`FAIL: co2e=${t1.co2e}, expected ${expected}`);
        failed = true;
      } else if (t1.is_auto !== true) {
        console.error(`FAIL: is_auto=${t1.is_auto}, expected true`);
        failed = true;
      } else if (t1.emission_factor_id !== seededFactor.id) {
        console.error(`FAIL: wrong factor resolved: ${t1.emission_factor_id}`);
        failed = true;
      } else {
        console.log(`OK: co2e=${t1.co2e} (expected ${expected}), is_auto=${t1.is_auto}`);
      }
    }

    // -------------------------------------------------------------------------
    // CASE 2: Toggle OFF -> trigger is no-op, co2e stays null
    // -------------------------------------------------------------------------
    console.log('\nCase 2: Toggle OFF');
    await supabase.from('esg_settings').update({ auto_emission_enabled: false }).eq('id', 1);

    const { data: t2, error: tErr2 } = await supabase
      .from('carbon_transactions')
      .insert({ date: new Date().toISOString().slice(0, 10), source_type: 'fleet', quantity: 10 })
      .select()
      .single();

    if (tErr2 || !t2) {
      console.error('FAIL: insert failed', tErr2);
      failed = true;
    } else {
      txnIds.push(t2.id);
      if (t2.co2e !== null) {
        console.error(`FAIL: co2e should be null when toggle OFF, got ${t2.co2e}`);
        failed = true;
      } else if (t2.is_auto === true) {
        console.error('FAIL: is_auto should not be true when toggle OFF');
        failed = true;
      } else {
        console.log(`OK: co2e=${t2.co2e}, is_auto=${t2.is_auto} (toggle OFF, no compute)`);
      }
    }

    // -------------------------------------------------------------------------
    // CASE 3: Toggle ON + two overlapping fleet factors -> ambiguous, co2e null
    // -------------------------------------------------------------------------
    console.log('\nCase 3: Toggle ON, two overlapping fleet factors (ambiguous)');
    await supabase.from('esg_settings').update({ auto_emission_enabled: true }).eq('id', 1);

    // Temporarily add a second fleet factor
    const { data: extraFactor } = await supabase
      .from('emission_factors')
      .insert({ name: 'Fleet Factor A1 Duplicate', source_type: 'fleet', unit: 'km', factor_kgco2e: 3.5, status: 'active' })
      .select()
      .single();

    if (!extraFactor) {
      console.error('FAIL: could not insert second fleet factor');
      failed = true;
    } else {
      extraFactorIds.push(extraFactor.id);

      const { data: t3, error: tErr3 } = await supabase
        .from('carbon_transactions')
        .insert({ date: new Date().toISOString().slice(0, 10), source_type: 'fleet', quantity: 10 })
        .select()
        .single();

      if (tErr3 || !t3) {
        console.error('FAIL: insert failed', tErr3);
        failed = true;
      } else {
        txnIds.push(t3.id);
        if (t3.co2e !== null) {
          console.error(`FAIL: co2e should be null when ambiguous, got ${t3.co2e}`);
          failed = true;
        } else {
          console.log(`OK: co2e=${t3.co2e} (ambiguous - left null as expected)`);
        }
      }
    }

  } catch (err: any) {
    console.error('FAIL: Unexpected error:', err.message);
    failed = true;
  } finally {
    // Restore toggle to default and clean up test data
    await supabase.from('esg_settings').update({ auto_emission_enabled: true }).eq('id', 1);
    if (txnIds.length) await supabase.from('carbon_transactions').delete().in('id', txnIds);
    if (extraFactorIds.length) await supabase.from('emission_factors').delete().in('id', extraFactorIds);
    console.log('\n(cleanup done)');
  }

  if (failed) {
    console.error('\n--- A1 Auto Emission Tests FAILED ---');
    console.log('RESULT: FAIL');
    process.exit(1);
  } else {
    console.log('\n--- A1 Auto Emission Tests PASSED ---');
    console.log('RESULT: PASS');
    process.exit(0);
  }
}

run();
