import { describe, it, expect } from 'vitest';
import { computeCo2e, emissionsIntensity, goalProgressPct, clamp } from './emissions';

describe('emissions calculations', () => {
  describe('computeCo2e', () => {
    it('computes correctly for positive values', () => {
      expect(computeCo2e(10, 2.5)).toBe(25);
    });

    it('returns 0 for 0 quantity', () => {
      expect(computeCo2e(0, 5)).toBe(0);
    });

    it('guards against negative factors', () => {
      expect(computeCo2e(10, -5)).toBe(0);
    });
  });

  describe('emissionsIntensity', () => {
    it('computes correctly', () => {
      expect(emissionsIntensity(100, 10)).toBe(10);
    });

    it('returns 0 when employeeCount is 0', () => {
      expect(emissionsIntensity(100, 0)).toBe(0);
    });

    it('returns 0 when employeeCount is negative', () => {
      expect(emissionsIntensity(100, -5)).toBe(0);
    });

    it('returns 0 when totalCo2e is 0', () => {
      expect(emissionsIntensity(0, 5)).toBe(0);
    });
  });

  describe('goalProgressPct', () => {
    it('computes reduction goals', () => {
      // baseline100/target60
      expect(goalProgressPct(100, 60, 80)).toBe(50);
      expect(goalProgressPct(100, 60, 60)).toBe(100);
      expect(goalProgressPct(100, 60, 55)).toBe(100); // clamped
      expect(goalProgressPct(100, 60, 100)).toBe(0);
      expect(goalProgressPct(100, 60, 120)).toBe(0); // clamped
    });

    it('handles baseline === target', () => {
      expect(goalProgressPct(60, 60, 60)).toBe(100);
      expect(goalProgressPct(60, 60, 61)).toBe(0);
    });
    
    it('computes increase goals correctly too', () => {
      // Not explicitly required by the prompt's checklist but implied
      expect(goalProgressPct(0, 100, 50)).toBe(50);
      expect(goalProgressPct(0, 100, 120)).toBe(100);
      expect(goalProgressPct(0, 100, -10)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('clamps values correctly', () => {
      expect(clamp(5, 0, 10)).toBe(5);   // within range
      expect(clamp(-5, 0, 10)).toBe(0);  // below range
      expect(clamp(15, 0, 10)).toBe(10); // above range
    });
  });
});
