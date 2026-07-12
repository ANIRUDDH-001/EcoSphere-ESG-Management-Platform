import { describe, it, expect } from 'vitest';
import { emissionFactorSchema, productProfileSchema } from './schemas';

describe('emissionFactorSchema', () => {
  it('accepts valid factor', () => {
    const result = emissionFactorSchema.safeParse({
      name: 'Grid Electricity',
      source_type: 'energy',
      unit: 'kWh',
      factor_kgco2e: 0.5,
      valid_from: '2024-01-01',
      status: 'active'
    });
    expect(result.success).toBe(true);
  });

  it('rejects factor_kgco2e <= 0', () => {
    const result = emissionFactorSchema.safeParse({
      name: 'Grid Electricity',
      source_type: 'energy',
      unit: 'kWh',
      factor_kgco2e: 0,
      valid_from: '2024-01-01',
      status: 'active'
    });
    expect(result.success).toBe(false);
  });

  it('rejects valid_to < valid_from', () => {
    const result = emissionFactorSchema.safeParse({
      name: 'Grid Electricity',
      source_type: 'energy',
      unit: 'kWh',
      factor_kgco2e: 0.5,
      valid_from: '2024-12-01',
      valid_to: '2024-01-01',
      status: 'active'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("valid_to must be on or after valid_from");
    }
  });
});

describe('productProfileSchema', () => {
  it('accepts a valid row with and without a factor link', () => {
    let result = productProfileSchema.safeParse({
      product_name: 'Product A',
      carbon_per_unit: 10.5,
      recyclable_pct: 100,
      emission_factor_id: '1234-abcd'
    });
    expect(result.success).toBe(true);

    result = productProfileSchema.safeParse({
      product_name: 'Product B',
      carbon_per_unit: 5.0,
      recyclable_pct: 50
    });
    expect(result.success).toBe(true);
  });

  it('rejects recyclable_pct 101', () => {
    const result = productProfileSchema.safeParse({
      product_name: 'Product A',
      carbon_per_unit: 10.5,
      recyclable_pct: 101
    });
    expect(result.success).toBe(false);
  });

  it('rejects carbon_per_unit -1', () => {
    const result = productProfileSchema.safeParse({
      product_name: 'Product A',
      carbon_per_unit: -1,
      recyclable_pct: 100
    });
    expect(result.success).toBe(false);
  });
});
