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
  if (goal.target === goal.baseline) {
    return goal.current_value === goal.target ? 100 : 0;
  }

  const isReduction = goal.target < goal.baseline;
  let progress = 0;
  if (isReduction) {
    progress = ((goal.baseline - goal.current_value) / (goal.baseline - goal.target)) * 100;
  } else {
    progress = ((goal.current_value - goal.baseline) / (goal.target - goal.baseline)) * 100;
  }
  
  if (progress < 0) return 0;
  if (progress > 100) return 100;
  return progress;
}
