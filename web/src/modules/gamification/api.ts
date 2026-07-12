import { supabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';

export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeInsert = Database['public']['Tables']['challenges']['Insert'];
export type ChallengeUpdate = Database['public']['Tables']['challenges']['Update'];
export type ChallengeParticipation = Database['public']['Tables']['challenge_participations']['Row'];
export type Reward = Database['public']['Tables']['rewards']['Row'];
export type RewardInsert = Database['public']['Tables']['rewards']['Insert'];
export type RewardUpdate = Database['public']['Tables']['rewards']['Update'];
export type RewardRedemption = Database['public']['Tables']['reward_redemptions']['Row'];
export type Badge = Database['public']['Tables']['badges']['Row'];
export type BadgeInsert = Database['public']['Tables']['badges']['Insert'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

// ─── Challenges ─────────────────────────────────────────────────────────────

export async function fetchChallenges() {
  const { data, error } = await supabaseClient
    .from('challenges')
    .select(`
      *,
      category:categories(id, name)
    `)
    .order('deadline', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createChallenge(payload: ChallengeInsert) {
  const { data, error } = await supabaseClient
    .from('challenges')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateChallenge(id: string, payload: ChallengeUpdate) {
  const { data, error } = await supabaseClient
    .from('challenges')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChallenge(id: string) {
  const { error } = await supabaseClient
    .from('challenges')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Challenge Participation ─────────────────────────────────────────────────

export async function fetchMyChallengeParticipations(employeeId: string) {
  const { data, error } = await supabaseClient
    .from('challenge_participations')
    .select(`
      *,
      challenge:challenges(*)
    `)
    .eq('employee_id', employeeId);
  if (error) throw error;
  return data;
}

export async function fetchAllChallengeParticipations() {
  const { data, error } = await supabaseClient
    .from('challenge_participations')
    .select(`
      *,
      employee:profiles!challenge_participations_employee_id_fkey(id, full_name, email),
      challenge:challenges(*)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function joinChallenge(challengeId: string, employeeId: string) {
  const { data, error } = await supabaseClient
    .from('challenge_participations')
    .insert({
      challenge_id: challengeId,
      employee_id: employeeId,
      progress: 0,
      approval_status: 'pending',
      xp_awarded: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitChallengeProof(participationId: string, employeeId: string, file: File, progress: number) {
  const ext = file.name.split('.').pop();
  const path = `${employeeId}/${participationId}.${ext}`;
  const { error: uploadErr } = await supabaseClient.storage
    .from('csr-proofs') // Reusing the same proofs bucket per architecture config
    .upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = supabaseClient.storage.from('csr-proofs').getPublicUrl(path);

  const { data, error } = await supabaseClient
    .from('challenge_participations')
    .update({
      proof_url: publicUrl,
      progress: progress,
      approval_status: 'pending'
    })
    .eq('id', participationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveChallengeParticipation(id: string, reviewerId: string) {
  // Points/XP trigger handles XP award on DB layer
  const { data, error } = await supabaseClient
    .from('challenge_participations')
    .update({
      approval_status: 'approved',
      reviewed_by: reviewerId,
      progress: 100
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectChallengeParticipation(id: string, reviewerId: string) {
  const { data, error } = await supabaseClient
    .from('challenge_participations')
    .update({
      approval_status: 'rejected',
      reviewed_by: reviewerId
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export async function fetchRewards() {
  const { data, error } = await supabaseClient
    .from('rewards')
    .select('*')
    .order('points_required', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createReward(payload: RewardInsert) {
  const { data, error } = await supabaseClient
    .from('rewards')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReward(id: string, payload: RewardUpdate) {
  const { data, error } = await supabaseClient
    .from('rewards')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReward(id: string) {
  const { error } = await supabaseClient
    .from('rewards')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Reward Redemption ────────────────────────────────────────────────────────

export async function fetchMyRedemptions(employeeId: string) {
  const { data, error } = await supabaseClient
    .from('reward_redemptions')
    .select(`
      *,
      reward:rewards(*)
    `)
    .eq('employee_id', employeeId)
    .order('redeemed_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAllRedemptions() {
  const { data, error } = await supabaseClient
    .from('reward_redemptions')
    .select(`
      *,
      employee:profiles!reward_redemptions_employee_id_fkey(id, full_name, email),
      reward:rewards(*)
    `)
    .order('redeemed_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function redeemReward(rewardId: string, employeeId: string) {
  // Handled atomically by DB RPC/Function to ensure points balance & stock deduction are transactional
  const { data, error } = await (supabaseClient.rpc as any)('redeem_reward', {
    p_reward: rewardId,
    p_employee: employeeId
  });
  if (error) throw error;
  return data;
}

// ─── Badges & Awards ─────────────────────────────────────────────────────────

export async function fetchBadges() {
  const { data, error } = await supabaseClient
    .from('badges')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createBadge(payload: BadgeInsert) {
  const { data, error } = await supabaseClient
    .from('badges')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMyBadgeAwards(employeeId: string) {
  // Querying using standard join once table created
  const { data, error } = await (supabaseClient as any)
    .from('badge_awards')
    .select(`
      *,
      badge:badges(*)
    `)
    .eq('employee_id', employeeId);
  if (error && error.code !== 'PGRST116') {
    // Graceful fallback if table doesn't exist yet during scaffold
    console.warn('badge_awards table might not be initialized yet', error);
  }
  return data || [];
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function fetchLeaderboard(limit: number = 100) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name, email, xp, points_balance, department_id, department:departments(name)')
    .order('xp', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ─── Categories (Challenge type only) ────────────────────────────────────────

export async function fetchChallengeCategories() {
  const { data, error } = await supabaseClient
    .from('categories')
    .select('id, name')
    .eq('type', 'challenge')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data;
}
