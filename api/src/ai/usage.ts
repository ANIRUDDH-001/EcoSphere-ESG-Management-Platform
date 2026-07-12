import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';
import { logger } from '../lib/logger.js';

let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabase) {
    const config = getConfig();
    supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export interface UserLimitStatus {
  allowed: boolean;
  reason?: 'minute' | 'day';
  minuteRemaining: number;
  dayRemaining: number;
}

export async function checkUserLimit(userId: string): Promise<UserLimitStatus> {
  const config = getConfig();
  const db = getSupabase();
  const minuteLimit = config.AI_MINUTE_LIMIT;
  const dailyLimit = config.AI_DAILY_LIMIT;

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();

  const [{ count: dayCount, error: dayError }, { count: minuteCount, error: minuteError }] = await Promise.all([
    db.from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay),
    db.from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo)
  ]);

  if (dayError) logger.error({ err: dayError }, "Error counting daily usage");
  if (minuteError) logger.error({ err: minuteError }, "Error counting minute usage");

  const usedDay = dayCount || 0;
  const usedMinute = minuteCount || 0;

  const dayRemaining = Math.max(0, dailyLimit - usedDay);
  const minuteRemaining = Math.max(0, minuteLimit - usedMinute);

  if (usedDay >= dailyLimit) {
    logger.warn({ user_id: userId, reason: 'day', dayRemaining, minuteRemaining }, "AI daily limit reached");
    return { allowed: false, reason: 'day', dayRemaining, minuteRemaining };
  }

  if (usedMinute >= minuteLimit) {
    logger.warn({ user_id: userId, reason: 'minute', dayRemaining, minuteRemaining }, "AI minute limit reached");
    return { allowed: false, reason: 'minute', dayRemaining, minuteRemaining };
  }

  return { allowed: true, dayRemaining, minuteRemaining };
}

export async function recordUsage(userId: string, model: string, kind: 'copilot' | 'insight' | 'summary'): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from('ai_usage').insert({
    user_id: userId,
    model,
    kind
  } as any);
  if (error) {
    logger.error({ err: error, user_id: userId, model, kind }, "Failed to record AI usage");
  }
}

export async function modelUsageToday(model: string): Promise<{ rpdUsed: number; rpmUsed: number }> {
  const db = getSupabase();
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();

  const [{ count: rpdUsed, error: rpdError }, { count: rpmUsed, error: rpmError }] = await Promise.all([
    db.from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('model', model)
      .gte('created_at', startOfDay),
    db.from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('model', model)
      .gte('created_at', oneMinuteAgo)
  ]);

  if (rpdError) logger.error({ err: rpdError }, "Error counting model RPD");
  if (rpmError) logger.error({ err: rpmError }, "Error counting model RPM");

  return { rpdUsed: rpdUsed || 0, rpmUsed: rpmUsed || 0 };
}
