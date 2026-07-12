import { describe, it, expect } from 'vitest';
import { emissionFactorSchema } from './schemas';

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
