import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  fetchMyChallengeParticipations,
  fetchAllChallengeParticipations,
  joinChallenge,
  submitChallengeProof,
  approveChallengeParticipation,
  rejectChallengeParticipation,
  fetchRewards,
  createReward,
  updateReward,
  deleteReward,
  fetchMyRedemptions,
  fetchAllRedemptions,
  redeemReward,
  fetchBadges,
  createBadge,
  fetchMyBadgeAwards,
  fetchLeaderboard,
  fetchChallengeCategories,
} from './api';

export const gamificationKeys = {
  challenges: ['challenges'] as const,
  myParticipations: (userId?: string) => ['my_challenge_participations', userId] as const,
  allParticipations: ['all_challenge_participations'] as const,
  rewards: ['rewards'] as const,
  myRedemptions: (userId?: string) => ['my_redemptions', userId] as const,
  allRedemptions: ['all_redemptions'] as const,
  badges: ['badges'] as const,
  myBadgeAwards: (userId?: string) => ['my_badge_awards', userId] as const,
  leaderboard: ['leaderboard'] as const,
  categories: ['challenge_categories'] as const,
};

// ─── Challenges ─────────────────────────────────────────────────────────────

export function useChallenges() {
  return useQuery({ queryKey: gamificationKeys.challenges, queryFn: fetchChallenges });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createChallenge,
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.challenges }),
  });
}

export function useUpdateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateChallenge>[1] }) =>
      updateChallenge(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.challenges }),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteChallenge,
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.challenges }),
  });
}

// ─── Participations ─────────────────────────────────────────────────────────

export function useMyChallengeParticipations(userId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.myParticipations(userId),
    queryFn: () => fetchMyChallengeParticipations(userId!),
    enabled: !!userId,
  });
}

export function useAllChallengeParticipations() {
  return useQuery({ queryKey: gamificationKeys.allParticipations, queryFn: fetchAllChallengeParticipations });
}

export function useJoinChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ challengeId, employeeId }: { challengeId: string; employeeId: string }) =>
      joinChallenge(challengeId, employeeId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: gamificationKeys.myParticipations(variables.employeeId) });
      qc.invalidateQueries({ queryKey: gamificationKeys.allParticipations });
    },
  });
}

export function useSubmitChallengeProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      participationId,
      employeeId,
      file,
      progress,
    }: {
      participationId: string;
      employeeId: string;
      file: File;
      progress: number;
    }) => submitChallengeProof(participationId, employeeId, file, progress),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: gamificationKeys.myParticipations(variables.employeeId) });
      qc.invalidateQueries({ queryKey: gamificationKeys.allParticipations });
    },
  });
}

export function useApproveChallengeParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerId }: { id: string; reviewerId: string }) =>
      approveChallengeParticipation(id, reviewerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.allParticipations });
      qc.invalidateQueries({ queryKey: gamificationKeys.leaderboard });
    },
  });
}

export function useRejectChallengeParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerId }: { id: string; reviewerId: string }) =>
      rejectChallengeParticipation(id, reviewerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.allParticipations });
    },
  });
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export function useRewards() {
  return useQuery({ queryKey: gamificationKeys.rewards, queryFn: fetchRewards });
}

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.rewards }),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateReward>[1] }) =>
      updateReward(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.rewards }),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.rewards }),
  });
}

// ─── Redemptions ─────────────────────────────────────────────────────────────

export function useMyRedemptions(userId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.myRedemptions(userId),
    queryFn: () => fetchMyRedemptions(userId!),
    enabled: !!userId,
  });
}

export function useAllRedemptions() {
  return useQuery({ queryKey: gamificationKeys.allRedemptions, queryFn: fetchAllRedemptions });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rewardId, employeeId }: { rewardId: string; employeeId: string }) =>
      redeemReward(rewardId, employeeId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: gamificationKeys.rewards });
      qc.invalidateQueries({ queryKey: gamificationKeys.myRedemptions(variables.employeeId) });
      qc.invalidateQueries({ queryKey: gamificationKeys.allRedemptions });
    },
  });
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export function useBadges() {
  return useQuery({ queryKey: gamificationKeys.badges, queryFn: fetchBadges });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBadge,
    onSuccess: () => qc.invalidateQueries({ queryKey: gamificationKeys.badges }),
  });
}

export function useMyBadgeAwards(userId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.myBadgeAwards(userId),
    queryFn: () => fetchMyBadgeAwards(userId!),
    enabled: !!userId,
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function useLeaderboard() {
  return useQuery({ queryKey: gamificationKeys.leaderboard, queryFn: fetchLeaderboard });
}

// ─── Categories ──────────────────────────────────────────────────────────────

export function useChallengeCategories() {
  return useQuery({ queryKey: gamificationKeys.categories, queryFn: fetchChallengeCategories });
}
