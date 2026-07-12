import { describe, it, expect } from 'vitest';
import { evaluateUnlockRule } from './badges';
import type { UnlockRule, UnlockStats } from './badges';

const baseStats: UnlockStats = {
  xp: 0,
  challenges_completed: 0,
  participations_approved: 0,
};

describe('evaluateUnlockRule', () => {
  describe('xp rule', () => {
    const rule: UnlockRule = { type: 'xp', gte: 500 };

    it('returns false when xp is below threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, xp: 499 })).toBe(false);
    });

    it('returns true when xp exactly equals threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, xp: 500 })).toBe(true);
    });

    it('returns true when xp exceeds threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, xp: 1000 })).toBe(true);
    });
  });

  describe('challenges_completed rule', () => {
    const rule: UnlockRule = { type: 'challenges_completed', gte: 5 };

    it('returns false when challenges_completed is below threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, challenges_completed: 4 })).toBe(false);
    });

    it('returns true at threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, challenges_completed: 5 })).toBe(true);
    });

    it('returns true above threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, challenges_completed: 10 })).toBe(true);
    });
  });

  describe('participations_approved rule', () => {
    const rule: UnlockRule = { type: 'participations_approved', gte: 3 };

    it('returns false when participations_approved is below threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, participations_approved: 2 })).toBe(false);
    });

    it('returns true at threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, participations_approved: 3 })).toBe(true);
    });

    it('returns true above threshold', () => {
      expect(evaluateUnlockRule(rule, { ...baseStats, participations_approved: 10 })).toBe(true);
    });
  });

  it('returns false for null/undefined rule', () => {
    expect(evaluateUnlockRule(null as any, baseStats)).toBe(false);
    expect(evaluateUnlockRule(undefined as any, baseStats)).toBe(false);
  });
});
