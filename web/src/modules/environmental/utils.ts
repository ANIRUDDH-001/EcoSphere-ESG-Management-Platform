import { goalProgressPct as libGoalProgressPct } from '../../lib/emissions';

export function computeGoalStatus(goal: { baseline: number; target: number; current_value: number; target_date: string }) {
  const isReduction = goal.target < goal.baseline;
  let achieved = false;
  
  if (goal.target === goal.baseline) {
    achieved = goal.current_value === goal.target;
  } else if (isReduction) {
    achieved = goal.current_value <= goal.target;
  } else {
    achieved = goal.current_value >= goal.target;
  }

  if (achieved) return 'achieved';

  // Compare dates strictly on calendar day ignoring time
  const targetDate = new Date(goal.target_date);
  targetDate.setHours(23, 59, 59, 999);
  if (targetDate < new Date()) {
    return 'missed';
  }

  return 'active';
}

export function goalProgressPct(goal: { baseline: number; target: number; current_value: number }) {
  return libGoalProgressPct(goal.baseline, goal.target, goal.current_value);
}
