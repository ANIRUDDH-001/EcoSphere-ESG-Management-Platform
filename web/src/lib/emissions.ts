/**
 * Clamps a number between a minimum and maximum value.
 * @param n the number to clamp
 * @param lo the minimum value
 * @param hi the maximum value
 */
export function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo === 0 ? 0 : lo;
  if (n > hi) return hi === 0 ? 0 : hi;
  return n === 0 ? 0 : n;
}

/**
 * Computes the total carbon dioxide equivalent (CO2e) based on quantity and an emission factor.
 * @param quantity The quantity of the activity/item.
 * @param factorKgCo2e The emission factor in kg CO2e per unit of quantity.
 * @returns The total kg CO2e, >= 0. Returns 0 if factor is negative.
 */
export function computeCo2e(quantity: number, factorKgCo2e: number): number {
  if (factorKgCo2e < 0) return 0;
  return Math.max(0, quantity * factorKgCo2e);
}

/**
 * Computes the emissions intensity per employee.
 * @param totalCo2e Total kg CO2e.
 * @param employeeCount Number of employees.
 * @returns The emissions per employee, or 0 if employeeCount <= 0.
 */
export function emissionsIntensity(totalCo2e: number, employeeCount: number): number {
  if (employeeCount <= 0) return 0;
  return totalCo2e / employeeCount;
}

/**
 * Computes the progress of an environmental goal as a percentage (0 to 100).
 * @param baseline The starting value of the metric.
 * @param target The goal target value.
 * @param current The current value of the metric.
 * @returns The progress percentage, clamped between 0 and 100.
 */
export function goalProgressPct(baseline: number, target: number, current: number): number {
  if (baseline === target) {
    return current <= target ? 100 : 0;
  }
  const pct = 100 * (baseline - current) / (baseline - target);
  return clamp(pct, 0, 100);
}
