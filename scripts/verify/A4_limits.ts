/**
 * A4_limits.ts
 * RESULT: PASS when per-user minute and day limits are correctly enforced.
 * Runs in-process using the same logic as usage.ts (pure algorithmic test).
 */

let passed = true;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    passed = false;
  } else {
    console.log(`OK: ${msg}`);
  }
}

interface UsageRow { created_at: Date }

function checkUserLimitLocal(
  rows: UsageRow[],
  minuteLimit: number,
  dailyLimit: number
): { allowed: boolean; reason?: 'minute' | 'day'; minuteRemaining: number; dayRemaining: number } {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const dayRows = rows.filter(r => r.created_at >= startOfDay);
  const minuteRows = rows.filter(r => r.created_at >= oneMinuteAgo);

  const dayRemaining = Math.max(0, dailyLimit - dayRows.length);
  const minuteRemaining = Math.max(0, minuteLimit - minuteRows.length);

  if (dayRows.length >= dailyLimit) {
    return { allowed: false, reason: 'day', dayRemaining, minuteRemaining };
  }
  if (minuteRows.length >= minuteLimit) {
    return { allowed: false, reason: 'minute', dayRemaining, minuteRemaining };
  }
  return { allowed: true, dayRemaining, minuteRemaining };
}

function testUnderLimits() {
  const rows: UsageRow[] = [{ created_at: new Date() }];
  const result = checkUserLimitLocal(rows, 10, 150);
  assert(result.allowed === true, 'Under limits: allowed');
  assert(result.minuteRemaining === 9, `minuteRemaining=${result.minuteRemaining} (expected 9)`);
  assert(result.dayRemaining === 149, `dayRemaining=${result.dayRemaining} (expected 149)`);
}

function testMinuteLimitHit() {
  const now = new Date();
  const rows: UsageRow[] = Array.from({ length: 10 }, () => ({ created_at: new Date(now.getTime() - 5000) }));
  const result = checkUserLimitLocal(rows, 10, 150);
  assert(result.allowed === false, 'Minute limit hit: rejected');
  assert(result.reason === 'minute', `reason=${result.reason} (expected minute)`);
}

function testDailyLimitHit() {
  const now = new Date();
  // All in the day window but spread across multiple minutes
  const rows: UsageRow[] = Array.from({ length: 150 }, (_, i) => ({
    created_at: new Date(now.getTime() - (i * 120_000)) // one every 2 minutes
  }));
  const result = checkUserLimitLocal(rows, 10, 150);
  assert(result.allowed === false, 'Daily limit hit: rejected');
  assert(result.reason === 'day', `reason=${result.reason} (expected day)`);
}

function testDayLimitCheckedBeforeMinute() {
  // Both day AND minute are exceeded — day should win (checked first)
  const now = new Date();
  const allRecent: UsageRow[] = Array.from({ length: 150 }, () => ({ created_at: new Date(now.getTime() - 1000) }));
  const result = checkUserLimitLocal(allRecent, 10, 150);
  assert(result.allowed === false, 'Both limits exceeded: rejected');
  assert(result.reason === 'day', 'Day limit takes priority over minute');
}

console.log('[A4_limits] Starting...');
testUnderLimits();
testMinuteLimitHit();
testDailyLimitHit();
testDayLimitCheckedBeforeMinute();

if (passed) {
  console.log('RESULT: PASS');
} else {
  console.log('RESULT: FAIL');
  process.exit(1);
}
