import { describe, it, expect } from 'vitest';
import { computeGoalStatus, goalProgressPct } from './utils';

describe('environmental utils', () => {
  describe('goalProgressPct', () => {
    it('computes reduction goal progress correctly', () => {
      // Reduction goal: baseline 100, target 60
      expect(goalProgressPct({ baseline: 100, target: 60, current_value: 100 })).toBe(0);
      expect(goalProgressPct({ baseline: 100, target: 60, current_value: 80 })).toBe(50);
      expect(goalProgressPct({ baseline: 100, target: 60, current_value: 60 })).toBe(100);
      // Clamps to 100%
      expect(goalProgressPct({ baseline: 100, target: 60, current_value: 55 })).toBe(100);
      // Clamps to 0%
      expect(goalProgressPct({ baseline: 100, target: 60, current_value: 110 })).toBe(0);
    });

    it('computes increase goal progress correctly', () => {
      // Increase goal: baseline 0, target 100
      expect(goalProgressPct({ baseline: 0, target: 100, current_value: 0 })).toBe(0);
      expect(goalProgressPct({ baseline: 0, target: 100, current_value: 50 })).toBe(50);
      expect(goalProgressPct({ baseline: 0, target: 100, current_value: 100 })).toBe(100);
      // Clamps to 100%
      expect(goalProgressPct({ baseline: 0, target: 100, current_value: 150 })).toBe(100);
      // Clamps to 0%
      expect(goalProgressPct({ baseline: 0, target: 100, current_value: -10 })).toBe(0);
    });
  });

  describe('computeGoalStatus', () => {
    it('computes achieved status for reduction goal', () => {
      expect(computeGoalStatus({ baseline: 100, target: 60, current_value: 55, target_date: '2030-01-01' })).toBe('achieved');
    });

    it('computes achieved status for increase goal', () => {
      expect(computeGoalStatus({ baseline: 0, target: 100, current_value: 110, target_date: '2030-01-01' })).toBe('achieved');
    });

    it('computes active status if target date is in future', () => {
      // Set date far in the future
      expect(computeGoalStatus({ baseline: 100, target: 60, current_value: 90, target_date: '2099-01-01' })).toBe('active');
    });

    it('computes missed status if target date is in past and not achieved', () => {
      // Set date in the past
      expect(computeGoalStatus({ baseline: 100, target: 60, current_value: 90, target_date: '2000-01-01' })).toBe('missed');
    });
  });
});
