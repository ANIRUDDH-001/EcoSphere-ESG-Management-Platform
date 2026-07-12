import { describe, it, expect } from 'vitest';
import { COPILOT_POOL, SINGLE_SHOT_POOL, GEN_CONFIG } from './models.js';

describe('Model Pools', () => {
  it('should have non-empty pools', () => {
    expect(COPILOT_POOL.length).toBeGreaterThan(0);
    expect(SINGLE_SHOT_POOL.length).toBeGreaterThan(0);
  });

  it('should have tools:true for all COPILOT_POOL models', () => {
    COPILOT_POOL.forEach(model => {
      expect(model.tools).toBe(true);
    });
  });

  it('should have tools:false for all SINGLE_SHOT_POOL models', () => {
    SINGLE_SHOT_POOL.forEach(model => {
      expect(model.tools).toBe(false);
    });
  });

  it('should have the primary copilot model with the highest RPD in its pool', () => {
    const primary = COPILOT_POOL[0]!;
    const maxRpd = Math.max(...COPILOT_POOL.map(m => m.rpd));
    expect(primary.rpd).toBe(maxRpd);
  });
});
