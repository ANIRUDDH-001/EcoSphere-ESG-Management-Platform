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
