import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governanceApi } from './api';
import { govKeys } from './keys';

export function usePolicies(status: string = 'active') {
  return useQuery({
    queryKey: [...govKeys.policies, status],
    queryFn: () => governanceApi.listPolicies({ status })
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: govKeys.policy(id),
    queryFn: () => governanceApi.getPolicy(id),
    enabled: !!id
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: governanceApi.createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: govKeys.policies });
    }
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => governanceApi.updatePolicy(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: govKeys.policies });
      queryClient.invalidateQueries({ queryKey: govKeys.policy(id) });
    }
  });
}

export function useArchivePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: governanceApi.archivePolicy,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: govKeys.policies });
      queryClient.invalidateQueries({ queryKey: govKeys.policy(id) });
    }
  });
}

export function useMyAcks(userId: string) {
  return useQuery({
    queryKey: [...govKeys.acknowledgements, 'my', userId],
    queryFn: () => governanceApi.myPendingAcks(userId),
    enabled: !!userId
  });
}

export function useAcknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, userId }: { policyId: string; userId: string }) => governanceApi.acknowledge(policyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: govKeys.acknowledgements });
    }
  });
}

export function useAckRates() {
  return useQuery({
    queryKey: [...govKeys.acknowledgements, 'rates'],
    queryFn: async () => {
      const [byPolicy, byDept] = await Promise.all([
        governanceApi.ackRateByPolicy(),
        governanceApi.ackRateByDepartment()
      ]);
      return { byPolicy, byDept };
    }
  });
}

export function useAudits() {
  return useQuery({
    queryKey: govKeys.audits,
    queryFn: governanceApi.listAudits
  });
}

export function useCreateAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: governanceApi.createAudit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: govKeys.audits });
    }
  });
}

export function useUpdateAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => governanceApi.updateAudit(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: govKeys.audits });
      queryClient.invalidateQueries({ queryKey: govKeys.audit(id) });
    }
  });
}

export function useCompleteAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => governanceApi.completeAudit(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: govKeys.audits });
      queryClient.invalidateQueries({ queryKey: govKeys.audit(id) });
    }
  });
}

export function useIssues(filter?: { status?: string; severity?: string; is_overdue?: boolean }) {
  return useQuery({
    queryKey: [...govKeys.issues, filter],
    queryFn: () => governanceApi.listIssues(filter)
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issue: any) => governanceApi.createIssue(issue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: govKeys.issues });
    }
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, currentStatus }: { id: string; status: string; currentStatus: string }) => 
      governanceApi.updateIssueStatus(id, status, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: govKeys.issues });
    }
  });
}
export function useGovDashboard() {
  return useQuery({
    queryKey: ['gov', 'dashboard-stats'],
    queryFn: () => governanceApi.getDashboardStats()
  });
}
