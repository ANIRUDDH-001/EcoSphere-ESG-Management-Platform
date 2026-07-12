import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCsrActivities,
  fetchCsrCategories,
  fetchDepartments,
  createCsrActivity,
  updateCsrActivity,
  deleteCsrActivity,
  fetchMyParticipations,
  fetchAllParticipations,
  joinActivity,
  uploadProof,
  approveParticipation,
  rejectParticipation,
  fetchParticipationSummary,
  fetchDiversityMetrics,
  upsertDiversityMetric,
  deleteDiversityMetric,
  fetchTrainingCompletions,
  createTrainingCompletion,
  updateTrainingCompletion,
  deleteTrainingCompletion,
  fetchEsgSettings,
} from './api';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const socialKeys = {
  activities: ['csr_activities'] as const,
  categories: ['csr_categories'] as const,
  departments: ['departments'] as const,
  participations: (userId?: string) => ['participations', userId] as const,
  allParticipations: ['all_participations'] as const,
  participationSummary: ['participation_summary'] as const,
  diversity: (deptId?: string) => ['diversity_metrics', deptId] as const,
  training: (deptId?: string) => ['training_completions', deptId] as const,
  esgSettings: ['esg_settings'] as const,
};

// ─── CSR Activities ───────────────────────────────────────────────────────────
export function useCsrActivities() {
  return useQuery({ queryKey: socialKeys.activities, queryFn: fetchCsrActivities });
}

export function useCsrCategories() {
  return useQuery({ queryKey: socialKeys.categories, queryFn: fetchCsrCategories });
}

export function useDepartments() {
  return useQuery({ queryKey: socialKeys.departments, queryFn: fetchDepartments });
}

export function useCreateCsrActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCsrActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.activities }),
  });
}

export function useUpdateCsrActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCsrActivity>[1] }) =>
      updateCsrActivity(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.activities }),
  });
}

export function useDeleteCsrActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCsrActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.activities }),
  });
}

// ─── Participations ───────────────────────────────────────────────────────────
export function useMyParticipations(userId: string | undefined) {
  return useQuery({
    queryKey: socialKeys.participations(userId),
    queryFn: () => fetchMyParticipations(userId!),
    enabled: !!userId,
  });
}

export function useAllParticipations() {
  return useQuery({ queryKey: socialKeys.allParticipations, queryFn: fetchAllParticipations });
}

export function useJoinActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, employeeId }: { activityId: string; employeeId: string }) =>
      joinActivity(activityId, employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.allParticipations });
      qc.invalidateQueries({ queryKey: ['participations'] });
    },
  });
}

export function useUploadProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participationId, employeeId, file }: { participationId: string; employeeId: string; file: File }) =>
      uploadProof(participationId, employeeId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.allParticipations });
      qc.invalidateQueries({ queryKey: ['participations'] });
    },
  });
}

export function useApproveParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerId }: { id: string; reviewerId: string }) => approveParticipation(id, reviewerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.allParticipations });
      qc.invalidateQueries({ queryKey: socialKeys.participationSummary });
    },
  });
}

export function useRejectParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerId }: { id: string; reviewerId: string }) => rejectParticipation(id, reviewerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.allParticipations });
    },
  });
}

export function useParticipationSummary() {
  return useQuery({ queryKey: socialKeys.participationSummary, queryFn: fetchParticipationSummary });
}

// ─── Diversity Metrics ────────────────────────────────────────────────────────
export function useDiversityMetrics(departmentId?: string) {
  return useQuery({
    queryKey: socialKeys.diversity(departmentId),
    queryFn: () => fetchDiversityMetrics(departmentId),
  });
}

export function useUpsertDiversityMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertDiversityMetric,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diversity_metrics'] }),
  });
}

export function useDeleteDiversityMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDiversityMetric,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diversity_metrics'] }),
  });
}

// ─── Training Completions ─────────────────────────────────────────────────────
export function useTrainingCompletions(departmentId?: string) {
  return useQuery({
    queryKey: socialKeys.training(departmentId),
    queryFn: () => fetchTrainingCompletions(departmentId),
  });
}

export function useCreateTrainingCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTrainingCompletion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training_completions'] }),
  });
}

export function useUpdateTrainingCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateTrainingCompletion>[1] }) =>
      updateTrainingCompletion(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training_completions'] }),
  });
}

export function useDeleteTrainingCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTrainingCompletion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training_completions'] }),
  });
}

// ─── ESG Settings ─────────────────────────────────────────────────────────────
export function useEsgSettings() {
  return useQuery({ queryKey: socialKeys.esgSettings, queryFn: fetchEsgSettings });
}
