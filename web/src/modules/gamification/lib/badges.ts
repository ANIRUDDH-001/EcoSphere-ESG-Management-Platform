// web/src/modules/gamification/lib/badges.ts
// Pure rule evaluator — unit testable in isolation, mirrors the SQL logic

export interface UnlockStats {
  xp: number;
  challenges_completed: number;
  participations_approved: number;
}

export type UnlockRule = {
  type: 'xp' | 'challenges_completed' | 'participations_approved';
  gte: number;
};

/**
 * Evaluates whether an employee's stats satisfy a badge's unlock rule.
 * Returns true if the rule is met (badge should be awarded).
 */
export function evaluateUnlockRule(rule: UnlockRule, stats: UnlockStats): boolean {
  if (!rule || !rule.type || rule.gte === undefined) return false;
  switch (rule.type) {
    case 'xp':
      return stats.xp >= rule.gte;
    case 'challenges_completed':
      return stats.challenges_completed >= rule.gte;
    case 'participations_approved':
      return stats.participations_approved >= rule.gte;
    default:
      return false;
  }
}
